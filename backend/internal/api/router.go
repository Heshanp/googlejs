package api

import (
	"net/http"
	"strings"

	"github.com/yourusername/justsell/backend/internal/api/handler"
	"github.com/yourusername/justsell/backend/internal/api/middleware"
)

// NewRouter creates and configures the HTTP router
func NewRouter() http.Handler {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", handler.HealthCheck)

	// Search endpoint
	mux.HandleFunc("/api/search", handler.Search)
	mux.HandleFunc("/api/search/vision", handler.VisionSearch)
	mux.HandleFunc("/api/locations/search", handler.LocationsSearch)
	mux.HandleFunc("/api/locations/cities", handler.LocationsCities)
	mux.HandleFunc("/api/locations/suburbs", handler.LocationsSuburbs)

	// Listings endpoints
	mux.HandleFunc("/api/listings", handleListings)
	mux.HandleFunc("/api/listings/", handleListingByID)

	// User listings endpoint
	mux.HandleFunc("/api/users/", middleware.OptionalAuth(handleUserRoutes))

	// Upload endpoints
	mux.HandleFunc("/api/upload", handleUpload)
	mux.HandleFunc("/api/upload/multiple", middleware.Auth(handler.UploadMultipleImages))

	// AI Analysis endpoint
	mux.HandleFunc("/api/analyze-images", handler.AnalyzeImages)
	mux.HandleFunc("/api/images/pro-backdrop", middleware.Auth(handler.GenerateProBackdrop))

	// AI Shopping Assistant endpoint (public — no auth required)
	mux.HandleFunc("/api/assistant/chat", handler.AssistantChat)

	// Auth endpoints
	mux.HandleFunc("/api/auth/google", handler.GoogleLogin)
	mux.HandleFunc("/api/auth/me", handleAuthMe)

	// Images are stored in S3 and accessed via listing/image API routes.

	// Listing images endpoint
	mux.HandleFunc("/api/listing-images", handleListingImages)
	mux.HandleFunc("/api/listing-images/", middleware.OptionalAuth(handleListingImageByID))

	// Conversation endpoints (requires auth)
	mux.HandleFunc("/api/conversations", middleware.Auth(handler.HandleConversationRoutes))
	mux.HandleFunc("/api/conversations/", middleware.Auth(handler.HandleConversationRoutes))

	// Offer endpoints (requires auth)
	mux.HandleFunc("/api/offers", middleware.Auth(handler.HandleOfferRoutes))
	mux.HandleFunc("/api/offers/", middleware.Auth(handler.HandleOfferRoutes))

	// Review endpoints (requires auth for POST, public for GET)
	mux.HandleFunc("/api/reviews", middleware.Auth(handler.HandleReviewRoutes))
	mux.HandleFunc("/api/reviews/", middleware.Auth(handler.HandleReviewRoutes))

	// WebSocket endpoint (auth via query param or Authorization header, validated in handler)
	mux.HandleFunc("/ws", handler.HandleWebSocket)

	// Notification endpoints (requires auth)
	mux.HandleFunc("/api/notifications", middleware.Auth(handler.HandleNotificationRoutes))
	mux.HandleFunc("/api/notifications/", middleware.Auth(handler.HandleNotificationRoutes))

	// Admin moderation endpoints (requires auth + admin allowlist)
	mux.HandleFunc("/api/admin/moderation", middleware.Auth(handler.HandleAdminModerationRoutes))
	mux.HandleFunc("/api/admin/moderation/", middleware.Auth(handler.HandleAdminModerationRoutes))

	// Saved search endpoints (requires auth)
	mux.HandleFunc("/api/saved-searches", middleware.Auth(handler.HandleSavedSearchRoutes))
	mux.HandleFunc("/api/saved-searches/", middleware.Auth(handler.HandleSavedSearchRoutes))

	// Wrap with CORS middleware
	return middleware.CORS(mux)
}

// handleListings routes to GET (list) or POST (create)
func handleListings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		handler.GetListings(w, r)
	case http.MethodPost:
		// Require auth since user_id is a required field in the database
		middleware.Auth(handler.CreateListing)(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleListingByID routes to GET, PUT, DELETE, PATCH for specific listing
func handleListingByID(w http.ResponseWriter, r *http.Request) {
	// Extract ID from path
	path := strings.TrimPrefix(r.URL.Path, "/api/listings/")
	if path == "" {
		http.Error(w, "Listing ID required", http.StatusBadRequest)
		return
	}

	// Check for sub-resource /api/listings/{id}/status
	parts := strings.Split(path, "/")
	listingID := parts[0]

	// Handle /api/listings/{id}/status for PATCH
	if len(parts) >= 2 && parts[1] == "status" {
		if r.Method == http.MethodPatch {
			middleware.Auth(func(w http.ResponseWriter, r *http.Request) {
				handler.UpdateListingStatus(w, r, listingID)
			})(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Handle /api/listings/{id}/cancel-reservation for POST
	if len(parts) >= 2 && parts[1] == "cancel-reservation" {
		if r.Method == http.MethodPost {
			middleware.Auth(func(w http.ResponseWriter, r *http.Request) {
				handler.CancelReservation(w, r, listingID)
			})(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Handle /api/listings/{id}/like for POST (like) and DELETE (unlike)
	if len(parts) >= 2 && parts[1] == "like" {
		switch r.Method {
		case http.MethodPost:
			middleware.Auth(func(w http.ResponseWriter, r *http.Request) {
				handler.LikeListing(w, r, listingID)
			})(w, r)
			return
		case http.MethodDelete:
			middleware.Auth(func(w http.ResponseWriter, r *http.Request) {
				handler.UnlikeListing(w, r, listingID)
			})(w, r)
			return
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
	}

	// Handle /api/listings/{id}/reviews for GET
	if len(parts) >= 2 && parts[1] == "reviews" {
		if r.Method == http.MethodGet {
			handler.GetReviewsForListing(w, r, listingID)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Handle /api/listings/{id}/images for PUT (sync images)
	if len(parts) >= 2 && parts[1] == "images" {
		if r.Method == http.MethodPut {
			middleware.Auth(func(w http.ResponseWriter, r *http.Request) {
				handler.SyncListingImages(w, r, listingID)
			})(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Handle /api/listings/{id}/similar for GET (similar listings)
	if len(parts) >= 2 && parts[1] == "similar" {
		if r.Method == http.MethodGet {
			handler.GetSimilarListings(w, r, listingID)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	switch r.Method {
	case http.MethodGet:
		// GET uses OptionalAuth so we can check if user liked the listing
		middleware.OptionalAuth(func(w http.ResponseWriter, r *http.Request) {
			handler.GetListingByID(w, r, listingID)
		})(w, r)
	case http.MethodPut:
		// PUT requires authentication - wrap with auth middleware
		middleware.Auth(func(w http.ResponseWriter, r *http.Request) {
			handler.UpdateListing(w, r, listingID)
		})(w, r)
	case http.MethodDelete:
		// DELETE requires authentication - wrap with auth middleware
		middleware.Auth(func(w http.ResponseWriter, r *http.Request) {
			handler.DeleteListing(w, r, listingID)
		})(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleUpload routes POST for single file upload
func handleUpload(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		middleware.Auth(handler.UploadImage)(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleListingImages routes POST for creating listing image records
// and PUT for syncing (keeping specified images, deleting others)
func handleListingImages(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		middleware.Auth(handler.CreateListingImage)(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleListingImageByID routes GET /api/listing-images/{id}/view
func handleListingImageByID(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/listing-images/"), "/")
	if path == "" {
		http.Error(w, "Image ID required", http.StatusBadRequest)
		return
	}

	parts := strings.Split(path, "/")
	if len(parts) != 2 || parts[1] != "view" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	handler.GetListingImage(w, r, parts[0])
}

// handleListingImagesSync routes PUT for syncing listing images
func handleListingImagesSync(w http.ResponseWriter, r *http.Request) {
	// Extract listing ID from path: /api/listings/{id}/images
	path := strings.TrimPrefix(r.URL.Path, "/api/listings/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 || parts[1] != "images" {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	listingID := parts[0]

	switch r.Method {
	case http.MethodPut:
		middleware.Auth(func(w http.ResponseWriter, r *http.Request) {
			handler.SyncListingImages(w, r, listingID)
		})(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleUserRoutes routes user-related endpoints
func handleUserRoutes(w http.ResponseWriter, r *http.Request) {
	// Extract path after /api/users/
	path := strings.TrimPrefix(r.URL.Path, "/api/users/")
	parts := strings.Split(path, "/")

	if len(parts) < 1 || parts[0] == "" {
		http.Error(w, "User ID required", http.StatusBadRequest)
		return
	}

	userID := parts[0]

	// Check for sub-resources like /api/users/{id}/listings
	if len(parts) >= 2 && parts[1] == "listings" {
		switch r.Method {
		case http.MethodGet:
			handler.GetUserListings(w, r, userID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Check for /api/users/{id}/reviews
	if len(parts) >= 2 && parts[1] == "reviews" {
		switch r.Method {
		case http.MethodGet:
			handler.GetReviewsForUser(w, r, userID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Default: GET user profile by ID
	switch r.Method {
	case http.MethodGet:
		handler.GetUserByID(w, r, userID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleAuthMe routes GET (current user) and PUT (update profile)
func handleAuthMe(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		middleware.Auth(handler.GetCurrentUser)(w, r)
	case http.MethodPut, http.MethodPatch:
		middleware.Auth(handler.UpdateProfile)(w, r)
	case http.MethodDelete:
		middleware.Auth(handler.DeleteProfile)(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
