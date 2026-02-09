package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
)

// ReviewRepository handles database operations for reviews
type ReviewRepository struct {
	db *pgxpool.Pool
}

// NewReviewRepository creates a new review repository
func NewReviewRepository(db *pgxpool.Pool) *ReviewRepository {
	return &ReviewRepository{db: db}
}

// Create creates a new review and updates the reviewee's rating
func (r *ReviewRepository) Create(ctx context.Context, input models.CreateReviewInput) (*models.Review, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Insert the review
	var review models.Review
	err = tx.QueryRow(ctx, `
		INSERT INTO reviews (listing_id, reviewer_id, reviewee_id, rating, comment)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, listing_id, reviewer_id, reviewee_id, rating, comment, created_at
	`, input.ListingID, input.ReviewerID, input.RevieweeID, input.Rating, input.Comment).Scan(
		&review.ID, &review.ListingID, &review.ReviewerID, &review.RevieweeID,
		&review.Rating, &review.Comment, &review.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create review: %w", err)
	}

	// Update reviewee's rating and review_count
	_, err = tx.Exec(ctx, `
		UPDATE users
		SET rating = (
			SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
			FROM reviews
			WHERE reviewee_id = $1
		),
		review_count = (
			SELECT COUNT(*)
			FROM reviews
			WHERE reviewee_id = $1
		),
		updated_at = NOW()
		WHERE id = $1
	`, input.RevieweeID)
	if err != nil {
		return nil, fmt.Errorf("failed to update user rating: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &review, nil
}

// GetByUserID retrieves all reviews for a user (as reviewee)
func (r *ReviewRepository) GetByUserID(ctx context.Context, userID string) ([]models.Review, error) {
	rows, err := r.db.Query(ctx, `
		SELECT r.id, r.listing_id, r.reviewer_id, r.reviewee_id, r.rating, r.comment, r.created_at,
		       u.name as reviewer_name, u.avatar as reviewer_avatar,
		       l.title as listing_title
		FROM reviews r
		JOIN users u ON r.reviewer_id = u.id
		JOIN listings l ON r.listing_id = l.id
		WHERE r.reviewee_id = $1
		ORDER BY r.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query reviews: %w", err)
	}
	defer rows.Close()

	var reviews []models.Review
	for rows.Next() {
		var review models.Review
		err := rows.Scan(
			&review.ID, &review.ListingID, &review.ReviewerID, &review.RevieweeID,
			&review.Rating, &review.Comment, &review.CreatedAt,
			&review.ReviewerName, &review.ReviewerAvatar, &review.ListingTitle,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan review: %w", err)
		}
		reviews = append(reviews, review)
	}

	return reviews, nil
}

// GetByListingID retrieves all reviews for a specific listing/transaction
func (r *ReviewRepository) GetByListingID(ctx context.Context, listingID int) ([]models.Review, error) {
	rows, err := r.db.Query(ctx, `
		SELECT r.id, r.listing_id, r.reviewer_id, r.reviewee_id, r.rating, r.comment, r.created_at,
		       u.name as reviewer_name, u.avatar as reviewer_avatar,
		       l.title as listing_title
		FROM reviews r
		JOIN users u ON r.reviewer_id = u.id
		JOIN listings l ON r.listing_id = l.id
		WHERE r.listing_id = $1
		ORDER BY r.created_at DESC
	`, listingID)
	if err != nil {
		return nil, fmt.Errorf("failed to query reviews: %w", err)
	}
	defer rows.Close()

	var reviews []models.Review
	for rows.Next() {
		var review models.Review
		err := rows.Scan(
			&review.ID, &review.ListingID, &review.ReviewerID, &review.RevieweeID,
			&review.Rating, &review.Comment, &review.CreatedAt,
			&review.ReviewerName, &review.ReviewerAvatar, &review.ListingTitle,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan review: %w", err)
		}
		reviews = append(reviews, review)
	}

	return reviews, nil
}

// HasReviewed checks if a user has already reviewed another user for a specific listing
func (r *ReviewRepository) HasReviewed(ctx context.Context, listingID int, reviewerID, revieweeID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM reviews
			WHERE listing_id = $1 AND reviewer_id = $2 AND reviewee_id = $3
		)
	`, listingID, reviewerID, revieweeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check existing review: %w", err)
	}
	return exists, nil
}

// GetUserStats retrieves review statistics for a user
func (r *ReviewRepository) GetUserStats(ctx context.Context, userID string) (*models.ReviewStats, error) {
	// Get total count and average
	var stats models.ReviewStats
	var avgRating *float64
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(AVG(rating), 0), COUNT(*)
		FROM reviews
		WHERE reviewee_id = $1
	`, userID).Scan(&avgRating, &stats.TotalReviews)
	if err != nil {
		return nil, fmt.Errorf("failed to get review stats: %w", err)
	}
	if avgRating != nil {
		stats.AverageRating = *avgRating
	}

	// Get breakdown by rating
	stats.Breakdown = make(map[int]int)
	for i := 1; i <= 5; i++ {
		stats.Breakdown[i] = 0
	}

	rows, err := r.db.Query(ctx, `
		SELECT rating, COUNT(*)
		FROM reviews
		WHERE reviewee_id = $1
		GROUP BY rating
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get rating breakdown: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var rating, count int
		if err := rows.Scan(&rating, &count); err != nil {
			return nil, fmt.Errorf("failed to scan breakdown: %w", err)
		}
		stats.Breakdown[rating] = count
	}

	return &stats, nil
}

// GetPendingReviews retrieves transactions where the user can still leave a review
func (r *ReviewRepository) GetPendingReviews(ctx context.Context, userID string) ([]models.PendingReview, error) {
	// Find sold listings where the user is either seller or buyer and hasn't reviewed yet
	rows, err := r.db.Query(ctx, `
		SELECT 
			l.id as listing_id,
			l.title as listing_title,
			(SELECT li.url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position LIMIT 1) as listing_image,
			CASE 
				WHEN l.user_id = $1 THEN l.reserved_for
				ELSE l.user_id
			END as other_party_id,
			u.name as other_party_name,
			u.avatar as other_party_avatar,
			CASE WHEN l.user_id = $1 THEN 'seller' ELSE 'buyer' END as role,
			l.updated_at as sold_at
		FROM listings l
		JOIN users u ON u.id = CASE 
			WHEN l.user_id = $1 THEN l.reserved_for
			ELSE l.user_id
		END
		WHERE l.status = 'sold'
		AND (l.user_id = $1 OR l.reserved_for = $1)
		AND l.reserved_for IS NOT NULL
		AND NOT EXISTS (
			SELECT 1 FROM reviews r
			WHERE r.listing_id = l.id
			AND r.reviewer_id = $1
			AND r.reviewee_id = CASE 
				WHEN l.user_id = $1 THEN l.reserved_for
				ELSE l.user_id
			END
		)
		ORDER BY l.updated_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending reviews: %w", err)
	}
	defer rows.Close()

	var pending []models.PendingReview
	for rows.Next() {
		var p models.PendingReview
		var soldAt *time.Time
		err := rows.Scan(
			&p.ListingID, &p.ListingTitle, &p.ListingImage,
			&p.OtherPartyID, &p.OtherPartyName, &p.OtherPartyAvatar,
			&p.Role, &soldAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan pending review: %w", err)
		}
		if soldAt != nil {
			p.SoldAt = soldAt.Format("2006-01-02T15:04:05Z07:00")
		}
		pending = append(pending, p)
	}

	return pending, nil
}

// Global instance
var reviewRepo *ReviewRepository

// InitReviewRepository initializes the global review repository
func InitReviewRepository(db *pgxpool.Pool) {
	reviewRepo = NewReviewRepository(db)
}

// GetReviewRepository returns the global review repository
func GetReviewRepository() *ReviewRepository {
	return reviewRepo
}
