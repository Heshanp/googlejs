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

// SavedSearchRepository handles database operations for saved searches
type SavedSearchRepository struct {
	db *pgxpool.Pool
}

var savedSearchRepo *SavedSearchRepository

// NewSavedSearchRepository creates a new saved search repository
func NewSavedSearchRepository(db *pgxpool.Pool) *SavedSearchRepository {
	return &SavedSearchRepository{db: db}
}

// InitSavedSearchRepository initializes the global saved search repository
func InitSavedSearchRepository(db *pgxpool.Pool) {
	savedSearchRepo = NewSavedSearchRepository(db)
}

// GetSavedSearchRepository returns the global saved search repository
func GetSavedSearchRepository() *SavedSearchRepository {
	return savedSearchRepo
}

// Create creates a new saved search and returns it
func (r *SavedSearchRepository) Create(ctx context.Context, userID string, input models.CreateSavedSearchInput) (*models.SavedSearch, error) {
	// Default notifyOnNew to true if not specified
	notifyOnNew := true
	if input.NotifyOnNew != nil {
		notifyOnNew = *input.NotifyOnNew
	}

	// Ensure filters is valid JSON
	filters := input.Filters
	if len(filters) == 0 {
		filters = json.RawMessage("{}")
	}

	var search models.SavedSearch
	err := r.db.QueryRow(ctx, `
		INSERT INTO saved_searches (user_id, name, query, filters, notify_on_new)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, name, query, filters, notify_on_new, last_notified_at, created_at, updated_at
	`, userID, input.Name, input.Query, filters, notifyOnNew,
	).Scan(
		&search.ID, &search.UserID, &search.Name, &search.Query, &search.Filters,
		&search.NotifyOnNew, &search.LastNotifiedAt, &search.CreatedAt, &search.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create saved search: %w", err)
	}

	return &search, nil
}

// GetByUserID returns saved searches for a user with pagination
func (r *SavedSearchRepository) GetByUserID(ctx context.Context, userID string, limit, offset int) ([]models.SavedSearch, int, error) {
	// Get total count
	var total int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM saved_searches WHERE user_id = $1
	`, userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count saved searches: %w", err)
	}

	// Get paginated results
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, name, query, filters, notify_on_new, last_notified_at, created_at, updated_at
		FROM saved_searches
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query saved searches: %w", err)
	}
	defer rows.Close()

	searches, err := scanSavedSearches(rows)
	if err != nil {
		return nil, 0, err
	}

	return searches, total, nil
}

// GetByID returns a saved search by ID for a specific user
func (r *SavedSearchRepository) GetByID(ctx context.Context, id int64, userID string) (*models.SavedSearch, error) {
	var search models.SavedSearch
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, name, query, filters, notify_on_new, last_notified_at, created_at, updated_at
		FROM saved_searches
		WHERE id = $1 AND user_id = $2
	`, id, userID).Scan(
		&search.ID, &search.UserID, &search.Name, &search.Query, &search.Filters,
		&search.NotifyOnNew, &search.LastNotifiedAt, &search.CreatedAt, &search.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("saved search not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get saved search: %w", err)
	}
	return &search, nil
}

// Update updates a saved search
func (r *SavedSearchRepository) Update(ctx context.Context, id int64, userID string, input models.UpdateSavedSearchInput) error {
	// Build dynamic update query based on provided fields
	query := "UPDATE saved_searches SET updated_at = NOW()"
	args := []any{}
	argNum := 1

	if input.Name != nil {
		query += fmt.Sprintf(", name = $%d", argNum)
		args = append(args, *input.Name)
		argNum++
	}
	if input.Query != nil {
		query += fmt.Sprintf(", query = $%d", argNum)
		args = append(args, *input.Query)
		argNum++
	}
	if input.Filters != nil {
		query += fmt.Sprintf(", filters = $%d", argNum)
		args = append(args, *input.Filters)
		argNum++
	}
	if input.NotifyOnNew != nil {
		query += fmt.Sprintf(", notify_on_new = $%d", argNum)
		args = append(args, *input.NotifyOnNew)
		argNum++
	}

	query += fmt.Sprintf(" WHERE id = $%d AND user_id = $%d", argNum, argNum+1)
	args = append(args, id, userID)

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update saved search: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("saved search not found or access denied")
	}
	return nil
}

// Delete deletes a saved search
func (r *SavedSearchRepository) Delete(ctx context.Context, id int64, userID string) error {
	result, err := r.db.Exec(ctx, `
		DELETE FROM saved_searches
		WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete saved search: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("saved search not found or access denied")
	}
	return nil
}

// GetActiveSearches returns all saved searches with notifications enabled
func (r *SavedSearchRepository) GetActiveSearches(ctx context.Context) ([]models.SavedSearch, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, name, query, filters, notify_on_new, last_notified_at, created_at, updated_at
		FROM saved_searches
		WHERE notify_on_new = TRUE
		ORDER BY last_notified_at NULLS FIRST, created_at ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query active saved searches: %w", err)
	}
	defer rows.Close()

	return scanSavedSearches(rows)
}

// RecordNotifiedListing records that a listing was notified for a saved search
func (r *SavedSearchRepository) RecordNotifiedListing(ctx context.Context, savedSearchID, listingID int64) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO saved_search_results (saved_search_id, listing_id)
		VALUES ($1, $2)
		ON CONFLICT (saved_search_id, listing_id) DO NOTHING
	`, savedSearchID, listingID)
	if err != nil {
		return fmt.Errorf("failed to record notified listing: %w", err)
	}
	return nil
}

// WasListingNotified checks if a listing was already notified for a saved search
func (r *SavedSearchRepository) WasListingNotified(ctx context.Context, savedSearchID, listingID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM saved_search_results
			WHERE saved_search_id = $1 AND listing_id = $2
		)
	`, savedSearchID, listingID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check if listing was notified: %w", err)
	}
	return exists, nil
}

// GetNotifiedListingIDs returns the listing IDs that have been notified for a saved search
func (r *SavedSearchRepository) GetNotifiedListingIDs(ctx context.Context, savedSearchID int64) (map[int64]bool, error) {
	rows, err := r.db.Query(ctx, `
		SELECT listing_id FROM saved_search_results WHERE saved_search_id = $1
	`, savedSearchID)
	if err != nil {
		return nil, fmt.Errorf("failed to query notified listings: %w", err)
	}
	defer rows.Close()

	result := make(map[int64]bool)
	for rows.Next() {
		var listingID int64
		if err := rows.Scan(&listingID); err != nil {
			return nil, fmt.Errorf("failed to scan listing ID: %w", err)
		}
		result[listingID] = true
	}
	return result, nil
}

// UpdateLastNotifiedAt updates the last notified timestamp for a saved search
func (r *SavedSearchRepository) UpdateLastNotifiedAt(ctx context.Context, savedSearchID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE saved_searches
		SET last_notified_at = NOW()
		WHERE id = $1
	`, savedSearchID)
	if err != nil {
		return fmt.Errorf("failed to update last notified at: %w", err)
	}
	return nil
}

// GetSearchesByListingMatch finds saved searches that might match a given listing
// This is used to notify users when a new listing matches their saved search
func (r *SavedSearchRepository) GetSearchesByListingMatch(ctx context.Context, listing *models.Listing) ([]models.SavedSearch, error) {
	// Query matches based on:
	// 1. Text matching: query appears in title or description
	// 2. Category matching: filter category matches listing category (or no filter set)
	// 3. Price matching: listing price within filter range (or no filter set)
	// 4. Don't notify the listing owner about their own listing
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, name, query, filters, notify_on_new, last_notified_at, created_at, updated_at
		FROM saved_searches
		WHERE notify_on_new = TRUE
		AND user_id != $5
		AND (
			-- Text matching: query appears in title or description (case-insensitive)
			$1 ILIKE '%' || query || '%'
			OR $2 ILIKE '%' || query || '%'
		)
		AND (
			-- Category filter: matches or not set
			filters->>'category' IS NULL
			OR filters->>'category' = ''
			OR LOWER(filters->>'category') = LOWER($3)
		)
		AND (
			-- Price min filter: listing price >= min or not set
			(filters->>'priceMin')::int IS NULL
			OR $4 >= (filters->>'priceMin')::int
		)
		AND (
			-- Price max filter: listing price <= max or not set
			(filters->>'priceMax')::int IS NULL
			OR $4 <= (filters->>'priceMax')::int
		)
	`, listing.Title, listing.Description, listing.Category, listing.Price, listing.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to query matching saved searches: %w", err)
	}
	defer rows.Close()

	return scanSavedSearches(rows)
}

// CleanupOldResults removes old notified listing records to prevent unbounded growth
func (r *SavedSearchRepository) CleanupOldResults(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoff := time.Now().Add(-olderThan)
	result, err := r.db.Exec(ctx, `
		DELETE FROM saved_search_results
		WHERE notified_at < $1
	`, cutoff)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup old results: %w", err)
	}
	return result.RowsAffected(), nil
}

// Helper function to scan saved search rows
func scanSavedSearches(rows pgx.Rows) ([]models.SavedSearch, error) {
	var searches []models.SavedSearch
	for rows.Next() {
		var s models.SavedSearch
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.Name, &s.Query, &s.Filters,
			&s.NotifyOnNew, &s.LastNotifiedAt, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan saved search: %w", err)
		}
		searches = append(searches, s)
	}
	return searches, nil
}
