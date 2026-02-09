package service

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
)

// ListingListener listens for new listing notifications from PostgreSQL
type ListingListener struct {
	db              *pgxpool.Pool
	savedSearchRepo *repository.SavedSearchRepository
	savedSearchSvc  *SavedSearchService
	listingRepo     *repository.ListingRepository
	stopChan        chan struct{}
}

// NewListingPayload represents the notification payload from PostgreSQL
type NewListingPayload struct {
	ID       int64  `json:"id"`
	Title    string `json:"title"`
	Category string `json:"category"`
	Price    int    `json:"price"`
	UserID   string `json:"user_id"`
}

// NewListingListener creates a new listing listener
func NewListingListener(
	db *pgxpool.Pool,
	savedSearchRepo *repository.SavedSearchRepository,
	savedSearchSvc *SavedSearchService,
	listingRepo *repository.ListingRepository,
) *ListingListener {
	return &ListingListener{
		db:              db,
		savedSearchRepo: savedSearchRepo,
		savedSearchSvc:  savedSearchSvc,
		listingRepo:     listingRepo,
		stopChan:        make(chan struct{}),
	}
}

// Start begins listening for new listing notifications
func (l *ListingListener) Start(ctx context.Context) {
	go l.listen(ctx)
}

// Stop stops the listener
func (l *ListingListener) Stop() {
	close(l.stopChan)
}

// listen is the main loop that listens for PostgreSQL notifications
func (l *ListingListener) listen(ctx context.Context) {
	for {
		select {
		case <-l.stopChan:
			log.Println("Listing listener stopped")
			return
		case <-ctx.Done():
			log.Println("Listing listener context cancelled")
			return
		default:
			l.connectAndListen(ctx)
			// If we get here, connection was lost - wait before reconnecting
			select {
			case <-l.stopChan:
				return
			case <-ctx.Done():
				return
			case <-time.After(5 * time.Second):
				log.Println("Reconnecting to PostgreSQL LISTEN...")
			}
		}
	}
}

// connectAndListen establishes a connection and listens for notifications
func (l *ListingListener) connectAndListen(ctx context.Context) {
	// Acquire a dedicated connection from the pool
	conn, err := l.db.Acquire(ctx)
	if err != nil {
		log.Printf("Failed to acquire connection for LISTEN: %v", err)
		return
	}
	defer conn.Release()

	// Subscribe to the new_listing channel
	_, err = conn.Exec(ctx, "LISTEN new_listing")
	if err != nil {
		log.Printf("Failed to LISTEN on new_listing: %v", err)
		return
	}

	log.Println("✅ Listening for new_listing notifications")

	// Listen for notifications
	for {
		select {
		case <-l.stopChan:
			return
		case <-ctx.Done():
			return
		default:
			// Wait for notification with timeout
			notification, err := conn.Conn().WaitForNotification(ctx)
			if err != nil {
				// Check if context was cancelled
				if ctx.Err() != nil {
					return
				}
				log.Printf("Error waiting for notification: %v", err)
				return // Exit to trigger reconnection
			}

			// Process the notification
			go l.processNotification(notification.Payload)
		}
	}
}

// processNotification handles a new listing notification
func (l *ListingListener) processNotification(payload string) {
	var listingPayload NewListingPayload
	if err := json.Unmarshal([]byte(payload), &listingPayload); err != nil {
		log.Printf("Failed to parse new listing notification: %v", err)
		return
	}

	log.Printf("📬 New listing notification: ID=%d, Title=%s", listingPayload.ID, listingPayload.Title)

	// Fetch the full listing details
	ctx := context.Background()
	listing, err := l.listingRepo.GetByID(ctx, int(listingPayload.ID))
	if err != nil {
		log.Printf("Failed to fetch listing %d for notification: %v", listingPayload.ID, err)
		return
	}

	// Notify users with matching saved searches
	if err := l.notifyMatchingSavedSearches(ctx, listing); err != nil {
		log.Printf("Failed to notify matching saved searches: %v", err)
	}
}

// notifyMatchingSavedSearches finds saved searches that match the new listing and sends notifications
func (l *ListingListener) notifyMatchingSavedSearches(ctx context.Context, listing *models.Listing) error {
	if l.savedSearchSvc == nil {
		return nil
	}

	// Use the saved search service to notify for the new listing
	return l.savedSearchSvc.NotifyForNewListing(ctx, listing)
}
