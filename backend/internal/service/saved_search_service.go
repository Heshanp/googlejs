package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/ws"
)

// SavedSearchService handles saved search operations
type SavedSearchService struct {
	repo        *repository.SavedSearchRepository
	searchSvc   *SearchService
	notifSvc    *NotificationService
	hub         *ws.Hub
}

var savedSearchService *SavedSearchService

// NewSavedSearchService creates a new saved search service
func NewSavedSearchService(
	repo *repository.SavedSearchRepository,
	searchSvc *SearchService,
	notifSvc *NotificationService,
	hub *ws.Hub,
) *SavedSearchService {
	return &SavedSearchService{
		repo:      repo,
		searchSvc: searchSvc,
		notifSvc:  notifSvc,
		hub:       hub,
	}
}

// InitSavedSearchService initializes the global saved search service
func InitSavedSearchService(
	repo *repository.SavedSearchRepository,
	searchSvc *SearchService,
	notifSvc *NotificationService,
	hub *ws.Hub,
) {
	savedSearchService = NewSavedSearchService(repo, searchSvc, notifSvc, hub)
}

// GetSavedSearchService returns the global saved search service
func GetSavedSearchService() *SavedSearchService {
	return savedSearchService
}

// Create creates a new saved search
func (s *SavedSearchService) Create(ctx context.Context, userID string, input models.CreateSavedSearchInput) (*models.SavedSearch, error) {
	return s.repo.Create(ctx, userID, input)
}

// GetUserSearches returns saved searches for a user with pagination
func (s *SavedSearchService) GetUserSearches(ctx context.Context, userID string, limit, offset int) ([]models.SavedSearch, int, error) {
	return s.repo.GetByUserID(ctx, userID, limit, offset)
}

// GetByID returns a saved search by ID for a specific user
func (s *SavedSearchService) GetByID(ctx context.Context, id int64, userID string) (*models.SavedSearch, error) {
	return s.repo.GetByID(ctx, id, userID)
}

// Update updates a saved search
func (s *SavedSearchService) Update(ctx context.Context, id int64, userID string, input models.UpdateSavedSearchInput) error {
	return s.repo.Update(ctx, id, userID, input)
}

// Delete deletes a saved search
func (s *SavedSearchService) Delete(ctx context.Context, id int64, userID string) error {
	return s.repo.Delete(ctx, id, userID)
}

// ExecuteSearch runs a saved search and returns matching listings
func (s *SavedSearchService) ExecuteSearch(ctx context.Context, search *models.SavedSearch) ([]models.Listing, error) {
	if s.searchSvc == nil {
		return nil, fmt.Errorf("search service not available")
	}

	// Parse the saved filters
	filters := models.Filters{
		Query: search.Query,
	}

	// Decode JSON filters into the Filters struct
	if len(search.Filters) > 0 && string(search.Filters) != "{}" {
		var parsedFilters struct {
			Category    string `json:"category,omitempty"`
			Make        string `json:"make,omitempty"`
			Model       string `json:"model,omitempty"`
			YearMin     *int   `json:"yearMin,omitempty"`
			YearMax     *int   `json:"yearMax,omitempty"`
			PriceMin    *int   `json:"priceMin,omitempty"`
			PriceMax    *int   `json:"priceMax,omitempty"`
			OdometerMin *int   `json:"odometerMin,omitempty"`
			OdometerMax *int   `json:"odometerMax,omitempty"`
			Location    string `json:"location,omitempty"`
			Color       string `json:"color,omitempty"`
			Condition   string `json:"condition,omitempty"`
			Keywords    string `json:"keywords,omitempty"`
		}
		if err := json.Unmarshal(search.Filters, &parsedFilters); err == nil {
			filters.Category = parsedFilters.Category
			filters.Make = parsedFilters.Make
			filters.Model = parsedFilters.Model
			filters.YearMin = parsedFilters.YearMin
			filters.YearMax = parsedFilters.YearMax
			filters.PriceMin = parsedFilters.PriceMin
			filters.PriceMax = parsedFilters.PriceMax
			filters.OdometerMin = parsedFilters.OdometerMin
			filters.OdometerMax = parsedFilters.OdometerMax
			filters.Location = parsedFilters.Location
			filters.Color = parsedFilters.Color
			filters.Condition = parsedFilters.Condition
			filters.Keywords = parsedFilters.Keywords
		}
	}

	// Execute the search with a reasonable limit
	return s.searchSvc.Search(ctx, search.Query, filters, 50)
}

// PreviewResults returns current results for a saved search (for UI preview)
func (s *SavedSearchService) PreviewResults(ctx context.Context, id int64, userID string, limit int) ([]models.Listing, error) {
	search, err := s.repo.GetByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	// Parse filters and execute search
	filters := models.Filters{Query: search.Query}
	if len(search.Filters) > 0 && string(search.Filters) != "{}" {
		var parsed struct {
			Category string `json:"category,omitempty"`
			PriceMin *int   `json:"priceMin,omitempty"`
			PriceMax *int   `json:"priceMax,omitempty"`
			Location string `json:"location,omitempty"`
		}
		if err := json.Unmarshal(search.Filters, &parsed); err == nil {
			filters.Category = parsed.Category
			filters.PriceMin = parsed.PriceMin
			filters.PriceMax = parsed.PriceMax
			filters.Location = parsed.Location
		}
	}

	return s.searchSvc.Search(ctx, search.Query, filters, limit)
}

// ProcessAlerts runs all active saved searches and sends notifications for new matches
// This should be called periodically (e.g., every 5 minutes)
func (s *SavedSearchService) ProcessAlerts(ctx context.Context) error {
	// Get all saved searches with notifications enabled
	searches, err := s.repo.GetActiveSearches(ctx)
	if err != nil {
		return fmt.Errorf("failed to get active searches: %w", err)
	}

	log.Printf("Processing %d active saved searches", len(searches))

	for _, search := range searches {
		if err := s.processSearchAlert(ctx, &search); err != nil {
			log.Printf("Error processing saved search %d for user %s: %v", search.ID, search.UserID, err)
			continue
		}
	}

	return nil
}

// processSearchAlert processes a single saved search and notifies for new matches
func (s *SavedSearchService) processSearchAlert(ctx context.Context, search *models.SavedSearch) error {
	// Execute the search
	listings, err := s.ExecuteSearch(ctx, search)
	if err != nil {
		return fmt.Errorf("failed to execute search: %w", err)
	}

	if len(listings) == 0 {
		return nil
	}

	// Get already notified listing IDs
	notifiedIDs, err := s.repo.GetNotifiedListingIDs(ctx, search.ID)
	if err != nil {
		return fmt.Errorf("failed to get notified listings: %w", err)
	}

	// Find new listings that haven't been notified
	var newListings []models.Listing
	for _, listing := range listings {
		if !notifiedIDs[int64(listing.ID)] {
			newListings = append(newListings, listing)
		}
	}

	if len(newListings) == 0 {
		return nil
	}

	// Limit notifications to prevent spam (max 5 per search run)
	maxNotifications := 5
	if len(newListings) > maxNotifications {
		newListings = newListings[:maxNotifications]
	}

	// Send notifications for new matches
	for _, listing := range newListings {
		if err := s.notifyNewMatch(ctx, search, &listing); err != nil {
			log.Printf("Failed to notify for listing %d: %v", listing.ID, err)
			continue
		}

		// Record that we notified for this listing
		if err := s.repo.RecordNotifiedListing(ctx, search.ID, int64(listing.ID)); err != nil {
			log.Printf("Failed to record notified listing %d: %v", listing.ID, err)
		}
	}

	// Update last notified timestamp
	if err := s.repo.UpdateLastNotifiedAt(ctx, search.ID); err != nil {
		log.Printf("Failed to update last notified at for search %d: %v", search.ID, err)
	}

	return nil
}

// notifyNewMatch sends a notification for a new listing matching a saved search
func (s *SavedSearchService) notifyNewMatch(ctx context.Context, search *models.SavedSearch, listing *models.Listing) error {
	if s.notifSvc == nil {
		return nil
	}

	listingID := int64(listing.ID)
	metadata := map[string]any{
		"savedSearchId":   search.ID,
		"savedSearchName": search.Name,
		"searchQuery":     search.Query,
		"listingPrice":    listing.Price,
	}

	title := fmt.Sprintf("New match: %s", listing.Title)
	body := fmt.Sprintf("A new listing matches your saved search \"%s\"", search.Name)
	if listing.Price > 0 {
		body += fmt.Sprintf(" - $%d", listing.Price/100)
	}

	input := models.CreateNotificationInput{
		UserID:    search.UserID,
		Type:      models.NotificationTypeDealAlert,
		Title:     title,
		Body:      body,
		ListingID: &listingID,
		Metadata:  metadata,
	}

	_, err := s.notifSvc.Notify(ctx, input, true)
	return err
}

// NotifyForNewListing checks if a new listing matches any saved searches and notifies users
// This should be called when a new listing is created
func (s *SavedSearchService) NotifyForNewListing(ctx context.Context, listing *models.Listing) error {
	// Get saved searches that might match this listing
	searches, err := s.repo.GetSearchesByListingMatch(ctx, listing)
	if err != nil {
		return fmt.Errorf("failed to get matching searches: %w", err)
	}

	for _, search := range searches {
		// Skip if already notified for this listing
		wasNotified, err := s.repo.WasListingNotified(ctx, search.ID, int64(listing.ID))
		if err != nil {
			log.Printf("Error checking notification status: %v", err)
			continue
		}
		if wasNotified {
			continue
		}

		// Send notification
		if err := s.notifyNewMatch(ctx, &search, listing); err != nil {
			log.Printf("Failed to notify for new listing %d: %v", listing.ID, err)
			continue
		}

		// Record notification
		if err := s.repo.RecordNotifiedListing(ctx, search.ID, int64(listing.ID)); err != nil {
			log.Printf("Failed to record notified listing %d: %v", listing.ID, err)
		}
	}

	return nil
}

// CleanupOldResults removes old notification records to prevent unbounded growth
func (s *SavedSearchService) CleanupOldResults(ctx context.Context) error {
	// Keep results for 30 days
	count, err := s.repo.CleanupOldResults(ctx, 30*24*time.Hour)
	if err != nil {
		return err
	}
	if count > 0 {
		log.Printf("Cleaned up %d old saved search results", count)
	}
	return nil
}
