package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/service"
)

var locationService *service.LocationService

// SetLocationService sets the location service dependency
func SetLocationService(svc *service.LocationService) {
	locationService = svc
}

// SimilarListingsResponse is the response structure for similar listings
type SimilarListingsResponse struct {
	Listings        []SimilarListingItem `json:"listings"`
	Total           int                  `json:"total"`
	CurrentLocation string               `json:"currentLocation"`
	NearbyLocations []string             `json:"nearbyLocations"`
}

// SimilarListingItem represents a single similar listing with scores
type SimilarListingItem struct {
	ID             int                    `json:"id"`
	PublicID       string                 `json:"publicId"`
	Title          string                 `json:"title"`
	Description    string                 `json:"description"`
	Price          int                    `json:"price"`
	Category       string                 `json:"category"`
	Location       string                 `json:"location"`
	Condition      string                 `json:"condition"`
	CreatedAt      string                 `json:"createdAt"`
	Images         []map[string]string    `json:"images"`
	CategoryFields map[string]interface{} `json:"categoryFields,omitempty"`
	SemanticScore  float64                `json:"semanticScore"`
	LocationScore  float64                `json:"locationScore"`
	CombinedScore  float64                `json:"combinedScore"`
	LocationMatch  string                 `json:"locationMatch"`
}

// GetSimilarListings handles GET /api/listings/{id}/similar
func GetSimilarListings(w http.ResponseWriter, r *http.Request, idStr string) {
	if listingRepo == nil || vectorRepo == nil {
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

	// Get limit from query params (default 8)
	limit := 8
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 20 {
			limit = l
		}
	}

	ctx := context.Background()

	// Get the current listing to find its location
	listing, err := listingRepo.GetByID(ctx, id)
	if err != nil {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}
	if !canViewListing(listing, getRequestUserID(r), isAdminRequest(r)) {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	// Get nearby locations using the location service
	var nearbyLocations []string
	currentLocation := listing.Location

	if locationService != nil && currentLocation != "" {
		nearbyLocations = locationService.GetNearbyLocations(currentLocation)
	}

	// Get similar listings with location consideration
	results, err := vectorRepo.GetSimilarListingsWithLocation(ctx, id, nearbyLocations, limit)
	if err != nil {
		http.Error(w, "Failed to get similar listings: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Build response
	items := make([]SimilarListingItem, 0, len(results))
	for _, r := range results {
		item := SimilarListingItem{
			ID:            r.Listing.ID,
			PublicID:      r.Listing.PublicID,
			Title:         r.Listing.Title,
			Description:   r.Listing.Description,
			Price:         r.Listing.Price,
			Category:      r.Listing.Category,
			Condition:     r.Listing.Condition,
			SemanticScore: r.SemanticScore,
			LocationScore: r.LocationScore,
			CombinedScore: r.CombinedScore,
			LocationMatch: r.LocationMatch,
		}

		item.Location = r.Listing.Location

		if !r.Listing.CreatedAt.IsZero() {
			item.CreatedAt = r.Listing.CreatedAt.Format("2006-01-02T15:04:05Z")
		}

		// Fetch images for this listing
		if imageRepo != nil {
			images, _ := imageRepo.GetByListingID(ctx, r.Listing.ID)
			item.Images = make([]map[string]string, 0, len(images))
			for _, img := range images {
				item.Images = append(item.Images, map[string]string{
					"id":           strconv.Itoa(img.ID),
					"url":          img.URL,
					"displayOrder": strconv.Itoa(img.DisplayOrder),
				})
			}
		}

		items = append(items, item)
	}

	response := SimilarListingsResponse{
		Listings:        items,
		Total:           len(items),
		CurrentLocation: currentLocation,
		NearbyLocations: nearbyLocations,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
