package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/ws"
)

// NotificationService handles notification generation and delivery
type NotificationService struct {
	repo       *repository.NotificationRepository
	hub        *ws.Hub
	vectorRepo *repository.VectorRepository
}

var notificationService *NotificationService

// NewNotificationService creates a new notification service
func NewNotificationService(repo *repository.NotificationRepository, hub *ws.Hub, vectorRepo *repository.VectorRepository) *NotificationService {
	return &NotificationService{
		repo:       repo,
		hub:        hub,
		vectorRepo: vectorRepo,
	}
}

// InitNotificationService initializes the global notification service
func InitNotificationService(repo *repository.NotificationRepository, hub *ws.Hub, vectorRepo *repository.VectorRepository) {
	notificationService = NewNotificationService(repo, hub, vectorRepo)
}

// GetNotificationService returns the global notification service
func GetNotificationService() *NotificationService {
	return notificationService
}

// Notify creates a notification and optionally broadcasts it via WebSocket
func (s *NotificationService) Notify(ctx context.Context, input models.CreateNotificationInput, broadcast bool) (*models.Notification, error) {
	notification, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	if broadcast && s.hub != nil {
		s.broadcastNotification(notification)
	}

	return notification, nil
}

// NotifyPriceDrop creates price drop notifications for users who liked a listing
func (s *NotificationService) NotifyPriceDrop(ctx context.Context, listingID int64, listingTitle string, oldPrice, newPrice int) error {
	// Get users who liked this listing
	users, err := s.repo.GetUsersWithLikedListing(ctx, listingID)
	if err != nil {
		return fmt.Errorf("failed to get liked users: %w", err)
	}

	if len(users) == 0 {
		return nil // No one to notify
	}

	// Get market context for richer notifications
	var marketContext string
	if s.vectorRepo != nil {
		compCtx, err := s.vectorRepo.GetSimilarListingsContext(ctx, int(listingID))
		if err == nil && compCtx != nil && compCtx.Stats.TotalCount > 0 {
			marketContext = fmt.Sprintf("Now %s - %d%% below market average", compCtx.Stats.PricePosition, 100-compCtx.Stats.Percentile)
		}
	}

	for _, user := range users {
		// Skip if user didn't have a tracked price or if they liked at a lower price
		if user.PriceWhenLiked == nil || *user.PriceWhenLiked <= newPrice {
			continue
		}

		userSavings := *user.PriceWhenLiked - newPrice
		userSavingsPercent := float64(userSavings) / float64(*user.PriceWhenLiked) * 100

		metadata := map[string]any{
			"oldPrice":         oldPrice,
			"newPrice":         newPrice,
			"priceWhenLiked":   *user.PriceWhenLiked,
			"savingsAmount":    userSavings,
			"savingsPercent":   userSavingsPercent,
			"marketComparison": marketContext,
		}

		title := fmt.Sprintf("Price Drop: %s", listingTitle)
		body := fmt.Sprintf("Dropped from $%d to $%d (%.0f%% off)", *user.PriceWhenLiked/100, newPrice/100, userSavingsPercent)
		if marketContext != "" {
			body += ". " + marketContext
		}

		input := models.CreateNotificationInput{
			UserID:    user.UserID,
			Type:      models.NotificationTypePriceDrop,
			Title:     title,
			Body:      body,
			ListingID: &listingID,
			Metadata:  metadata,
		}

		_, err := s.Notify(ctx, input, true)
		if err != nil {
			log.Printf("Failed to create price drop notification for user %s: %v", user.UserID, err)
		}
	}

	return nil
}

// NotifyDealAlert creates a deal alert notification for a user
func (s *NotificationService) NotifyDealAlert(ctx context.Context, userID string, listing *models.Listing, matchReason string) error {
	if s.vectorRepo == nil {
		return nil
	}

	// Get market comparison context
	compCtx, err := s.vectorRepo.GetSimilarListingsContext(ctx, listing.ID)
	if err != nil || compCtx == nil {
		return nil // Can't determine if it's a deal without context
	}

	// Only notify for actual deals
	if compCtx.Stats.PricePosition != "great_deal" && compCtx.Stats.PricePosition != "below_average" {
		return nil
	}

	listingID := int64(listing.ID)
	metadata := map[string]any{
		"marketAvgPrice":    compCtx.Stats.AvgPrice,
		"marketMedianPrice": compCtx.Stats.MedianPrice,
		"pricePosition":     compCtx.Stats.PricePosition,
		"percentile":        compCtx.Stats.Percentile,
		"matchReason":       matchReason,
		"similarCount":      compCtx.Stats.TotalCount,
	}

	var title, body string
	if compCtx.Stats.PricePosition == "great_deal" {
		title = fmt.Sprintf("🔥 Great Deal: %s", listing.Title)
		body = fmt.Sprintf("$%d - cheaper than %d%% of similar listings", listing.Price/100, compCtx.Stats.Percentile)
	} else {
		title = fmt.Sprintf("Good Price: %s", listing.Title)
		body = fmt.Sprintf("$%d - below average (avg: $%d)", listing.Price/100, compCtx.Stats.AvgPrice/100)
	}

	if matchReason != "" {
		body += fmt.Sprintf(" • Matches: %s", matchReason)
	}

	input := models.CreateNotificationInput{
		UserID:    userID,
		Type:      models.NotificationTypeDealAlert,
		Title:     title,
		Body:      body,
		ListingID: &listingID,
		Metadata:  metadata,
	}

	_, err = s.Notify(ctx, input, true)
	return err
}

// GetUserNotifications returns notifications for a user
func (s *NotificationService) GetUserNotifications(ctx context.Context, userID string, limit, offset int) ([]models.Notification, error) {
	return s.repo.GetByUserID(ctx, userID, limit, offset)
}

// GetUnreadCount returns the count of unread notifications
func (s *NotificationService) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	return s.repo.GetUnreadCount(ctx, userID)
}

// MarkAsRead marks a notification as read
func (s *NotificationService) MarkAsRead(ctx context.Context, notificationID int64, userID string) error {
	return s.repo.MarkAsRead(ctx, notificationID, userID)
}

// MarkAllAsRead marks all notifications as read for a user
func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID string) error {
	return s.repo.MarkAllAsRead(ctx, userID)
}

// Delete deletes a notification
func (s *NotificationService) Delete(ctx context.Context, notificationID int64, userID string) error {
	return s.repo.Delete(ctx, notificationID, userID)
}

// ProcessPriceDrops checks for recent price drops and generates notifications
// This should be called periodically (e.g., every 5 minutes)
func (s *NotificationService) ProcessPriceDrops(ctx context.Context, since time.Time) error {
	drops, err := s.repo.GetRecentPriceDrops(ctx, since)
	if err != nil {
		return fmt.Errorf("failed to get price drops: %w", err)
	}

	for _, drop := range drops {
		// Get listing title
		// Note: In production, you'd batch this or join in the query
		err := s.NotifyPriceDrop(ctx, drop.ListingID, fmt.Sprintf("Listing #%d", drop.ListingID), drop.OldPrice, drop.NewPrice)
		if err != nil {
			log.Printf("Failed to process price drop for listing %d: %v", drop.ListingID, err)
		}
	}

	return nil
}

// broadcastNotification sends a notification via WebSocket
func (s *NotificationService) broadcastNotification(notification *models.Notification) {
	if s.hub == nil {
		return
	}

	msg := &ws.OutboundMessage{
		Type:         ws.TypeNotification,
		Notification: notification,
		Timestamp:    time.Now(),
	}

	target := &ws.BroadcastTarget{
		UserIDs: []string{notification.UserID},
		Message: msg,
	}

	s.hub.Broadcast(target)
}

// CleanupOldNotifications removes notifications older than the given duration
func (s *NotificationService) CleanupOldNotifications(ctx context.Context, olderThan time.Duration) (int64, error) {
	return s.repo.DeleteOlderThan(ctx, olderThan)
}

// NotificationToPayload converts a notification to a simpler payload structure
func NotificationToPayload(n *models.Notification) map[string]any {
	return map[string]any{
		"id":              n.ID,
		"type":            string(n.Type),
		"title":           n.Title,
		"body":            n.Body,
		"listingId":       n.ListingID,
		"listingPublicId": n.ListingPublicID,
		"metadata":        n.Metadata,
		"createdAt":       n.CreatedAt,
	}
}
