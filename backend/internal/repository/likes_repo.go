package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// LikesRepository handles database operations for listing likes
type LikesRepository struct {
	db *pgxpool.Pool
}

var likesRepo *LikesRepository

// NewLikesRepository creates a new likes repository
func NewLikesRepository(db *pgxpool.Pool) *LikesRepository {
	return &LikesRepository{db: db}
}

// InitLikesRepository initializes the global likes repository
func InitLikesRepository(db *pgxpool.Pool) {
	likesRepo = NewLikesRepository(db)
}

// GetLikesRepository returns the global likes repository
func GetLikesRepository() *LikesRepository {
	return likesRepo
}

// Like creates a like for a listing and increments like_count
// priceWhenLiked captures the current listing price for price drop notifications
func (r *LikesRepository) Like(ctx context.Context, userID string, listingID int, priceWhenLiked *int) error {
	// Use a transaction to ensure atomicity
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Insert like with price_when_liked (will fail if already exists due to UNIQUE constraint)
	_, err = tx.Exec(ctx, `
		INSERT INTO likes (user_id, listing_id, price_when_liked)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, listing_id) DO NOTHING
	`, userID, listingID, priceWhenLiked)
	if err != nil {
		return fmt.Errorf("failed to insert like: %w", err)
	}

	// Increment like_count
	_, err = tx.Exec(ctx, `
		UPDATE listings
		SET like_count = (SELECT COUNT(*) FROM likes WHERE listing_id = $1)
		WHERE id = $1
	`, listingID)
	if err != nil {
		return fmt.Errorf("failed to update like count: %w", err)
	}

	return tx.Commit(ctx)
}

// Unlike removes a like for a listing and decrements like_count
func (r *LikesRepository) Unlike(ctx context.Context, userID string, listingID int) error {
	// Use a transaction to ensure atomicity
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete the like
	result, err := tx.Exec(ctx, `
		DELETE FROM likes 
		WHERE user_id = $1 AND listing_id = $2
	`, userID, listingID)
	if err != nil {
		return fmt.Errorf("failed to delete like: %w", err)
	}

	if result.RowsAffected() == 0 {
		// Like didn't exist, nothing to do
		return nil
	}

	// Update like_count to match actual count
	_, err = tx.Exec(ctx, `
		UPDATE listings 
		SET like_count = (SELECT COUNT(*) FROM likes WHERE listing_id = $1)
		WHERE id = $1
	`, listingID)
	if err != nil {
		return fmt.Errorf("failed to update like count: %w", err)
	}

	return tx.Commit(ctx)
}

// IsLiked checks if a user has liked a listing
func (r *LikesRepository) IsLiked(ctx context.Context, userID string, listingID int) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM likes 
			WHERE user_id = $1 AND listing_id = $2
		)
	`, userID, listingID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check like status: %w", err)
	}
	return exists, nil
}

// GetLikedListingIDs returns all listing IDs that a user has liked
func (r *LikesRepository) GetLikedListingIDs(ctx context.Context, userID string) ([]int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT listing_id FROM likes 
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query liked listings: %w", err)
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("failed to scan listing id: %w", err)
		}
		ids = append(ids, id)
	}

	return ids, nil
}

// GetLikeCount returns the current like count for a listing
func (r *LikesRepository) GetLikeCount(ctx context.Context, listingID int) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(like_count, 0) FROM listings WHERE id = $1
	`, listingID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get like count: %w", err)
	}
	return count, nil
}
