package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
)

// MessageRepository handles database operations for messages
type MessageRepository struct {
	db *pgxpool.Pool
}

// NewMessageRepository creates a new message repository
func NewMessageRepository(db *pgxpool.Pool) *MessageRepository {
	return &MessageRepository{db: db}
}

// Create creates a new message
func (r *MessageRepository) Create(ctx context.Context, input models.CreateMessageInput) (*models.Message, error) {
	query := `
		INSERT INTO messages (conversation_id, sender_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, conversation_id, sender_id, content, read_at, created_at
	`

	var m models.Message
	err := r.db.QueryRow(ctx, query, input.ConversationID, input.SenderID, input.Content).Scan(
		&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.ReadAt, &m.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create message: %w", err)
	}

	return &m, nil
}

// GetByConversationID retrieves messages for a conversation with pagination
func (r *MessageRepository) GetByConversationID(ctx context.Context, conversationID string, limit, offset int) ([]models.Message, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT id, conversation_id, sender_id, content, read_at, created_at
		FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, conversationID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("get messages: %w", err)
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var m models.Message
		err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.ReadAt, &m.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		messages = append(messages, m)
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

// MarkAsRead marks messages as read up to a specific message
func (r *MessageRepository) MarkAsRead(ctx context.Context, conversationID, userID, messageID string) error {
	query := `
		UPDATE messages
		SET read_at = NOW()
		WHERE conversation_id = $1
		  AND sender_id != $2
		  AND read_at IS NULL
		  AND created_at <= (SELECT created_at FROM messages WHERE id = $3)
	`
	_, err := r.db.Exec(ctx, query, conversationID, userID, messageID)
	if err != nil {
		return fmt.Errorf("mark as read: %w", err)
	}
	return nil
}

// MarkAllAsRead marks all messages in a conversation as read for a user
func (r *MessageRepository) MarkAllAsRead(ctx context.Context, conversationID, userID string) error {
	query := `
		UPDATE messages
		SET read_at = NOW()
		WHERE conversation_id = $1
		  AND sender_id != $2
		  AND read_at IS NULL
	`
	_, err := r.db.Exec(ctx, query, conversationID, userID)
	if err != nil {
		return fmt.Errorf("mark all as read: %w", err)
	}
	return nil
}

// GetUnreadCount returns the count of unread messages for a user in a conversation
func (r *MessageRepository) GetUnreadCount(ctx context.Context, conversationID, userID string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM messages
		WHERE conversation_id = $1
		  AND sender_id != $2
		  AND read_at IS NULL
	`
	var count int
	err := r.db.QueryRow(ctx, query, conversationID, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get unread count: %w", err)
	}
	return count, nil
}

// GetLatestMessageIDFromOtherUser returns the most recent message ID from the other participant.
func (r *MessageRepository) GetLatestMessageIDFromOtherUser(ctx context.Context, conversationID, userID string) (string, error) {
	query := `
		SELECT id
		FROM messages
		WHERE conversation_id = $1
		  AND sender_id != $2
		ORDER BY created_at DESC
		LIMIT 1
	`
	var id string
	err := r.db.QueryRow(ctx, query, conversationID, userID).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", fmt.Errorf("get latest message id: %w", err)
	}
	return id, nil
}
