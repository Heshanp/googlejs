package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
)

// OfferRepository handles database operations for offers
type OfferRepository struct {
	db *pgxpool.Pool
}

// NewOfferRepository creates a new offer repository
func NewOfferRepository(db *pgxpool.Pool) *OfferRepository {
	return &OfferRepository{db: db}
}

// Create creates a new offer
func (r *OfferRepository) Create(ctx context.Context, input models.CreateOfferInput) (*models.Offer, error) {
	query := `
		INSERT INTO offers (listing_id, conversation_id, sender_id, recipient_id, amount, message, parent_offer_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, listing_id, conversation_id, sender_id, recipient_id, amount, status, message, 
		          parent_offer_id, expires_at, responded_at, created_at, updated_at
	`

	var o models.Offer
	err := r.db.QueryRow(ctx, query,
		input.ListingID, input.ConversationID, input.SenderID, input.RecipientID,
		input.Amount, input.Message, input.ParentOfferID,
	).Scan(
		&o.ID, &o.ListingID, &o.ConversationID, &o.SenderID, &o.RecipientID,
		&o.Amount, &o.Status, &o.Message, &o.ParentOfferID,
		&o.ExpiresAt, &o.RespondedAt, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create offer: %w", err)
	}

	return &o, nil
}

// GetByID retrieves an offer by ID with joined fields
func (r *OfferRepository) GetByID(ctx context.Context, id string) (*models.Offer, error) {
	query := `
		SELECT o.id, o.listing_id, o.conversation_id, o.sender_id, o.recipient_id,
		       o.amount, o.status, o.message, o.parent_offer_id,
		       o.expires_at, o.responded_at, o.created_at, o.updated_at,
		       u.name AS sender_name, l.title AS listing_title, l.price AS listing_price
		FROM offers o
		JOIN users u ON o.sender_id = u.id
		JOIN listings l ON o.listing_id = l.id
		WHERE o.id = $1
	`

	var o models.Offer
	err := r.db.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.ListingID, &o.ConversationID, &o.SenderID, &o.RecipientID,
		&o.Amount, &o.Status, &o.Message, &o.ParentOfferID,
		&o.ExpiresAt, &o.RespondedAt, &o.CreatedAt, &o.UpdatedAt,
		&o.SenderName, &o.ListingTitle, &o.ListingPrice,
	)
	if err != nil {
		return nil, fmt.Errorf("get offer: %w", err)
	}

	return &o, nil
}

// GetByConversationID retrieves all offers for a conversation, ordered by creation time
func (r *OfferRepository) GetByConversationID(ctx context.Context, conversationID string) ([]models.Offer, error) {
	query := `
		SELECT o.id, o.listing_id, o.conversation_id, o.sender_id, o.recipient_id,
		       o.amount, o.status, o.message, o.parent_offer_id,
		       o.expires_at, o.responded_at, o.created_at, o.updated_at,
		       u.name AS sender_name, l.title AS listing_title, l.price AS listing_price
		FROM offers o
		JOIN users u ON o.sender_id = u.id
		JOIN listings l ON o.listing_id = l.id
		WHERE o.conversation_id = $1
		ORDER BY o.created_at DESC
	`

	rows, err := r.db.Query(ctx, query, conversationID)
	if err != nil {
		return nil, fmt.Errorf("get offers by conversation: %w", err)
	}
	defer rows.Close()

	var offers []models.Offer
	for rows.Next() {
		var o models.Offer
		err := rows.Scan(
			&o.ID, &o.ListingID, &o.ConversationID, &o.SenderID, &o.RecipientID,
			&o.Amount, &o.Status, &o.Message, &o.ParentOfferID,
			&o.ExpiresAt, &o.RespondedAt, &o.CreatedAt, &o.UpdatedAt,
			&o.SenderName, &o.ListingTitle, &o.ListingPrice,
		)
		if err != nil {
			return nil, fmt.Errorf("scan offer: %w", err)
		}
		offers = append(offers, o)
	}

	return offers, nil
}

// GetPendingForConversation gets the most recent pending offer for a conversation
func (r *OfferRepository) GetPendingForConversation(ctx context.Context, conversationID string) (*models.Offer, error) {
	query := `
		SELECT o.id, o.listing_id, o.conversation_id, o.sender_id, o.recipient_id,
		       o.amount, o.status, o.message, o.parent_offer_id,
		       o.expires_at, o.responded_at, o.created_at, o.updated_at,
		       u.name AS sender_name, l.title AS listing_title, l.price AS listing_price
		FROM offers o
		JOIN users u ON o.sender_id = u.id
		JOIN listings l ON o.listing_id = l.id
		WHERE o.conversation_id = $1 AND o.status = 'pending'
		ORDER BY o.created_at DESC
		LIMIT 1
	`

	var o models.Offer
	err := r.db.QueryRow(ctx, query, conversationID).Scan(
		&o.ID, &o.ListingID, &o.ConversationID, &o.SenderID, &o.RecipientID,
		&o.Amount, &o.Status, &o.Message, &o.ParentOfferID,
		&o.ExpiresAt, &o.RespondedAt, &o.CreatedAt, &o.UpdatedAt,
		&o.SenderName, &o.ListingTitle, &o.ListingPrice,
	)
	if err != nil {
		return nil, fmt.Errorf("get pending offer: %w", err)
	}

	return &o, nil
}

// UpdateStatus updates the status of an offer
func (r *OfferRepository) UpdateStatus(ctx context.Context, id string, status models.OfferStatus) error {
	query := `UPDATE offers SET status = $1, responded_at = NOW(), updated_at = NOW() WHERE id = $2`
	result, err := r.db.Exec(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("update offer status: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("offer not found")
	}
	return nil
}

// MarkAsCountered marks an offer as countered (used when creating a counter-offer)
func (r *OfferRepository) MarkAsCountered(ctx context.Context, id string) error {
	return r.UpdateStatus(ctx, id, models.OfferStatusCountered)
}

// ExpirePendingOffers marks all expired pending offers as expired
func (r *OfferRepository) ExpirePendingOffers(ctx context.Context) (int64, error) {
	query := `
		UPDATE offers 
		SET status = 'expired', updated_at = NOW() 
		WHERE status = 'pending' AND expires_at < NOW()
	`
	result, err := r.db.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("expire pending offers: %w", err)
	}
	return result.RowsAffected(), nil
}

// GetPendingExpiredOffers retrieves pending offers that have expired (for notification purposes)
func (r *OfferRepository) GetPendingExpiredOffers(ctx context.Context) ([]models.Offer, error) {
	query := `
		SELECT o.id, o.listing_id, o.conversation_id, o.sender_id, o.recipient_id,
		       o.amount, o.status, o.message, o.parent_offer_id,
		       o.expires_at, o.responded_at, o.created_at, o.updated_at
		FROM offers o
		WHERE o.status = 'pending' AND o.expires_at < NOW()
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get expired offers: %w", err)
	}
	defer rows.Close()

	var offers []models.Offer
	for rows.Next() {
		var o models.Offer
		err := rows.Scan(
			&o.ID, &o.ListingID, &o.ConversationID, &o.SenderID, &o.RecipientID,
			&o.Amount, &o.Status, &o.Message, &o.ParentOfferID,
			&o.ExpiresAt, &o.RespondedAt, &o.CreatedAt, &o.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan expired offer: %w", err)
		}
		offers = append(offers, o)
	}

	return offers, nil
}

// Withdraw allows the sender to withdraw a pending offer
func (r *OfferRepository) Withdraw(ctx context.Context, offerID, senderID string) error {
	query := `
		UPDATE offers 
		SET status = 'withdrawn', updated_at = NOW() 
		WHERE id = $1 AND sender_id = $2 AND status = 'pending'
	`
	result, err := r.db.Exec(ctx, query, offerID, senderID)
	if err != nil {
		return fmt.Errorf("withdraw offer: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("offer not found or cannot be withdrawn")
	}
	return nil
}

// IsRecipient checks if a user is the recipient of an offer
func (r *OfferRepository) IsRecipient(ctx context.Context, offerID, userID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM offers WHERE id = $1 AND recipient_id = $2)`
	var exists bool
	err := r.db.QueryRow(ctx, query, offerID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check recipient: %w", err)
	}
	return exists, nil
}

// IsSender checks if a user is the sender of an offer
func (r *OfferRepository) IsSender(ctx context.Context, offerID, userID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM offers WHERE id = $1 AND sender_id = $2)`
	var exists bool
	err := r.db.QueryRow(ctx, query, offerID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check sender: %w", err)
	}
	return exists, nil
}

// GetLatestOfferForUserOnListing gets the latest offer made by a user on a specific listing
func (r *OfferRepository) GetLatestOfferForUserOnListing(ctx context.Context, listingID int, userID string) (*models.Offer, error) {
	query := `
		SELECT o.id, o.listing_id, o.conversation_id, o.sender_id, o.recipient_id,
		       o.amount, o.status, o.message, o.parent_offer_id,
		       o.expires_at, o.responded_at, o.created_at, o.updated_at
		FROM offers o
		WHERE o.listing_id = $1 AND o.sender_id = $2
		ORDER BY o.created_at DESC
		LIMIT 1
	`

	var o models.Offer
	err := r.db.QueryRow(ctx, query, listingID, userID).Scan(
		&o.ID, &o.ListingID, &o.ConversationID, &o.SenderID, &o.RecipientID,
		&o.Amount, &o.Status, &o.Message, &o.ParentOfferID,
		&o.ExpiresAt, &o.RespondedAt, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get latest offer: %w", err)
	}

	return &o, nil
}
