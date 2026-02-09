package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
)

var (
	ErrUserNotFound = errors.New("user not found")
)

// UserRepository handles database operations for users
type UserRepository struct {
	db *pgxpool.Pool
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

// FindByGoogleID finds a user by their Google ID
func (r *UserRepository) FindByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, email, name, avatar, google_id, phone, is_verified, rating, review_count,
		       location_city, location_suburb, location_region, violation_count, is_flagged, created_at, updated_at
		FROM users
		WHERE google_id = $1
	`, googleID).Scan(
		&user.ID, &user.Email, &user.Name, &user.Avatar, &user.GoogleID,
		&user.Phone, &user.IsVerified, &user.Rating, &user.ReviewCount,
		&user.LocationCity, &user.LocationSuburb, &user.LocationRegion, &user.ViolationCount, &user.IsFlagged,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

// FindByEmail finds a user by their email
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, email, name, avatar, google_id, phone, is_verified, rating, review_count,
		       location_city, location_suburb, location_region, violation_count, is_flagged, created_at, updated_at
		FROM users
		WHERE email = $1
	`, email).Scan(
		&user.ID, &user.Email, &user.Name, &user.Avatar, &user.GoogleID,
		&user.Phone, &user.IsVerified, &user.Rating, &user.ReviewCount,
		&user.LocationCity, &user.LocationSuburb, &user.LocationRegion, &user.ViolationCount, &user.IsFlagged,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

// GetByID finds a user by their ID
func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, email, name, avatar, google_id, phone, is_verified, rating, review_count,
		       location_city, location_suburb, location_region, violation_count, is_flagged, created_at, updated_at
		FROM users
		WHERE id = $1
	`, id).Scan(
		&user.ID, &user.Email, &user.Name, &user.Avatar, &user.GoogleID,
		&user.Phone, &user.IsVerified, &user.Rating, &user.ReviewCount,
		&user.LocationCity, &user.LocationSuburb, &user.LocationRegion, &user.ViolationCount, &user.IsFlagged,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	return r.db.QueryRow(ctx, `
		INSERT INTO users (email, name, avatar, google_id, phone, is_verified, rating, review_count,
		                   location_city, location_suburb, location_region, violation_count, is_flagged, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id
	`,
		user.Email, user.Name, user.Avatar, user.GoogleID, user.Phone,
		user.IsVerified, user.Rating, user.ReviewCount,
		user.LocationCity, user.LocationSuburb, user.LocationRegion,
		user.ViolationCount, user.IsFlagged, user.CreatedAt, user.UpdatedAt,
	).Scan(&user.ID)
}

// Update updates an existing user
func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()

	_, err := r.db.Exec(ctx, `
		UPDATE users
		SET email = $1, name = $2, avatar = $3, google_id = $4, phone = $5,
		    is_verified = $6, rating = $7, review_count = $8,
		    location_city = $9, location_suburb = $10, location_region = $11,
		    violation_count = $12, is_flagged = $13, updated_at = $14
		WHERE id = $15
	`,
		user.Email, user.Name, user.Avatar, user.GoogleID, user.Phone,
		user.IsVerified, user.Rating, user.ReviewCount,
		user.LocationCity, user.LocationSuburb, user.LocationRegion,
		user.ViolationCount, user.IsFlagged, user.UpdatedAt, user.ID,
	)
	return err
}

// IncrementViolationCount increments a user's violation count and applies auto-flagging threshold.
func (r *UserRepository) IncrementViolationCount(ctx context.Context, userID string, autoFlagThreshold int) (int, bool, error) {
	if autoFlagThreshold <= 0 {
		autoFlagThreshold = 3
	}

	var count int
	var isFlagged bool

	err := r.db.QueryRow(ctx, `
		UPDATE users
		SET violation_count = violation_count + 1,
		    is_flagged = CASE
		        WHEN violation_count + 1 >= $2 THEN TRUE
		        ELSE is_flagged
		    END,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING violation_count, is_flagged
	`, userID, autoFlagThreshold).Scan(&count, &isFlagged)
	if err != nil {
		return 0, false, fmt.Errorf("increment violation count: %w", err)
	}

	return count, isFlagged, nil
}

// SetFlagStatus sets the user's flagged status.
func (r *UserRepository) SetFlagStatus(ctx context.Context, userID string, flagged bool) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users
		SET is_flagged = $2, updated_at = NOW()
		WHERE id = $1
	`, userID, flagged)
	if err != nil {
		return fmt.Errorf("set flag status: %w", err)
	}
	return nil
}

// DeleteAccount deletes a user and their related data.
//
// The current schema enforces listings.user_id NOT NULL, so we hard-delete the user's listings first,
// then delete the user (which cascades conversations/messages/offers/reviews).
func (r *UserRepository) DeleteAccount(ctx context.Context, userID string) error {
	if r == nil || r.db == nil {
		return fmt.Errorf("user repository not initialized")
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Release any reservations held by this user so listings don't remain stuck in "reserved".
	_, err = tx.Exec(ctx, `
		UPDATE listings
		SET status = 'active',
		    reserved_for = NULL,
		    reserved_at = NULL,
		    reservation_expires_at = NULL,
		    updated_at = NOW()
		WHERE status = 'reserved' AND reserved_for = $1
	`, userID)
	if err != nil {
		return fmt.Errorf("release reservations: %w", err)
	}

	// Delete listings owned by the user (cascades listing_images, conversations (by listing_id), offers, reviews, etc.).
	_, err = tx.Exec(ctx, `DELETE FROM listings WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete listings: %w", err)
	}

	// Clean up tables that store user_id as TEXT/VARCHAR (no FK).
	if _, err := tx.Exec(ctx, `DELETE FROM likes WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("delete likes: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM notifications WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("delete notifications: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM saved_searches WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("delete saved searches: %w", err)
	}

	// Delete user (cascades conversations/messages/offers/reviews where FKs are configured with ON DELETE CASCADE).
	result, err := tx.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// Global instance
var userRepo *UserRepository

// InitUserRepository initializes the global user repository
func InitUserRepository(db *pgxpool.Pool) {
	userRepo = NewUserRepository(db)
}

// GetUserRepository returns the global user repository
func GetUserRepository() *UserRepository {
	return userRepo
}
