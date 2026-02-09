package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
)

// ConversationRepository handles database operations for conversations
type ConversationRepository struct {
	db *pgxpool.Pool
}

// NewConversationRepository creates a new conversation repository
func NewConversationRepository(db *pgxpool.Pool) *ConversationRepository {
	return &ConversationRepository{db: db}
}

// Create creates a new conversation or returns existing one
func (r *ConversationRepository) Create(ctx context.Context, input models.CreateConversationInput) (*models.Conversation, error) {
	query := `
		INSERT INTO conversations (listing_id, buyer_id, seller_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (listing_id, buyer_id) DO UPDATE SET last_message_at = NOW()
		RETURNING id, listing_id, buyer_id, seller_id, last_message_at, created_at
	`

	var c models.Conversation
	err := r.db.QueryRow(ctx, query, input.ListingID, input.BuyerID, input.SellerID).Scan(
		&c.ID, &c.ListingID, &c.BuyerID, &c.SellerID, &c.LastMessageAt, &c.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create conversation: %w", err)
	}

	return &c, nil
}

// GetByID retrieves a conversation by ID with enriched data
func (r *ConversationRepository) GetByID(ctx context.Context, id string) (*models.Conversation, error) {
	query := `
		SELECT 
			c.id, c.listing_id, l.public_id, c.buyer_id, c.seller_id, c.last_message_at, c.created_at,
			l.title AS listing_title,
			l.price AS listing_price,
			COALESCE((SELECT url FROM listing_images WHERE listing_id = l.id ORDER BY display_order LIMIT 1), '') AS listing_image,
			COALESCE(l.status, 'active') AS listing_status,
			l.reservation_expires_at,
			l.reserved_for,
			l.user_id AS listing_seller_id,
			buyer.name AS buyer_name,
			seller.name AS seller_name,
			COALESCE(buyer.avatar, '') AS buyer_avatar,
			COALESCE(seller.avatar, '') AS seller_avatar
		FROM conversations c
		JOIN listings l ON c.listing_id = l.id
		JOIN users buyer ON c.buyer_id = buyer.id
		JOIN users seller ON c.seller_id = seller.id
		WHERE c.id = $1
	`

	var c models.Conversation
	var buyerName, sellerName, buyerAvatar, sellerAvatar string
	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.ListingID, &c.ListingPublicID, &c.BuyerID, &c.SellerID, &c.LastMessageAt, &c.CreatedAt,
		&c.ListingTitle, &c.ListingPrice, &c.ListingImage,
		&c.ListingStatus, &c.ListingReservationExpiresAt,
		&c.ListingReservedFor, &c.ListingSellerId,
		&buyerName, &sellerName, &buyerAvatar, &sellerAvatar,
	)
	if err != nil {
		return nil, fmt.Errorf("get conversation: %w", err)
	}

	// Store participant info for frontend mapping
	c.BuyerName = buyerName
	c.SellerName = sellerName
	c.BuyerAvatar = buyerAvatar
	c.SellerAvatar = sellerAvatar

	return &c, nil
}

// GetByUserID retrieves conversations for a user with enriched data (with pagination)
func (r *ConversationRepository) GetByUserID(ctx context.Context, userID string, limit, offset int) ([]models.Conversation, error) {
	// Default and max limits
	if limit <= 0 || limit > 50 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT 
			c.id, c.listing_id, l.public_id, c.buyer_id, c.seller_id, c.last_message_at, c.created_at,
			l.title AS listing_title,
			l.price AS listing_price,
			COALESCE((SELECT url FROM listing_images WHERE listing_id = l.id ORDER BY display_order LIMIT 1), '') AS listing_image,
			CASE WHEN c.buyer_id = $1 THEN seller.name ELSE buyer.name END AS other_user_name,
			CASE WHEN c.buyer_id = $1 THEN seller.avatar ELSE buyer.avatar END AS other_user_image,
			(SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.read_at IS NULL) AS unread_count,
			COALESCE((SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1), '') AS last_message
		FROM conversations c
		JOIN listings l ON c.listing_id = l.id
		JOIN users buyer ON c.buyer_id = buyer.id
		JOIN users seller ON c.seller_id = seller.id
		WHERE c.buyer_id = $1 OR c.seller_id = $1
		ORDER BY c.last_message_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("get user conversations: %w", err)
	}
	defer rows.Close()

	var conversations []models.Conversation
	for rows.Next() {
		var c models.Conversation
		err := rows.Scan(
			&c.ID, &c.ListingID, &c.ListingPublicID, &c.BuyerID, &c.SellerID, &c.LastMessageAt, &c.CreatedAt,
			&c.ListingTitle, &c.ListingPrice, &c.ListingImage, &c.OtherUserName, &c.OtherUserImage,
			&c.UnreadCount, &c.LastMessage,
		)
		if err != nil {
			return nil, fmt.Errorf("scan conversation: %w", err)
		}
		conversations = append(conversations, c)
	}

	return conversations, nil
}

// UpdateLastMessageTime updates the last_message_at timestamp
func (r *ConversationRepository) UpdateLastMessageTime(ctx context.Context, conversationID string) error {
	query := `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, conversationID)
	if err != nil {
		return fmt.Errorf("update last message time: %w", err)
	}
	return nil
}

// IsParticipant checks if a user is part of a conversation
func (r *ConversationRepository) IsParticipant(ctx context.Context, conversationID, userID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2))`
	var exists bool
	err := r.db.QueryRow(ctx, query, conversationID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check participant: %w", err)
	}
	return exists, nil
}
