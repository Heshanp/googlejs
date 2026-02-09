package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
)

var reviewRepo *repository.ReviewRepository

// SetReviewRepo sets the review repository dependency
func SetReviewRepo(repo *repository.ReviewRepository) {
	reviewRepo = repo
}

// CreateReview handles POST /api/reviews
func CreateReview(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)
	log.Printf("CreateReview: userID=%s", userIDStr)

	var input struct {
		ListingID  int     `json:"listingId"`
		RevieweeID string  `json:"revieweeId"`
		Rating     int     `json:"rating"`
		Comment    *string `json:"comment,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Printf("CreateReview: invalid request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("CreateReview: input=%+v", input)

	// Validate rating
	if input.Rating < 1 || input.Rating > 5 {
		http.Error(w, "Rating must be between 1 and 5", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if input.ListingID <= 0 {
		http.Error(w, "listingId is required", http.StatusBadRequest)
		return
	}
	if input.RevieweeID == "" {
		http.Error(w, "revieweeId is required", http.StatusBadRequest)
		return
	}

	// Cannot review yourself
	if input.RevieweeID == userIDStr {
		http.Error(w, "Cannot review yourself", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Verify listing exists and is sold
	listing, err := listingRepo.GetByID(ctx, input.ListingID)
	if err != nil {
		log.Printf("CreateReview: listing not found: %v", err)
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	if listing.Status != "sold" {
		log.Printf("CreateReview: listing %d is not sold (status=%s)", input.ListingID, listing.Status)
		http.Error(w, "Reviews can only be left for sold listings", http.StatusBadRequest)
		return
	}

	// Verify user was part of the transaction (seller or buyer)
	sellerID := ""
	if listing.UserID != nil {
		sellerID = *listing.UserID
	}
	buyerID := ""
	if listing.ReservedFor != nil {
		buyerID = *listing.ReservedFor
	}

	isParticipant := userIDStr == sellerID || userIDStr == buyerID
	if !isParticipant {
		log.Printf("CreateReview: user %s not participant in transaction (seller=%s, buyer=%s)", userIDStr, sellerID, buyerID)
		http.Error(w, "You were not part of this transaction", http.StatusForbidden)
		return
	}

	// Verify reviewee was the other party
	isValidReviewee := (userIDStr == sellerID && input.RevieweeID == buyerID) ||
		(userIDStr == buyerID && input.RevieweeID == sellerID)
	if !isValidReviewee {
		log.Printf("CreateReview: invalid reviewee %s for user %s", input.RevieweeID, userIDStr)
		http.Error(w, "You can only review the other party in the transaction", http.StatusForbidden)
		return
	}

	// Check for duplicate review
	hasReviewed, err := reviewRepo.HasReviewed(ctx, input.ListingID, userIDStr, input.RevieweeID)
	if err != nil {
		log.Printf("CreateReview: error checking existing review: %v", err)
		http.Error(w, "Failed to check existing review", http.StatusInternalServerError)
		return
	}
	if hasReviewed {
		log.Printf("CreateReview: user %s already reviewed %s for listing %d", userIDStr, input.RevieweeID, input.ListingID)
		http.Error(w, "You have already reviewed this user for this transaction", http.StatusConflict)
		return
	}

	// Create the review
	review, err := reviewRepo.Create(ctx, models.CreateReviewInput{
		ListingID:  input.ListingID,
		ReviewerID: userIDStr,
		RevieweeID: input.RevieweeID,
		Rating:     input.Rating,
		Comment:    input.Comment,
	})
	if err != nil {
		log.Printf("CreateReview: error creating review: %v", err)
		http.Error(w, "Failed to create review", http.StatusInternalServerError)
		return
	}
	log.Printf("CreateReview: review created successfully with ID=%s", review.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(review)
}

// GetReviewsForUser handles GET /api/users/:id/reviews
func GetReviewsForUser(w http.ResponseWriter, r *http.Request, userID string) {
	ctx := context.Background()

	reviews, err := reviewRepo.GetByUserID(ctx, userID)
	if err != nil {
		log.Printf("GetReviewsForUser: error=%v", err)
		http.Error(w, "Failed to fetch reviews", http.StatusInternalServerError)
		return
	}

	// Get stats
	stats, err := reviewRepo.GetUserStats(ctx, userID)
	if err != nil {
		log.Printf("GetReviewsForUser: error getting stats: %v", err)
		// Continue without stats
		stats = &models.ReviewStats{
			AverageRating: 0,
			TotalReviews:  0,
			Breakdown:     map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"reviews": reviews,
		"stats":   stats,
	})
}

// GetReviewsForListing handles GET /api/listings/:id/reviews
func GetReviewsForListing(w http.ResponseWriter, r *http.Request, listingIDStr string) {
	if listingRepo == nil {
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

	ctx := context.Background()

	reviews, err := reviewRepo.GetByListingID(ctx, listingID)
	if err != nil {
		log.Printf("GetReviewsForListing: error=%v", err)
		http.Error(w, "Failed to fetch reviews", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"reviews": reviews,
		"total":   len(reviews),
	})
}

// GetPendingReviews handles GET /api/reviews/pending
func GetPendingReviews(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	ctx := context.Background()

	pending, err := reviewRepo.GetPendingReviews(ctx, userIDStr)
	if err != nil {
		log.Printf("GetPendingReviews: error=%v", err)
		http.Error(w, "Failed to fetch pending reviews", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"pending": pending,
		"total":   len(pending),
	})
}

// HandleReviewRoutes routes review-related requests
func HandleReviewRoutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/reviews")
	path = strings.TrimPrefix(path, "/")

	// POST /api/reviews - create new review
	if path == "" && r.Method == http.MethodPost {
		CreateReview(w, r)
		return
	}

	// GET /api/reviews/pending - get pending reviews for current user
	if path == "pending" && r.Method == http.MethodGet {
		GetPendingReviews(w, r)
		return
	}

	http.Error(w, "Not found", http.StatusNotFound)
}
