package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
)

// NotificationRepository handles database operations for notifications
type NotificationRepository struct {
	db *pgxpool.Pool
}

var notificationRepo *NotificationRepository

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// InitNotificationRepository initializes the global notification repository
func InitNotificationRepository(db *pgxpool.Pool) {
	notificationRepo = NewNotificationRepository(db)
}

// GetNotificationRepository returns the global notification repository
func GetNotificationRepository() *NotificationRepository {
	return notificationRepo
}

// Create creates a new notification and returns it
func (r *NotificationRepository) Create(ctx context.Context, input models.CreateNotificationInput) (*models.Notification, error) {
	metadataJSON, err := json.Marshal(input.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	var notification models.Notification
	var metadataBytes []byte

	err = r.db.QueryRow(ctx, `
		INSERT INTO notifications (user_id, type, title, body, listing_id, conversation_id, actor_id, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING
			id,
			user_id,
			type,
			title,
			body,
			listing_id,
			(SELECT public_id FROM listings WHERE id = notifications.listing_id) AS listing_public_id,
			conversation_id,
			actor_id,
			is_read,
			read_at,
			metadata,
			created_at
	`, input.UserID, input.Type, input.Title, input.Body, input.ListingID, input.ConversationID, input.ActorID, metadataJSON,
	).Scan(
		&notification.ID, &notification.UserID, &notification.Type, &notification.Title, &notification.Body,
		&notification.ListingID, &notification.ListingPublicID, &notification.ConversationID, &notification.ActorID,
		&notification.IsRead, &notification.ReadAt, &metadataBytes, &notification.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	if len(metadataBytes) > 0 {
		json.Unmarshal(metadataBytes, &notification.Metadata)
	}

	return &notification, nil
}

// GetByUserID returns notifications for a user with pagination
func (r *NotificationRepository) GetByUserID(ctx context.Context, userID string, limit, offset int) ([]models.Notification, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			n.id,
			n.user_id,
			n.type,
			n.title,
			n.body,
			n.listing_id,
			l.public_id AS listing_public_id,
			n.conversation_id,
			n.actor_id,
			n.is_read,
			n.read_at,
			n.metadata,
			n.created_at
		FROM notifications n
		LEFT JOIN listings l ON l.id = n.listing_id
		WHERE n.user_id = $1
		ORDER BY n.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query notifications: %w", err)
	}
	defer rows.Close()

	return scanNotifications(rows)
}

// GetUnreadByUserID returns unread notifications for a user
func (r *NotificationRepository) GetUnreadByUserID(ctx context.Context, userID string) ([]models.Notification, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			n.id,
			n.user_id,
			n.type,
			n.title,
			n.body,
			n.listing_id,
			l.public_id AS listing_public_id,
			n.conversation_id,
			n.actor_id,
			n.is_read,
			n.read_at,
			n.metadata,
			n.created_at
		FROM notifications n
		LEFT JOIN listings l ON l.id = n.listing_id
		WHERE n.user_id = $1 AND n.is_read = FALSE
		ORDER BY n.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query unread notifications: %w", err)
	}
	defer rows.Close()

	return scanNotifications(rows)
}

// GetUnreadCount returns the count of unread notifications for a user
func (r *NotificationRepository) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM notifications
		WHERE user_id = $1 AND is_read = FALSE
	`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	return count, nil
}

// MarkAsRead marks a single notification as read
func (r *NotificationRepository) MarkAsRead(ctx context.Context, notificationID int64, userID string) error {
	result, err := r.db.Exec(ctx, `
		UPDATE notifications
		SET is_read = TRUE, read_at = NOW()
		WHERE id = $1 AND user_id = $2
	`, notificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("notification not found or access denied")
	}
	return nil
}

// MarkAllAsRead marks all notifications as read for a user
func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE notifications
		SET is_read = TRUE, read_at = NOW()
		WHERE user_id = $1 AND is_read = FALSE
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}
	return nil
}

// Delete deletes a notification
func (r *NotificationRepository) Delete(ctx context.Context, notificationID int64, userID string) error {
	result, err := r.db.Exec(ctx, `
		DELETE FROM notifications
		WHERE id = $1 AND user_id = $2
	`, notificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("notification not found or access denied")
	}
	return nil
}

// DeleteOlderThan deletes notifications older than a given duration
func (r *NotificationRepository) DeleteOlderThan(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoff := time.Now().Add(-olderThan)
	result, err := r.db.Exec(ctx, `
		DELETE FROM notifications
		WHERE created_at < $1
	`, cutoff)
	if err != nil {
		return 0, fmt.Errorf("failed to delete old notifications: %w", err)
	}
	return result.RowsAffected(), nil
}

// GetUsersWithLikedListing returns user IDs and their liked price for users who liked a specific listing
func (r *NotificationRepository) GetUsersWithLikedListing(ctx context.Context, listingID int64) ([]LikedListingUser, error) {
	rows, err := r.db.Query(ctx, `
		SELECT user_id, price_when_liked
		FROM likes
		WHERE listing_id = $1
	`, listingID)
	if err != nil {
		return nil, fmt.Errorf("failed to query liked users: %w", err)
	}
	defer rows.Close()

	var users []LikedListingUser
	for rows.Next() {
		var user LikedListingUser
		if err := rows.Scan(&user.UserID, &user.PriceWhenLiked); err != nil {
			return nil, fmt.Errorf("failed to scan liked user: %w", err)
		}
		users = append(users, user)
	}
	return users, nil
}

// LikedListingUser represents a user who liked a listing with the price when they liked it
type LikedListingUser struct {
	UserID         string
	PriceWhenLiked *int
}

// GetRecentPriceDrops returns listings that have dropped in price recently
func (r *NotificationRepository) GetRecentPriceDrops(ctx context.Context, since time.Time) ([]models.PriceHistory, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, listing_id, old_price, new_price, changed_at
		FROM price_history
		WHERE changed_at >= $1 AND new_price < old_price
		ORDER BY changed_at DESC
	`, since)
	if err != nil {
		return nil, fmt.Errorf("failed to query price drops: %w", err)
	}
	defer rows.Close()

	var history []models.PriceHistory
	for rows.Next() {
		var h models.PriceHistory
		if err := rows.Scan(&h.ID, &h.ListingID, &h.OldPrice, &h.NewPrice, &h.ChangedAt); err != nil {
			return nil, fmt.Errorf("failed to scan price history: %w", err)
		}
		history = append(history, h)
	}
	return history, nil
}

// Helper function to scan notification rows
func scanNotifications(rows pgx.Rows) ([]models.Notification, error) {
	var notifications []models.Notification
	for rows.Next() {
		var n models.Notification
		var metadataBytes []byte

		if err := rows.Scan(
			&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body,
			&n.ListingID, &n.ListingPublicID, &n.ConversationID, &n.ActorID,
			&n.IsRead, &n.ReadAt, &metadataBytes, &n.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan notification: %w", err)
		}

		if len(metadataBytes) > 0 {
			json.Unmarshal(metadataBytes, &n.Metadata)
		}

		notifications = append(notifications, n)
	}
	return notifications, nil
}
