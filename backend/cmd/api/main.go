package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/yourusername/justsell/backend/internal/api"
	"github.com/yourusername/justsell/backend/internal/api/handler"
	"github.com/yourusername/justsell/backend/internal/config"
	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/service"
	"github.com/yourusername/justsell/backend/internal/ws"
	"github.com/yourusername/justsell/backend/pkg/database"

	"github.com/joho/godotenv"
)

func main() {
	log.Println("🚀 Justsell API Server")

	// Load .env file from backend directory
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️  No .env file found (using environment variables)")
	}

	// Load configuration
	cfg := config.Load()
	log.Println("📝 Config loaded")

	// Connect to database
	ctx := context.Background()
	db, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}
	defer db.Close()
	log.Println("✅ Database connected")

	// Create repositories
	listingRepo := repository.NewListingRepository(db)
	vectorRepo := repository.NewVectorRepository(db)
	vectorRepo.SetAnchorMatchRatio(cfg.SearchAnchorMatchRatio)
	imageRepo := repository.NewImageRepository(db)
	moderationRepo := repository.NewModerationRepository(db)
	conversationRepo := repository.NewConversationRepository(db)
	messageRepo := repository.NewMessageRepository(db)
	offerRepo := repository.NewOfferRepository(db)
	reviewRepo := repository.NewReviewRepository(db)
	repository.InitLikesRepository(db)        // Initialize likes repository
	repository.InitNotificationRepository(db) // Initialize notification repository
	repository.InitSavedSearchRepository(db)  // Initialize saved search repository
	notificationRepo := repository.GetNotificationRepository()
	savedSearchRepo := repository.GetSavedSearchRepository()
	log.Println("✅ Repositories initialized")

	// Initialize user repository early so dependent services can use it.
	repository.InitUserRepository(db)
	userRepo := repository.GetUserRepository()

	// Create services
	embeddingsService := service.NewEmbeddingsService(cfg.GeminiKey, cfg.GeminiEmbeddingModel)
	effectiveEmbeddingModel := embeddingsService.PreferredModel()
	visionService := service.NewVisionService(cfg.GeminiKey, cfg.GeminiModel)
	assistantService := service.NewAssistantService(cfg.GeminiKey, cfg.GeminiModel)
	imageModel := strings.TrimSpace(cfg.GeminiImageModel)
	if imageModel == "" {
		imageModel = cfg.GeminiModel
	}
	imageTransformService := service.NewImageTransformService(cfg.GeminiKey, imageModel)
	searchService := service.NewSearchService(vectorRepo, imageRepo, embeddingsService)
	locationService := service.NewLocationService()
	emailService := service.NewEmailServiceFromEnv()
	publishGuard := service.NewPublishGuard(
		cfg.PublishRateLimitPerUser,
		cfg.PublishRateLimitPerIP,
		time.Duration(cfg.PublishRateLimitWindowSec)*time.Second,
	)
	service.InitAdminAccess(cfg.AdminEmails)
	newListingModerationService := func(notificationService *service.NotificationService) *service.ListingModerationService {
		aiModeration := service.NewModerationService(cfg.GeminiKey, cfg.GeminiModel)
		aiModeration.ConfigureImageFetch(
			cfg.ModerationImageFetchConcurrency,
			time.Duration(cfg.ModerationImageFetchTimeoutMS)*time.Millisecond,
		)
		return service.NewListingModerationService(
			aiModeration,
			moderationRepo,
			listingRepo,
			userRepo,
			notificationService,
			emailService,
			time.Duration(cfg.ModerationCacheTTLMinutes)*time.Minute,
			time.Duration(cfg.PublishIdempotencyTTLHours)*time.Hour,
			cfg.ViolationFlagThreshold,
		)
	}
	listingModerationService := newListingModerationService(nil)
	service.InitViewCountService(db) // Initialize view count service with background flush
	log.Println("✅ Services initialized")
	log.Printf("✅ Search anchor match ratio: %.2f", cfg.SearchAnchorMatchRatio)
	log.Printf("✅ Moderation image fetch config: concurrency=%d timeout_ms=%d", cfg.ModerationImageFetchConcurrency, cfg.ModerationImageFetchTimeoutMS)

	// Initialize S3 Service for image uploads (frontend handles compression)
	s3Bucket := os.Getenv("AWS_S3_BUCKET")
	s3Region := os.Getenv("AWS_REGION")
	if s3Bucket != "" {
		s3Svc, err := service.NewS3Service(ctx, s3Bucket, s3Region)
		if err != nil {
			log.Printf("⚠️  S3 service initialization failed: %v", err)
			log.Println("⚠️  Image uploads will not work until S3 is properly configured")
		} else {
			handler.SetS3Service(s3Svc)
			log.Printf("✅ S3 storage configured: bucket=%s, region=%s", s3Bucket, s3Region)
		}
	} else {
		log.Println("⚠️  S3 not configured (AWS_S3_BUCKET not set) - image uploads will not work")
	}

	// Check if Gemini is configured
	if cfg.GeminiKey == "" {
		if cfg.EmbeddingsFailFast {
			log.Fatal("❌ GEMINI_API_KEY is required when EMBEDDINGS_FAIL_FAST is enabled")
		}
		log.Println("⚠️  Gemini API key not configured - semantic search and image analysis will not work")
	} else {
		log.Printf("✅ Gemini model: %s", cfg.GeminiModel)
		log.Printf("✅ Gemini image model: %s", imageModel)
		log.Printf("✅ Gemini embeddings configured (model: %s)", effectiveEmbeddingModel)
		checkCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		err := embeddingsService.StartupHealthCheck(checkCtx)
		cancel()
		if err != nil {
			if cfg.EmbeddingsFailFast {
				log.Fatalf("❌ Gemini embeddings startup health check failed: %v", err)
			}
			log.Printf("⚠️  Gemini embeddings startup health check warning: %v", err)
		} else {
			log.Println("✅ Gemini embeddings startup health check passed")
		}
		log.Println("✅ Gemini vision (image analysis) configured")
		log.Println("✅ Gemini image enhancement configured")
		log.Println("✅ Gemini AI shopping assistant configured")
	}

	// Wire dependencies to handlers
	handler.SetListingRepo(listingRepo)
	handler.SetVectorRepo(vectorRepo)
	handler.SetImageRepo(imageRepo)
	handler.SetModerationRepo(moderationRepo)
	handler.SetSearchService(searchService)
	handler.SetEmbeddingsService(embeddingsService)
	handler.SetVisionService(visionService)
	handler.SetAssistantService(assistantService)
	handler.SetImageTransformService(imageTransformService)
	handler.ConfigureImageEnhancementRateLimiter(
		cfg.ImageGenRateLimitBurst,
		time.Duration(cfg.ImageGenRateLimitRefillMS)*time.Millisecond,
	)
	handler.SetConversationRepo(conversationRepo)
	handler.SetMessageRepo(messageRepo)
	handler.SetOfferRepo(offerRepo)
	handler.SetReviewRepo(reviewRepo)
	handler.SetLocationService(locationService)
	handler.SetListingModerationService(listingModerationService)
	handler.SetPublishGuard(publishGuard)

	// Initialize WebSocket hub
	wsHub := ws.NewHub()
	go wsHub.Run() // Start hub in background goroutine
	wsHandler := ws.NewHandler(wsHub, conversationRepo, messageRepo)
	handler.SetWSHub(wsHub)
	handler.SetWSHandler(wsHandler)
	log.Println("✅ WebSocket hub initialized")

	// Initialize notification service (depends on wsHub)
	notificationService := service.NewNotificationService(notificationRepo, wsHub, vectorRepo)
	service.InitNotificationService(notificationRepo, wsHub, vectorRepo)
	handler.SetNotificationService(notificationService)
	// Rebind moderation service with notification dependency.
	listingModerationService = newListingModerationService(notificationService)
	handler.SetListingModerationService(listingModerationService)
	log.Println("✅ Notification service initialized")

	// Initialize saved search service (depends on searchService, notificationService, wsHub)
	savedSearchService := service.NewSavedSearchService(savedSearchRepo, searchService, notificationService, wsHub)
	service.InitSavedSearchService(savedSearchRepo, searchService, notificationService, wsHub)
	handler.SetSavedSearchService(savedSearchService)
	log.Println("✅ Saved search service initialized")

	// Check if Google OAuth is configured
	if cfg.GoogleClientID == "" {
		log.Println("⚠️  Google OAuth not configured - social login will not work")
	} else {
		log.Println("✅ Google OAuth configured")
	}

	// Start auto-expiration cron job for reservations
	go startReservationExpirationCron(listingRepo)
	log.Println("✅ Reservation auto-expiration cron job started (runs every 15 minutes)")

	// Start saved search alerts background job
	go startSavedSearchAlertsCron(savedSearchService)
	log.Println("✅ Saved search alerts job started (runs every 5 minutes)")

	// Start PostgreSQL LISTEN/NOTIFY listener for real-time new listing alerts
	listingListener := service.NewListingListener(db, savedSearchRepo, savedSearchService, listingRepo)
	listingListener.Start(ctx)
	log.Println("✅ Real-time listing listener started (PostgreSQL LISTEN/NOTIFY)")

	log.Println("Starting server on http://localhost:8080")

	// Create router
	router := api.NewRouter()

	// Start server
	log.Println("✅ Server ready!")
	log.Println("📍 Health check: http://localhost:8080/health")
	log.Println("📍 Listings: http://localhost:8080/api/listings")
	log.Println("📍 Search: http://localhost:8080/api/search?q=your_query")
	log.Println("📍 AI Assistant: http://localhost:8080/api/assistant/chat")
	log.Println("📍 WebSocket: ws://localhost:8080/ws")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}

// startReservationExpirationCron runs every 15 minutes to auto-expire old reservations
func startReservationExpirationCron(repo *repository.ListingRepository) {
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	// Run immediately on startup
	expireReservations(repo)

	for range ticker.C {
		expireReservations(repo)
	}
}

// expireReservations checks for and expires old reservations
func expireReservations(repo *repository.ListingRepository) {
	ctx := context.Background()
	count, err := repo.ExpireOldReservations(ctx)
	if err != nil {
		log.Printf("⚠️  Error expiring old reservations: %v", err)
		return
	}
	if count > 0 {
		log.Printf("🔄 Auto-expired %d reservation(s)", count)
	}
}

// startSavedSearchAlertsCron runs every 5 minutes to process saved search alerts
func startSavedSearchAlertsCron(svc *service.SavedSearchService) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Wait a bit before first run to let the server fully start
	time.Sleep(30 * time.Second)

	// Run immediately after initial delay
	processSavedSearchAlerts(svc)

	for range ticker.C {
		processSavedSearchAlerts(svc)
	}
}

// processSavedSearchAlerts processes saved search alerts and cleanup
func processSavedSearchAlerts(svc *service.SavedSearchService) {
	ctx := context.Background()
	if err := svc.ProcessAlerts(ctx); err != nil {
		log.Printf("⚠️  Error processing saved search alerts: %v", err)
	}

	// Cleanup old results periodically
	if err := svc.CleanupOldResults(ctx); err != nil {
		log.Printf("⚠️  Error cleaning up old saved search results: %v", err)
	}
}
