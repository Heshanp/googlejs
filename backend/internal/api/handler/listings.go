package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/service"
)

var listingRepo *repository.ListingRepository
var vectorRepo *repository.VectorRepository
var imageRepo *repository.ImageRepository
var embeddingsService *service.EmbeddingsService
var moderationRepo *repository.ModerationRepository
var listingModerationSvc *service.ListingModerationService
var publishGuard *service.PublishGuard

// SetListingRepo sets the listing repository dependency
func SetListingRepo(repo *repository.ListingRepository) {
	listingRepo = repo
}

// SetVectorRepo sets the vector repository dependency
func SetVectorRepo(repo *repository.VectorRepository) {
	vectorRepo = repo
}

// SetImageRepo sets the image repository dependency
func SetImageRepo(repo *repository.ImageRepository) {
	imageRepo = repo
}

// SetEmbeddingsService sets the embeddings service dependency
func SetEmbeddingsService(svc *service.EmbeddingsService) {
	embeddingsService = svc
}

// SetModerationRepo sets moderation repository dependency.
func SetModerationRepo(repo *repository.ModerationRepository) {
	moderationRepo = repo
}

// SetListingModerationService sets moderation coordinator dependency.
func SetListingModerationService(svc *service.ListingModerationService) {
	listingModerationSvc = svc
}

// SetPublishGuard sets publish rate guard dependency.
func SetPublishGuard(guard *service.PublishGuard) {
	publishGuard = guard
}

// ValidateExpiresAt validates the expiration date for CREATE (1 day to 1 month from now)
func ValidateExpiresAt(expiresAt *time.Time) error {
	if expiresAt == nil {
		return nil // Will use default
	}
	now := time.Now()
	minExpiry := now.Add(24 * time.Hour)      // 1 day from now
	maxExpiry := now.Add(30 * 24 * time.Hour) // 1 month from now

	if expiresAt.Before(minExpiry) {
		return fmt.Errorf("expiration must be at least 1 day from now")
	}
	if expiresAt.After(maxExpiry) {
		return fmt.Errorf("expiration cannot be more than 1 month from now")
	}
	return nil
}

// ValidateExpiresAtForUpdate validates expiration for UPDATE (1 day from now, max 1 month from original creation)
func ValidateExpiresAtForUpdate(expiresAt *time.Time, createdAt time.Time) error {
	if expiresAt == nil {
		return nil
	}
	now := time.Now()
	minExpiry := now.Add(24 * time.Hour)            // 1 day from now
	maxExpiry := createdAt.Add(30 * 24 * time.Hour) // 1 month from ORIGINAL creation

	if expiresAt.Before(minExpiry) {
		return fmt.Errorf("expiration must be at least 1 day from now")
	}
	if expiresAt.After(maxExpiry) {
		return fmt.Errorf("expiration cannot exceed 1 month from original listing date")
	}
	return nil
}

// DefaultExpiresAt returns the default expiration time (7 days from now)
func DefaultExpiresAt() time.Time {
	return time.Now().Add(7 * 24 * time.Hour)
}

type uploadedImagePayload struct {
	URL             string  `json:"url"`
	Filename        string  `json:"filename"`
	DisplayOrder    *int    `json:"displayOrder,omitempty"`
	ClientID        string  `json:"clientId,omitempty"`
	SourceClientID  string  `json:"sourceClientId,omitempty"`
	SourceImageID   *int    `json:"sourceImageId,omitempty"`
	IsActive        *bool   `json:"isActive,omitempty"`
	VariantType     *string `json:"variantType,omitempty"`
	AIModel         *string `json:"aiModel,omitempty"`
	AIPromptVersion *string `json:"aiPromptVersion,omitempty"`
}

type publishListingRequest struct {
	Title              string                 `json:"title"`
	Subtitle           string                 `json:"subtitle"`
	Description        string                 `json:"description"`
	Price              int                    `json:"price"`
	Quantity           int                    `json:"quantity"`
	Category           string                 `json:"category"`
	Condition          string                 `json:"condition"`
	Location           string                 `json:"location"`
	CategoryFields     map[string]interface{} `json:"categoryFields"`
	ShippingOptions    map[string]interface{} `json:"shippingOptions"`
	PaymentMethods     map[string]interface{} `json:"paymentMethods"`
	ReturnsPolicy      map[string]interface{} `json:"returnsPolicy"`
	ExpiresAt          *time.Time             `json:"expiresAt"`
	UploadedImages     []uploadedImagePayload `json:"uploadedImages"`
	KeepImageIDs       []int                  `json:"keepImageIds"`
	DeactivateImageIDs []int                  `json:"deactivateImageIds"`
}

type pendingUploadedImage struct {
	upload        uploadedImagePayload
	fallbackOrder int
}

func (req publishListingRequest) toListing(userID *string) models.Listing {
	return models.Listing{
		UserID:          userID,
		Title:           strings.TrimSpace(req.Title),
		Subtitle:        strings.TrimSpace(req.Subtitle),
		Description:     strings.TrimSpace(req.Description),
		Price:           req.Price,
		Quantity:        req.Quantity,
		Category:        strings.TrimSpace(req.Category),
		Condition:       strings.TrimSpace(req.Condition),
		Location:        strings.TrimSpace(req.Location),
		CategoryFields:  req.CategoryFields,
		ShippingOptions: req.ShippingOptions,
		PaymentMethods:  req.PaymentMethods,
		ReturnsPolicy:   req.ReturnsPolicy,
		ExpiresAt:       req.ExpiresAt,
	}
}

func getRequestUserID(r *http.Request) string {
	if r == nil {
		return ""
	}
	v := r.Context().Value("userID")
	if v == nil {
		return ""
	}
	userID, _ := v.(string)
	return strings.TrimSpace(userID)
}

func getRequestUserEmail(r *http.Request) string {
	if r == nil {
		return ""
	}
	v := r.Context().Value("userEmail")
	if v == nil {
		return ""
	}
	email, _ := v.(string)
	return strings.TrimSpace(email)
}

func isAdminRequest(r *http.Request) bool {
	return service.GetAdminAccess().IsAdminEmail(getRequestUserEmail(r))
}

func isPublicListingStatus(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case string(models.ListingStatusActive), string(models.ListingStatusReserved), string(models.ListingStatusSold), string(models.ListingStatusExpired):
		return true
	default:
		return false
	}
}

func normalizeListingCategory(category string) string {
	normalized := strings.ToLower(strings.TrimSpace(category))
	normalized = strings.TrimPrefix(normalized, "cat_")

	switch normalized {
	case "cars", "motorcycles", "boats", "car-parts", "caravans":
		return "vehicles"
	case "employment":
		return "jobs"
	case "trades", "tutoring", "cleaning":
		return "services"
	case "":
		return "general"
	default:
		return normalized
	}
}

func categorySupportsQuantity(category string) bool {
	switch normalizeListingCategory(category) {
	case "vehicles", "property", "jobs", "services":
		return false
	default:
		return true
	}
}

func canViewListing(listing *models.Listing, requesterID string, requesterIsAdmin bool) bool {
	if listing == nil {
		return false
	}
	if isPublicListingStatus(listing.Status) {
		return true
	}
	if requesterIsAdmin {
		return true
	}
	return listing.UserID != nil && *listing.UserID != "" && requesterID == *listing.UserID
}

func protectedListingImagePath(imageID int) string {
	return fmt.Sprintf("/api/listing-images/%d/view", imageID)
}

func mapListingImagesForResponse(status string, images []models.ListingImage) []models.ListingImage {
	if len(images) == 0 || isPublicListingStatus(status) {
		return images
	}

	mapped := make([]models.ListingImage, len(images))
	copy(mapped, images)
	for i := range mapped {
		mapped[i].URL = protectedListingImagePath(mapped[i].ID)
	}
	return mapped
}

func shouldUseProtectedImagePaths(status string, ownerID *string, requesterID string, requesterIsAdmin bool) bool {
	if isPublicListingStatus(status) {
		return false
	}
	if requesterIsAdmin {
		return false
	}
	return ownerID == nil || *ownerID == "" || strings.TrimSpace(requesterID) != *ownerID
}

func applyPublishRateLimit(w http.ResponseWriter, r *http.Request, userID string) bool {
	if publishGuard == nil {
		return true
	}
	if publishGuard.Allow(userID, service.ExtractClientIP(r)) {
		return true
	}
	http.Error(w, "Too many publish attempts. Please try again shortly.", http.StatusTooManyRequests)
	return false
}

func cloneStringAnyMap(src map[string]interface{}) map[string]interface{} {
	if len(src) == 0 {
		return map[string]interface{}{}
	}

	dst := make(map[string]interface{}, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func queueListingEmbeddingRefresh(listingID int, title, desc, category string, categoryFields map[string]interface{}) {
	if embeddingsService == nil || vectorRepo == nil {
		return
	}

	clonedFields := cloneStringAnyMap(categoryFields)

	go func(listingID int, title, desc, category string, categoryFields map[string]interface{}) {
		bgCtx := context.Background()
		if err := vectorRepo.ClearEmbedding(bgCtx, listingID); err != nil {
			log.Printf("Failed to clear stale embedding for listing %d: %v", listingID, err)
			return
		}

		const maxAttempts = 3
		baseDelay := 500 * time.Millisecond

		for attempt := 1; attempt <= maxAttempts; attempt++ {
			embedding, embeddingModel, err := embeddingsService.GenerateListingEmbeddingFromFieldsWithModel(bgCtx, title, desc, category, categoryFields)
			storeErr := error(nil)
			if err == nil {
				if updateErr := vectorRepo.UpdateEmbedding(bgCtx, listingID, embedding, embeddingModel); updateErr == nil {
					log.Printf("✓ Embedding refreshed for listing %d (attempt %d/%d)", listingID, attempt, maxAttempts)
					return
				} else {
					storeErr = updateErr
				}
			}

			if err != nil {
				log.Printf("Failed to regenerate embedding for listing %d (attempt %d/%d): %v", listingID, attempt, maxAttempts, err)
			} else {
				log.Printf("Failed to store embedding for listing %d (attempt %d/%d): %v", listingID, attempt, maxAttempts, storeErr)
			}

			if attempt == maxAttempts {
				log.Printf("❌ Exhausted embedding refresh retries for listing %d; listing remains without embedding until backfill", listingID)
				return
			}

			delay := baseDelay * time.Duration(attempt)
			time.Sleep(delay)
		}
	}(listingID, title, desc, category, clonedFields)
}

func buildPublishRequestFingerprint(req publishListingRequest, listingID string) string {
	parts := []string{
		strings.TrimSpace(listingID),
		strings.TrimSpace(req.Title),
		strings.TrimSpace(req.Description),
		strings.TrimSpace(req.Category),
		strings.TrimSpace(req.Condition),
		strings.TrimSpace(req.Location),
		strconv.Itoa(req.Price),
		strconv.Itoa(req.Quantity),
	}

	imageRefs := make([]string, 0, len(req.UploadedImages))
	for _, img := range req.UploadedImages {
		ref := strings.TrimSpace(img.URL)
		if ref == "" {
			ref = strings.TrimSpace(img.Filename)
		}
		if ref != "" {
			imageRefs = append(imageRefs, ref)
		}
	}
	sort.Strings(imageRefs)
	parts = append(parts, imageRefs...)

	if len(req.KeepImageIDs) > 0 {
		keep := make([]int, len(req.KeepImageIDs))
		copy(keep, req.KeepImageIDs)
		sort.Ints(keep)
		for _, id := range keep {
			parts = append(parts, strconv.Itoa(id))
		}
	}
	if len(req.DeactivateImageIDs) > 0 {
		deactivate := make([]int, len(req.DeactivateImageIDs))
		copy(deactivate, req.DeactivateImageIDs)
		sort.Ints(deactivate)
		for _, id := range deactivate {
			parts = append(parts, "deactivate:"+strconv.Itoa(id))
		}
	}

	return service.BuildContentFingerprint(strings.Join(parts, "\n"), "", nil)
}

func persistUploadedImages(ctx context.Context, listingID int, uploads []uploadedImagePayload) error {
	if imageRepo == nil || len(uploads) == 0 {
		return nil
	}

	clientIDToImageID := make(map[string]int, len(uploads))
	pending := make([]pendingUploadedImage, 0, len(uploads))

	persistUpload := func(upload uploadedImagePayload, fallbackOrder int, sourceImageID *int) error {
		url := strings.TrimSpace(upload.URL)
		filename := strings.TrimSpace(upload.Filename)
		if url == "" || filename == "" {
			return nil
		}

		displayOrder := fallbackOrder
		if upload.DisplayOrder != nil && *upload.DisplayOrder >= 0 {
			displayOrder = *upload.DisplayOrder
		}

		isActive := true
		if upload.IsActive != nil {
			isActive = *upload.IsActive
		}

		variantType := trimStringPtr(upload.VariantType)
		aiModel := trimStringPtr(upload.AIModel)
		aiPromptVersion := trimStringPtr(upload.AIPromptVersion)

		var aiGeneratedAt *time.Time
		if variantType != nil {
			now := time.Now().UTC()
			aiGeneratedAt = &now
		}

		image := &models.ListingImage{
			ListingID:       listingID,
			URL:             url,
			Filename:        filename,
			DisplayOrder:    displayOrder,
			IsActive:        isActive,
			SourceImageID:   sourceImageID,
			VariantType:     variantType,
			AIModel:         aiModel,
			AIPromptVersion: aiPromptVersion,
			AIGeneratedAt:   aiGeneratedAt,
		}
		if err := imageRepo.Create(ctx, image); err != nil {
			return err
		}

		if clientID := strings.TrimSpace(upload.ClientID); clientID != "" {
			clientIDToImageID[clientID] = image.ID
		}
		return nil
	}

	for idx, upload := range uploads {
		sourceImageID, resolved := resolveUploadSourceImageID(upload, clientIDToImageID)
		if !resolved {
			pending = append(pending, pendingUploadedImage{
				upload:        upload,
				fallbackOrder: idx,
			})
			continue
		}
		if err := persistUpload(upload, idx, sourceImageID); err != nil {
			return err
		}
	}

	if err := persistPendingUploadedImages(pending, clientIDToImageID, func(upload uploadedImagePayload, fallbackOrder int, sourceImageID *int) error {
		return persistUpload(upload, fallbackOrder, sourceImageID)
	}); err != nil {
		return err
	}

	return nil
}

func resolveUploadSourceImageID(upload uploadedImagePayload, clientIDToImageID map[string]int) (*int, bool) {
	if upload.SourceImageID != nil && *upload.SourceImageID > 0 {
		sourceID := *upload.SourceImageID
		return &sourceID, true
	}

	sourceClientID := strings.TrimSpace(upload.SourceClientID)
	if sourceClientID == "" {
		return nil, true
	}

	resolvedID, ok := clientIDToImageID[sourceClientID]
	if !ok || resolvedID <= 0 {
		return nil, false
	}
	resolved := resolvedID
	return &resolved, true
}

func persistPendingUploadedImages(
	pending []pendingUploadedImage,
	clientIDToImageID map[string]int,
	persist func(upload uploadedImagePayload, fallbackOrder int, sourceImageID *int) error,
) error {
	if len(pending) == 0 {
		return nil
	}

	for len(pending) > 0 {
		next := make([]pendingUploadedImage, 0, len(pending))
		progress := false

		for _, item := range pending {
			sourceImageID, resolved := resolveUploadSourceImageID(item.upload, clientIDToImageID)
			if !resolved {
				next = append(next, item)
				continue
			}

			if err := persist(item.upload, item.fallbackOrder, sourceImageID); err != nil {
				return err
			}
			progress = true
		}

		if len(next) == 0 {
			return nil
		}
		if !progress {
			missing := make(map[string]struct{})
			for _, item := range next {
				sourceClientID := strings.TrimSpace(item.upload.SourceClientID)
				if sourceClientID == "" {
					continue
				}
				missing[sourceClientID] = struct{}{}
			}
			unresolved := make([]string, 0, len(missing))
			for clientID := range missing {
				unresolved = append(unresolved, clientID)
			}
			sort.Strings(unresolved)
			if len(unresolved) == 0 {
				return fmt.Errorf("failed to resolve pending uploaded images due to unresolved dependencies")
			}
			return fmt.Errorf("failed to resolve source image for sourceClientId(s): %s", strings.Join(unresolved, ", "))
		}

		pending = next
	}

	return nil
}

func trimStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func imageReferencesForModeration(images []models.ListingImage) []string {
	refs := make([]string, 0, len(images))
	for _, img := range images {
		ref := strings.TrimSpace(img.URL)
		if ref == "" {
			ref = strings.TrimSpace(img.Filename)
		}
		if ref == "" {
			continue
		}
		refs = append(refs, ref)
	}
	sort.Strings(refs)
	return refs
}

func maybeReplayIdempotentPublish(w http.ResponseWriter, r *http.Request, req publishListingRequest, listingID string) (bool, string) {
	if listingModerationSvc == nil {
		return false, ""
	}
	userID := getRequestUserID(r)
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if userID == "" || idempotencyKey == "" {
		return false, ""
	}

	requestFingerprint := buildPublishRequestFingerprint(req, listingID)
	body, status, replay, err := listingModerationSvc.CheckIdempotency(r.Context(), userID, idempotencyKey, requestFingerprint)
	if err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return true, ""
	}
	if replay {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write(body)
		return true, ""
	}
	return false, requestFingerprint
}

// GetListings handles GET requests for all listings
func GetListings(w http.ResponseWriter, r *http.Request) {
	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	// Get limit from query params (default 20)
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	listings, err := listingRepo.GetAll(context.Background(), limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"listings": listings,
		"total":    len(listings),
	})
}

// GetListingByID handles GET requests for a specific listing
func GetListingByID(w http.ResponseWriter, r *http.Request, idStr string) {
	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	id, err := listingRepo.ResolveID(r.Context(), idStr)
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Invalid listing ID", http.StatusBadRequest)
		return
	}

	listing, err := listingRepo.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	requesterID := getRequestUserID(r)
	requesterIsAdmin := isAdminRequest(r)
	if !canViewListing(listing, requesterID, requesterIsAdmin) {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	// Record view (async, won't block response)
	sellerID := ""
	if listing.UserID != nil {
		sellerID = *listing.UserID
	}
	if isPublicListingStatus(listing.Status) {
		if viewSvc := service.GetViewCountService(); viewSvc != nil {
			viewSvc.RecordView(id, r, sellerID)
		}
	}

	// Fetch images if repo is available
	var images []models.ListingImage
	if imageRepo != nil {
		images, _ = imageRepo.GetByListingID(context.Background(), id)
	}
	if shouldUseProtectedImagePaths(listing.Status, listing.UserID, requesterID, requesterIsAdmin) {
		images = mapListingImagesForResponse(listing.Status, images)
	}

	// Build response with images
	// Get buffered view count delta to add to DB view count
	bufferedViews := 0
	if viewSvc := service.GetViewCountService(); viewSvc != nil {
		bufferedViews = viewSvc.GetBufferedCount(id)
	}
	response := map[string]interface{}{
		"id":                   listing.ID,
		"publicId":             listing.PublicID,
		"userId":               listing.UserID,
		"title":                listing.Title,
		"subtitle":             listing.Subtitle,
		"description":          listing.Description,
		"price":                listing.Price,
		"category":             listing.Category,
		"condition":            listing.Condition,
		"location":             listing.Location,
		"status":               listing.Status,
		"categoryFields":       listing.CategoryFields,
		"shippingOptions":      listing.ShippingOptions,
		"paymentMethods":       listing.PaymentMethods,
		"returnsPolicy":        listing.ReturnsPolicy,
		"make":                 listing.CategoryFields["make"],
		"model":                listing.CategoryFields["model"],
		"year":                 listing.CategoryFields["year"],
		"odometer":             listing.CategoryFields["mileage"], // Note: mileage key mapping
		"createdAt":            listing.CreatedAt,
		"updatedAt":            listing.UpdatedAt,
		"images":               images,
		"reservedFor":          listing.ReservedFor,
		"reservedAt":           listing.ReservedAt,
		"reservationExpiresAt": listing.ReservationExpiresAt,
		"viewCount":            listing.ViewCount + bufferedViews,
		"likeCount":            listing.LikeCount,
		"expiresAt":            listing.ExpiresAt,
	}

	if requesterIsAdmin || (listing.UserID != nil && *listing.UserID == requesterID) {
		response["moderationStatus"] = listing.ModerationStatus
		response["moderationSeverity"] = listing.ModerationSeverity
		response["moderationSummary"] = listing.ModerationSummary
		response["moderationFlagProfile"] = listing.ModerationFlagProfile
		response["moderationCheckedAt"] = listing.ModerationCheckedAt
	}

	// Check if current user has liked this listing
	if userID := r.Context().Value("userID"); userID != nil {
		if userIDStr, ok := userID.(string); ok && userIDStr != "" {
			likesRepo := repository.GetLikesRepository()
			if likesRepo != nil {
				isLiked, _ := likesRepo.IsLiked(context.Background(), userIDStr, id)
				response["isLiked"] = isLiked
			}
		}
	}

	// Fetch seller info if user_id exists
	if listing.UserID != nil && *listing.UserID != "" {
		userRepo := repository.GetUserRepository()
		if userRepo != nil {
			user, err := userRepo.GetByID(context.Background(), *listing.UserID)
			if err == nil && user != nil {
				response["seller"] = map[string]interface{}{
					"id":          user.ID,
					"name":        user.Name,
					"email":       user.Email,
					"avatar":      user.Avatar,
					"createdAt":   user.CreatedAt,
					"location":    user.ToResponse().Location,
					"rating":      user.Rating,
					"reviewCount": user.ReviewCount,
					"isVerified":  user.IsVerified,
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CreateListing handles POST requests to create a listing
func CreateListing(w http.ResponseWriter, r *http.Request) {
	if listingRepo == nil || moderationRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	userID := getRequestUserID(r)
	if userID == "" {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	if !applyPublishRateLimit(w, r, userID) {
		return
	}

	var req publishListingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	replayed, requestFingerprint := maybeReplayIdempotentPublish(w, r, req, "")
	if replayed {
		return
	}

	listing := req.toListing(&userID)

	// Validate required fields
	if listing.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	if listing.Price < 0 {
		http.Error(w, "Price cannot be negative", http.StatusBadRequest)
		return
	}

	// Validate expiration date if provided
	if err := ValidateExpiresAt(listing.ExpiresAt); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Set default expiration (7 days) if not provided
	if listing.ExpiresAt == nil {
		defaultExpiry := DefaultExpiresAt()
		listing.ExpiresAt = &defaultExpiry
	}
	if listing.Category == "" {
		listing.Category = "general"
	}
	if !categorySupportsQuantity(listing.Category) {
		listing.Quantity = 1
	} else if listing.Quantity <= 0 {
		listing.Quantity = 1
	}
	if listing.Condition == "" {
		listing.Condition = "Good"
	}

	// Create as pending until moderation completes.
	listing.Status = string(models.ListingStatusPendingReview)
	listing.ModerationStatus = models.ListingModerationStatusPendingReview

	ctx := r.Context()
	if err := listingRepo.Create(ctx, &listing); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := persistUploadedImages(ctx, listing.ID, req.UploadedImages); err != nil {
		http.Error(w, "Failed to save listing images", http.StatusInternalServerError)
		return
	}

	if imageRepo != nil {
		images, _ := imageRepo.GetByListingID(ctx, listing.ID)
		listing.Images = images
	}

	imageRefs := imageReferencesForModeration(listing.Images)

	if listingModerationSvc != nil {
		if _, err := listingModerationSvc.EvaluateAndApply(
			ctx,
			&listing,
			userID,
			getRequestUserEmail(r),
			imageRefs,
		); err != nil {
			http.Error(w, "Failed to moderate listing", http.StatusInternalServerError)
			return
		}
	} else {
		fallback := models.ModerationResult{
			Decision:    models.ModerationDecisionReviewNeeded,
			Severity:    models.ModerationSeverityHigh,
			Summary:     "Publishing is taking longer than usual. Listing sent for manual review.",
			FlagProfile: false,
			Violations:  []models.ModerationViolation{},
			Source:      "fallback_error",
		}
		if err := listingRepo.UpdateModerationOutcome(
			ctx,
			listing.ID,
			models.ListingStatusPendingReview,
			models.ListingModerationStatusError,
			&fallback,
			service.BuildContentFingerprint(listing.Title, listing.Description, imageRefs),
		); err != nil {
			http.Error(w, "Failed to update moderation state", http.StatusInternalServerError)
			return
		}
		listing.Status = string(models.ListingStatusPendingReview)
		listing.ModerationStatus = models.ListingModerationStatusError
		listing.ModerationSeverity = models.ModerationSeverityHigh
		listing.ModerationSummary = fallback.Summary
	}

	// Refresh embedding asynchronously only for published listings.
	if listing.Status == string(models.ListingStatusActive) {
		queueListingEmbeddingRefresh(listing.ID, listing.Title, listing.Description, listing.Category, listing.CategoryFields)
	}

	if listingModerationSvc != nil && requestFingerprint != "" {
		_ = listingModerationSvc.StoreIdempotencyResponse(
			ctx,
			userID,
			strings.TrimSpace(r.Header.Get("Idempotency-Key")),
			requestFingerprint,
			http.StatusCreated,
			listing,
		)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(listing)
}

// GetUserListings handles GET requests for a user's listings
func GetUserListings(w http.ResponseWriter, r *http.Request, userID string) {
	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	requesterID := getRequestUserID(r)
	requesterIsAdmin := isAdminRequest(r)

	var listings []models.Listing
	var err error
	if requesterIsAdmin || (requesterID != "" && requesterID == userID) {
		listings, err = listingRepo.GetByUserID(context.Background(), userID)
	} else {
		listings, err = listingRepo.GetPublicByUserID(context.Background(), userID)
	}
	if err != nil {
		log.Printf("Error fetching user listings: %v", err)
		http.Error(w, "Failed to fetch listings", http.StatusInternalServerError)
		return
	}
	for i := range listings {
		if shouldUseProtectedImagePaths(listings[i].Status, listings[i].UserID, requesterID, requesterIsAdmin) {
			listings[i].Images = mapListingImagesForResponse(listings[i].Status, listings[i].Images)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  listings,
		"total": len(listings),
	})
}

// UpdateListing handles PUT requests to update a listing
func UpdateListing(w http.ResponseWriter, r *http.Request, idStr string) {
	if listingRepo == nil || moderationRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	id, err := listingRepo.ResolveID(r.Context(), idStr)
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Invalid listing ID", http.StatusBadRequest)
		return
	}

	// Get authenticated user ID from context
	userIDStr := getRequestUserID(r)
	if userIDStr == "" {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	if !applyPublishRateLimit(w, r, userIDStr) {
		return
	}

	// Fetch existing listing to verify ownership
	existingListing, err := listingRepo.GetByID(context.Background(), id)
	if err != nil {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	// Verify ownership
	if existingListing.UserID == nil || *existingListing.UserID != userIDStr {
		http.Error(w, "You can only edit your own listings", http.StatusForbidden)
		return
	}

	var req publishListingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	replayed, requestFingerprint := maybeReplayIdempotentPublish(w, r, req, strconv.Itoa(id))
	if replayed {
		return
	}

	listing := req.toListing(existingListing.UserID)

	// Set the ID from URL and preserve user_id
	listing.ID = id
	listing.PublicID = existingListing.PublicID
	listing.UserID = existingListing.UserID

	// Validate required fields
	if listing.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	if listing.Price < 0 {
		http.Error(w, "Price cannot be negative", http.StatusBadRequest)
		return
	}

	// Validate expiration date if provided (max 1 month from original creation date)
	if err := ValidateExpiresAtForUpdate(listing.ExpiresAt, existingListing.CreatedAt); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Preserve existing expiration if not provided in update
	if listing.ExpiresAt == nil {
		listing.ExpiresAt = existingListing.ExpiresAt
	}
	if listing.Category == "" {
		listing.Category = existingListing.Category
	}
	if !categorySupportsQuantity(listing.Category) {
		listing.Quantity = 1
	} else if listing.Quantity <= 0 {
		if existingListing.Quantity > 0 {
			listing.Quantity = existingListing.Quantity
		} else {
			listing.Quantity = 1
		}
	}
	if listing.Condition == "" {
		listing.Condition = existingListing.Condition
	}
	if listing.Location == "" {
		listing.Location = existingListing.Location
	}
	if listing.CategoryFields == nil {
		listing.CategoryFields = existingListing.CategoryFields
	}
	if listing.ShippingOptions == nil {
		listing.ShippingOptions = existingListing.ShippingOptions
	}
	if listing.PaymentMethods == nil {
		listing.PaymentMethods = existingListing.PaymentMethods
	}
	if listing.ReturnsPolicy == nil {
		listing.ReturnsPolicy = existingListing.ReturnsPolicy
	}

	// Capture old price for price drop notification
	oldPrice := existingListing.Price

	ctx := r.Context()
	if err := listingRepo.Update(ctx, &listing); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	listing.Status = string(models.ListingStatusPendingReview)
	listing.ModerationStatus = models.ListingModerationStatusPendingReview
	listing.ModerationSeverity = ""
	listing.ModerationSummary = "Publishing is taking longer than usual. Listing is pending review."
	listing.ModerationFlagProfile = false

	// Sync listing images before moderation.
	if imageRepo != nil {
		if err := imageRepo.DeactivateImages(ctx, listing.ID, req.DeactivateImageIDs); err != nil {
			http.Error(w, "Failed to deactivate listing images", http.StatusInternalServerError)
			return
		}

		keepImageIDs := req.KeepImageIDs
		if keepImageIDs == nil {
			existingImages, _ := imageRepo.GetByListingID(ctx, listing.ID)
			keepImageIDs = make([]int, 0, len(existingImages))
			for _, img := range existingImages {
				keepImageIDs = append(keepImageIDs, img.ID)
			}
		}

		if err := imageRepo.DeleteExcept(ctx, listing.ID, keepImageIDs); err != nil {
			http.Error(w, "Failed to sync listing images", http.StatusInternalServerError)
			return
		}
		if err := persistUploadedImages(ctx, listing.ID, req.UploadedImages); err != nil {
			http.Error(w, "Failed to save uploaded images", http.StatusInternalServerError)
			return
		}
		images, _ := imageRepo.GetByListingID(ctx, listing.ID)
		listing.Images = images
	}

	imageRefs := imageReferencesForModeration(listing.Images)
	if listingModerationSvc != nil {
		if _, err := listingModerationSvc.EvaluateAndApply(
			ctx,
			&listing,
			userIDStr,
			getRequestUserEmail(r),
			imageRefs,
		); err != nil {
			http.Error(w, "Failed to moderate updated listing", http.StatusInternalServerError)
			return
		}
	} else {
		fallback := models.ModerationResult{
			Decision:    models.ModerationDecisionReviewNeeded,
			Severity:    models.ModerationSeverityHigh,
			Summary:     "Publishing is taking longer than usual. Listing sent for manual review.",
			FlagProfile: false,
			Violations:  []models.ModerationViolation{},
			Source:      "fallback_error",
		}
		if err := listingRepo.UpdateModerationOutcome(
			ctx,
			listing.ID,
			models.ListingStatusPendingReview,
			models.ListingModerationStatusError,
			&fallback,
			service.BuildContentFingerprint(listing.Title, listing.Description, imageRefs),
		); err != nil {
			http.Error(w, "Failed to update moderation state", http.StatusInternalServerError)
			return
		}
		listing.Status = string(models.ListingStatusPendingReview)
		listing.ModerationStatus = models.ListingModerationStatusError
		listing.ModerationSeverity = models.ModerationSeverityHigh
		listing.ModerationSummary = fallback.Summary
	}

	// Trigger price drop notifications only for published listings.
	if listing.Status == string(models.ListingStatusActive) && listing.Price < oldPrice && notificationSvc != nil {
		go func() {
			bgCtx := context.Background()
			if err := notificationSvc.NotifyPriceDrop(bgCtx, int64(listing.ID), listing.Title, oldPrice, listing.Price); err != nil {
				log.Printf("Failed to send price drop notifications for listing %d: %v", listing.ID, err)
			}
		}()
	}

	if listing.Status == string(models.ListingStatusActive) {
		queueListingEmbeddingRefresh(listing.ID, listing.Title, listing.Description, listing.Category, listing.CategoryFields)
	}

	if listingModerationSvc != nil && requestFingerprint != "" {
		_ = listingModerationSvc.StoreIdempotencyResponse(
			ctx,
			userIDStr,
			strings.TrimSpace(r.Header.Get("Idempotency-Key")),
			requestFingerprint,
			http.StatusOK,
			listing,
		)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(listing)
}

// DeleteListing handles DELETE requests to delete a listing
func DeleteListing(w http.ResponseWriter, r *http.Request, idStr string) {
	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	id, err := listingRepo.ResolveID(r.Context(), idStr)
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Invalid listing ID", http.StatusBadRequest)
		return
	}

	// Get authenticated user ID from context
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	// Fetch existing listing to verify ownership
	existingListing, err := listingRepo.GetByID(context.Background(), id)
	if err != nil {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	// Verify ownership
	if existingListing.UserID == nil || *existingListing.UserID != userIDStr {
		http.Error(w, "You can only delete your own listings", http.StatusForbidden)
		return
	}

	if err := listingRepo.Delete(context.Background(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Listing deleted successfully",
		"id":      id,
	})
}

// CreateListingImage handles POST requests to save image references
func CreateListingImage(w http.ResponseWriter, r *http.Request) {
	if imageRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}
	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	userID := getRequestUserID(r)
	if userID == "" {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var image models.ListingImage
	if err := json.NewDecoder(r.Body).Decode(&image); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if image.ListingID == 0 {
		http.Error(w, "listingId is required", http.StatusBadRequest)
		return
	}
	if !image.IsActive {
		image.IsActive = true
	}

	listing, err := listingRepo.GetByID(r.Context(), image.ListingID)
	if err != nil || listing == nil || listing.UserID == nil || *listing.UserID != userID {
		http.Error(w, "You can only modify your own listings", http.StatusForbidden)
		return
	}

	if err := imageRepo.Create(r.Context(), &image); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(image)
}

// GetListingImage handles GET requests for image access with listing visibility checks.
func GetListingImage(w http.ResponseWriter, r *http.Request, imageIDStr string) {
	if imageRepo == nil || listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	imageID, err := strconv.Atoi(strings.TrimSpace(imageIDStr))
	if err != nil || imageID <= 0 {
		http.Error(w, "Invalid image ID", http.StatusBadRequest)
		return
	}

	image, err := imageRepo.GetByID(r.Context(), imageID)
	if err != nil || image == nil {
		http.Error(w, "Image not found", http.StatusNotFound)
		return
	}

	listing, err := listingRepo.GetByID(r.Context(), image.ListingID)
	if err != nil || listing == nil {
		http.Error(w, "Image not found", http.StatusNotFound)
		return
	}

	if !canViewListing(listing, getRequestUserID(r), isAdminRequest(r)) {
		http.Error(w, "Image not found", http.StatusNotFound)
		return
	}

	url := strings.TrimSpace(image.URL)
	if url == "" {
		http.Error(w, "Image not found", http.StatusNotFound)
		return
	}

	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// SyncListingImages handles PUT requests to sync images for a listing
// It deletes images not in the keepIds array
func SyncListingImages(w http.ResponseWriter, r *http.Request, listingIDStr string) {
	if listingRepo == nil || imageRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	listingID, err := listingRepo.ResolveID(r.Context(), listingIDStr)
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Invalid listing ID", http.StatusBadRequest)
		return
	}

	userID := getRequestUserID(r)
	if userID == "" {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	listing, err := listingRepo.GetByID(r.Context(), listingID)
	if err != nil || listing == nil || listing.UserID == nil || *listing.UserID != userID {
		http.Error(w, "You can only modify your own listings", http.StatusForbidden)
		return
	}

	var body struct {
		KeepImageIDs []int `json:"keepImageIds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Delete images not in the keepImageIds list
	if err := imageRepo.DeleteExcept(context.Background(), listingID, body.KeepImageIDs); err != nil {
		log.Printf("Error syncing images for listing %d: %v", listingID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Synced images for listing %d, keeping %d images", listingID, len(body.KeepImageIDs))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"listingId":  listingID,
		"keptImages": len(body.KeepImageIDs),
	})
}

// UpdateListingStatus handles PATCH requests to update only the status of a listing
func UpdateListingStatus(w http.ResponseWriter, r *http.Request, idStr string) {
	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	id, err := listingRepo.ResolveID(r.Context(), idStr)
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Invalid listing ID", http.StatusBadRequest)
		return
	}

	// Get authenticated user ID from context
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	// Fetch existing listing to verify ownership
	existingListing, err := listingRepo.GetByID(context.Background(), id)
	if err != nil {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	// Verify ownership
	if existingListing.UserID == nil || *existingListing.UserID != userIDStr {
		http.Error(w, "You can only update your own listings", http.StatusForbidden)
		return
	}
	if existingListing.Status == string(models.ListingStatusPendingReview) || existingListing.Status == string(models.ListingStatusBlocked) {
		http.Error(w, "Listing is under review and cannot change status", http.StatusForbidden)
		return
	}

	// Parse status from request body
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate status value
	validStatuses := map[string]bool{"active": true, "sold": true, "reserved": true, "deleted": true}
	if !validStatuses[body.Status] {
		http.Error(w, "Invalid status. Must be one of: active, sold, reserved, deleted", http.StatusBadRequest)
		return
	}

	// Update the status
	if err := listingRepo.UpdateStatus(context.Background(), id, body.Status); err != nil {
		log.Printf("Error updating listing status: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Status updated successfully",
		"id":      id,
		"status":  body.Status,
	})
}

// CancelReservation handles POST /api/listings/:id/cancel-reservation
func CancelReservation(w http.ResponseWriter, r *http.Request, idStr string) {
	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	id, err := listingRepo.ResolveID(r.Context(), idStr)
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Invalid listing ID", http.StatusBadRequest)
		return
	}

	// Get authenticated user ID from context
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	// Fetch existing listing to verify ownership
	existingListing, err := listingRepo.GetByID(context.Background(), id)
	if err != nil {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	// Verify ownership (only seller can cancel reservation)
	if existingListing.UserID == nil || *existingListing.UserID != userIDStr {
		http.Error(w, "Only the seller can cancel a reservation", http.StatusForbidden)
		return
	}

	// Verify listing is reserved
	if existingListing.Status != "reserved" {
		http.Error(w, "Listing is not reserved", http.StatusBadRequest)
		return
	}

	// Cancel the reservation
	if err := listingRepo.CancelReservation(context.Background(), id); err != nil {
		log.Printf("Error canceling reservation: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Reservation canceled for listing %d by seller %s", id, userIDStr)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Reservation canceled successfully",
		"id":      id,
		"status":  "active",
	})
}

// LikeListing handles POST /api/listings/:id/like
func LikeListing(w http.ResponseWriter, r *http.Request, idStr string) {
	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	id, err := listingRepo.ResolveID(r.Context(), idStr)
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Invalid listing ID", http.StatusBadRequest)
		return
	}

	// Get authenticated user ID from context
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	likesRepo := repository.GetLikesRepository()
	if likesRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	// Get listing price for price drop notifications and prevent self-like
	var priceWhenLiked *int
	listing, err := listingRepo.GetByID(context.Background(), id)
	if err == nil && listing != nil {
		if listing.Status != string(models.ListingStatusActive) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		if listing.UserID != nil && *listing.UserID == userIDStr {
			http.Error(w, "Cannot like your own listing", http.StatusForbidden)
			return
		}
		priceWhenLiked = &listing.Price
	}

	if err := likesRepo.Like(context.Background(), userIDStr, id, priceWhenLiked); err != nil {
		log.Printf("Error liking listing %d: %v", id, err)
		http.Error(w, "Failed to like listing", http.StatusInternalServerError)
		return
	}

	// Get updated like count
	likeCount, _ := likesRepo.GetLikeCount(context.Background(), id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"isLiked":   true,
		"likeCount": likeCount,
	})
}

// UnlikeListing handles DELETE /api/listings/:id/like
func UnlikeListing(w http.ResponseWriter, r *http.Request, idStr string) {
	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	id, err := listingRepo.ResolveID(r.Context(), idStr)
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Invalid listing ID", http.StatusBadRequest)
		return
	}

	// Get authenticated user ID from context
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	likesRepo := repository.GetLikesRepository()
	if likesRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	listing, getErr := listingRepo.GetByID(context.Background(), id)
	if getErr == nil && listing != nil && listing.Status != string(models.ListingStatusActive) {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	if err := likesRepo.Unlike(context.Background(), userIDStr, id); err != nil {
		log.Printf("Error unliking listing %d: %v", id, err)
		http.Error(w, "Failed to unlike listing", http.StatusInternalServerError)
		return
	}

	// Get updated like count
	likeCount, _ := likesRepo.GetLikeCount(context.Background(), id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"isLiked":   false,
		"likeCount": likeCount,
	})
}
