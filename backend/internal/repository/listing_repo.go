package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
)

var (
	ErrInvalidListingID = errors.New("invalid listing ID")
	ErrListingNotFound  = errors.New("listing not found")
)

// ListingRepository handles database operations for listings
type ListingRepository struct {
	db        *pgxpool.Pool
	imageRepo *ImageRepository
}

// NewListingRepository creates a new listing repository
func NewListingRepository(db *pgxpool.Pool) *ListingRepository {
	return &ListingRepository{
		db:        db,
		imageRepo: NewImageRepository(db),
	}
}

// ResolveID resolves a listing public UUID to the internal numeric id.
func (r *ListingRepository) ResolveID(ctx context.Context, listingPublicID string) (int, error) {
	if listingPublicID == "" {
		return 0, ErrInvalidListingID
	}

	// Validate UUID format before hitting DB.
	if _, err := uuid.Parse(listingPublicID); err != nil {
		return 0, ErrInvalidListingID
	}

	var id int
	err := r.db.QueryRow(ctx, `
		SELECT id
		FROM listings
		WHERE public_id = $1 AND status != 'deleted'
	`, listingPublicID).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 0, ErrListingNotFound
		}
		return 0, fmt.Errorf("failed to resolve listing ID: %w", err)
	}

	return id, nil
}

// GetAll retrieves all active, non-expired listings
func (r *ListingRepository) GetAll(ctx context.Context, limit int) ([]models.Listing, error) {
	query := `
		SELECT id, public_id, user_id, title, COALESCE(subtitle, ''), description, price, COALESCE(quantity, 1), category, COALESCE(condition, 'Good'), location, status,
		       category_fields, shipping_options, payment_methods, returns_policy,
		       created_at, updated_at,
		       reserved_for, reserved_at, reservation_expires_at, COALESCE(view_count, 0), COALESCE(like_count, 0), expires_at,
		       moderation_status, COALESCE(moderation_severity, ''), COALESCE(moderation_summary, ''), COALESCE(moderation_flag_profile, false),
		       COALESCE(moderation_fingerprint, ''), moderation_checked_at, moderation_override_by, moderation_override_at
		FROM listings
		WHERE status = 'active'
		  AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY created_at DESC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query listings: %w", err)
	}
	defer rows.Close()

	var listings []models.Listing
	for rows.Next() {
		var l models.Listing
		var categoryFieldsJSON, shippingOptionsJSON, paymentMethodsJSON, returnsPolicyJSON []byte
		err := rows.Scan(
			&l.ID, &l.PublicID, &l.UserID, &l.Title, &l.Subtitle, &l.Description, &l.Price, &l.Quantity, &l.Category, &l.Condition, &l.Location, &l.Status,
			&categoryFieldsJSON, &shippingOptionsJSON, &paymentMethodsJSON, &returnsPolicyJSON,
			&l.CreatedAt, &l.UpdatedAt,
			&l.ReservedFor, &l.ReservedAt, &l.ReservationExpiresAt, &l.ViewCount, &l.LikeCount, &l.ExpiresAt,
			&l.ModerationStatus, &l.ModerationSeverity, &l.ModerationSummary, &l.ModerationFlagProfile,
			&l.ModerationFingerprint, &l.ModerationCheckedAt, &l.ModerationOverrideBy, &l.ModerationOverrideAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan listing: %w", err)
		}

		// Parse JSONB fields
		parseJSONField(categoryFieldsJSON, &l.CategoryFields)
		parseJSONField(shippingOptionsJSON, &l.ShippingOptions)
		parseJSONField(paymentMethodsJSON, &l.PaymentMethods)
		parseJSONField(returnsPolicyJSON, &l.ReturnsPolicy)

		// Fetch images for this listing
		images, err := r.imageRepo.GetByListingID(ctx, l.ID)
		if err == nil {
			l.Images = images
		}

		listings = append(listings, l)
	}

	return listings, nil
}

// GetByUserID retrieves all listings for a specific user (including expired, so owner can see them)
func (r *ListingRepository) GetByUserID(ctx context.Context, userID string) ([]models.Listing, error) {
	query := `
		SELECT id, public_id, user_id, title, COALESCE(subtitle, ''), description, price, COALESCE(quantity, 1), category, COALESCE(condition, 'Good'), location, status,
		       category_fields, shipping_options, payment_methods, returns_policy,
		       created_at, updated_at,
		       reserved_for, reserved_at, reservation_expires_at, COALESCE(view_count, 0), COALESCE(like_count, 0), expires_at,
		       moderation_status, COALESCE(moderation_severity, ''), COALESCE(moderation_summary, ''), COALESCE(moderation_flag_profile, false),
		       COALESCE(moderation_fingerprint, ''), moderation_checked_at, moderation_override_by, moderation_override_at
		FROM listings
		WHERE user_id = $1 AND status != 'deleted'
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user listings: %w", err)
	}
	defer rows.Close()

	var listings []models.Listing
	for rows.Next() {
		var l models.Listing
		var categoryFieldsJSON, shippingOptionsJSON, paymentMethodsJSON, returnsPolicyJSON []byte
		err := rows.Scan(
			&l.ID, &l.PublicID, &l.UserID, &l.Title, &l.Subtitle, &l.Description, &l.Price, &l.Quantity, &l.Category, &l.Condition, &l.Location, &l.Status,
			&categoryFieldsJSON, &shippingOptionsJSON, &paymentMethodsJSON, &returnsPolicyJSON,
			&l.CreatedAt, &l.UpdatedAt,
			&l.ReservedFor, &l.ReservedAt, &l.ReservationExpiresAt, &l.ViewCount, &l.LikeCount, &l.ExpiresAt,
			&l.ModerationStatus, &l.ModerationSeverity, &l.ModerationSummary, &l.ModerationFlagProfile,
			&l.ModerationFingerprint, &l.ModerationCheckedAt, &l.ModerationOverrideBy, &l.ModerationOverrideAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan listing: %w", err)
		}

		// Parse JSONB fields
		parseJSONField(categoryFieldsJSON, &l.CategoryFields)
		parseJSONField(shippingOptionsJSON, &l.ShippingOptions)
		parseJSONField(paymentMethodsJSON, &l.PaymentMethods)
		parseJSONField(returnsPolicyJSON, &l.ReturnsPolicy)

		// Fetch images for this listing
		images, err := r.imageRepo.GetByListingID(ctx, l.ID)
		if err == nil {
			l.Images = images
		}

		listings = append(listings, l)
	}

	return listings, nil
}

// GetPublicByUserID retrieves only publicly visible listings for a specific user.
func (r *ListingRepository) GetPublicByUserID(ctx context.Context, userID string) ([]models.Listing, error) {
	query := `
		SELECT id, public_id, user_id, title, COALESCE(subtitle, ''), description, price, COALESCE(quantity, 1), category, COALESCE(condition, 'Good'), location, status,
		       category_fields, shipping_options, payment_methods, returns_policy,
		       created_at, updated_at,
		       reserved_for, reserved_at, reservation_expires_at, COALESCE(view_count, 0), COALESCE(like_count, 0), expires_at,
		       moderation_status, COALESCE(moderation_severity, ''), COALESCE(moderation_summary, ''), COALESCE(moderation_flag_profile, false),
		       COALESCE(moderation_fingerprint, ''), moderation_checked_at, moderation_override_by, moderation_override_at
		FROM listings
		WHERE user_id = $1
		  AND status IN ('active', 'reserved', 'sold', 'expired')
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query public user listings: %w", err)
	}
	defer rows.Close()

	var listings []models.Listing
	for rows.Next() {
		var l models.Listing
		var categoryFieldsJSON, shippingOptionsJSON, paymentMethodsJSON, returnsPolicyJSON []byte
		err := rows.Scan(
			&l.ID, &l.PublicID, &l.UserID, &l.Title, &l.Subtitle, &l.Description, &l.Price, &l.Quantity, &l.Category, &l.Condition, &l.Location, &l.Status,
			&categoryFieldsJSON, &shippingOptionsJSON, &paymentMethodsJSON, &returnsPolicyJSON,
			&l.CreatedAt, &l.UpdatedAt,
			&l.ReservedFor, &l.ReservedAt, &l.ReservationExpiresAt, &l.ViewCount, &l.LikeCount, &l.ExpiresAt,
			&l.ModerationStatus, &l.ModerationSeverity, &l.ModerationSummary, &l.ModerationFlagProfile,
			&l.ModerationFingerprint, &l.ModerationCheckedAt, &l.ModerationOverrideBy, &l.ModerationOverrideAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan listing: %w", err)
		}

		parseJSONField(categoryFieldsJSON, &l.CategoryFields)
		parseJSONField(shippingOptionsJSON, &l.ShippingOptions)
		parseJSONField(paymentMethodsJSON, &l.PaymentMethods)
		parseJSONField(returnsPolicyJSON, &l.ReturnsPolicy)

		images, err := r.imageRepo.GetByListingID(ctx, l.ID)
		if err == nil {
			l.Images = images
		}

		listings = append(listings, l)
	}

	return listings, nil
}

// GetByID retrieves a listing by ID
func (r *ListingRepository) GetByID(ctx context.Context, id int) (*models.Listing, error) {
	query := `
		SELECT id, public_id, user_id, title, COALESCE(subtitle, ''), description, price, COALESCE(quantity, 1), category, COALESCE(condition, 'Good'), location, status,
		       category_fields, shipping_options, payment_methods, returns_policy,
		       created_at, updated_at,
		       reserved_for, reserved_at, reservation_expires_at, COALESCE(view_count, 0), COALESCE(like_count, 0), expires_at,
		       moderation_status, COALESCE(moderation_severity, ''), COALESCE(moderation_summary, ''), COALESCE(moderation_flag_profile, false),
		       COALESCE(moderation_fingerprint, ''), moderation_checked_at, moderation_override_by, moderation_override_at
		FROM listings
		WHERE id = $1 AND status != 'deleted'
	`

	var l models.Listing
	var categoryFieldsJSON, shippingOptionsJSON, paymentMethodsJSON, returnsPolicyJSON []byte
	err := r.db.QueryRow(ctx, query, id).Scan(
		&l.ID, &l.PublicID, &l.UserID, &l.Title, &l.Subtitle, &l.Description, &l.Price, &l.Quantity, &l.Category, &l.Condition, &l.Location, &l.Status,
		&categoryFieldsJSON, &shippingOptionsJSON, &paymentMethodsJSON, &returnsPolicyJSON,
		&l.CreatedAt, &l.UpdatedAt,
		&l.ReservedFor, &l.ReservedAt, &l.ReservationExpiresAt, &l.ViewCount, &l.LikeCount, &l.ExpiresAt,
		&l.ModerationStatus, &l.ModerationSeverity, &l.ModerationSummary, &l.ModerationFlagProfile,
		&l.ModerationFingerprint, &l.ModerationCheckedAt, &l.ModerationOverrideBy, &l.ModerationOverrideAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get listing: %w", err)
	}

	// Parse JSONB fields
	parseJSONField(categoryFieldsJSON, &l.CategoryFields)
	parseJSONField(shippingOptionsJSON, &l.ShippingOptions)
	parseJSONField(paymentMethodsJSON, &l.PaymentMethods)
	parseJSONField(returnsPolicyJSON, &l.ReturnsPolicy)

	// Fetch images for this listing
	images, err := r.imageRepo.GetByListingID(ctx, l.ID)
	if err == nil {
		l.Images = images
	}

	return &l, nil
}

// Helper to parse JSON fields safely
func parseJSONField(data []byte, target *map[string]interface{}) {
	if len(data) > 0 {
		if err := json.Unmarshal(data, target); err != nil {
			// Initialize empty map if parse error
			*target = make(map[string]interface{})
		}
	} else {
		*target = make(map[string]interface{})
	}
}

// Create creates a new listing
func (r *ListingRepository) Create(ctx context.Context, listing *models.Listing) error {
	// Marshal fields to JSON
	categoryFieldsJSON := mustMarshal(listing.CategoryFields)
	shippingOptionsJSON := mustMarshal(listing.ShippingOptions)
	paymentMethodsJSON := mustMarshal(listing.PaymentMethods)
	returnsPolicyJSON := mustMarshal(listing.ReturnsPolicy)

	query := `
		INSERT INTO listings (
			user_id, title, subtitle, description, price, quantity, category, condition, location, status,
			category_fields, shipping_options, payment_methods, returns_policy, expires_at,
			moderation_status, moderation_severity, moderation_summary, moderation_flag_profile, moderation_fingerprint, moderation_checked_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		RETURNING id, public_id, created_at, updated_at, expires_at
	`

	// Default status to 'active' if not set
	if listing.Status == "" {
		listing.Status = string(models.ListingStatusActive)
	}
	if listing.ModerationStatus == "" {
		listing.ModerationStatus = models.ListingModerationStatusNotReviewed
	}
	// Default quantity to 1 if not set
	if listing.Quantity <= 0 {
		listing.Quantity = 1
	}

	// Default condition to 'Good' if not set
	if listing.Condition == "" {
		listing.Condition = "Good"
	}

	err := r.db.QueryRow(
		ctx, query,
		listing.UserID, listing.Title, listing.Subtitle, listing.Description, listing.Price, listing.Quantity, listing.Category, listing.Condition, listing.Location,
		listing.Status, categoryFieldsJSON, shippingOptionsJSON, paymentMethodsJSON, returnsPolicyJSON, listing.ExpiresAt,
		listing.ModerationStatus, nullableString(strings.TrimSpace(string(listing.ModerationSeverity))),
		nullableString(strings.TrimSpace(listing.ModerationSummary)), listing.ModerationFlagProfile,
		nullableString(strings.TrimSpace(listing.ModerationFingerprint)), listing.ModerationCheckedAt,
	).Scan(&listing.ID, &listing.PublicID, &listing.CreatedAt, &listing.UpdatedAt, &listing.ExpiresAt)

	if err != nil {
		return fmt.Errorf("failed to create listing: %w", err)
	}

	return nil
}

// Update updates an existing listing
func (r *ListingRepository) Update(ctx context.Context, listing *models.Listing) error {
	// Marshal fields to JSON
	categoryFieldsJSON := mustMarshal(listing.CategoryFields)
	shippingOptionsJSON := mustMarshal(listing.ShippingOptions)
	paymentMethodsJSON := mustMarshal(listing.PaymentMethods)
	returnsPolicyJSON := mustMarshal(listing.ReturnsPolicy)

	query := `
		UPDATE listings
		SET title = $1, subtitle = $2, description = $3, price = $4, quantity = $5, category = $6,
		    condition = $7, location = $8, category_fields = $9,
		    shipping_options = $10, payment_methods = $11, returns_policy = $12, expires_at = $13,
		    status = 'pending_review',
		    moderation_status = 'pending_review',
		    moderation_severity = NULL,
		    moderation_summary = 'Publishing is taking longer than usual. Listing is pending review.',
		    moderation_flag_profile = FALSE,
		    moderation_checked_at = NULL,
		    moderation_override_by = NULL,
		    moderation_override_at = NULL,
		    updated_at = NOW()
		WHERE id = $14
	`

	_, err := r.db.Exec(
		ctx, query,
		listing.Title, listing.Subtitle, listing.Description, listing.Price, listing.Quantity, listing.Category, listing.Condition, listing.Location,
		categoryFieldsJSON, shippingOptionsJSON, paymentMethodsJSON, returnsPolicyJSON, listing.ExpiresAt,
		listing.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update listing: %w", err)
	}

	return nil
}

// UpdateModerationOutcome updates publication status and moderation metadata in a single write.
func (r *ListingRepository) UpdateModerationOutcome(
	ctx context.Context,
	listingID int,
	listingStatus models.ListingStatus,
	moderationStatus models.ListingModerationStatus,
	result *models.ModerationResult,
	fingerprint string,
) error {
	severity := ""
	summary := ""
	flagProfile := false
	if result != nil {
		severity = string(result.Severity)
		summary = result.Summary
		flagProfile = result.FlagProfile
	}

	query := `
		UPDATE listings
		SET status = $2,
		    moderation_status = $3,
		    moderation_severity = $4,
		    moderation_summary = $5,
		    moderation_flag_profile = $6,
		    moderation_fingerprint = $7,
		    moderation_checked_at = NOW(),
		    moderation_override_by = NULL,
		    moderation_override_at = NULL,
		    updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(
		ctx,
		query,
		listingID,
		string(listingStatus),
		string(moderationStatus),
		nullableString(severity),
		nullableString(summary),
		flagProfile,
		nullableString(fingerprint),
	)
	if err != nil {
		return fmt.Errorf("update moderation outcome: %w", err)
	}

	return nil
}

// ApplyModerationOverride applies a manual admin decision for a listing.
func (r *ListingRepository) ApplyModerationOverride(ctx context.Context, listingID int, approve bool, adminUserID, summary string) error {
	listingStatus := string(models.ListingStatusBlocked)
	moderationStatus := string(models.ListingModerationStatusRejected)
	if approve {
		listingStatus = string(models.ListingStatusActive)
		moderationStatus = string(models.ListingModerationStatusApproved)
	}

	query := `
		UPDATE listings
		SET status = $2,
		    moderation_status = $3,
		    moderation_summary = COALESCE(NULLIF($4, ''), moderation_summary),
		    moderation_override_by = $5,
		    moderation_override_at = NOW(),
		    moderation_checked_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, listingID, listingStatus, moderationStatus, strings.TrimSpace(summary), adminUserID)
	if err != nil {
		return fmt.Errorf("apply moderation override: %w", err)
	}

	return nil
}

// GetModerationQueue returns listings currently awaiting or requiring moderation action.
func (r *ListingRepository) GetModerationQueue(ctx context.Context, statuses []string, limit, offset int) ([]models.Listing, error) {
	if len(statuses) == 0 {
		statuses = []string{string(models.ListingStatusPendingReview), string(models.ListingStatusBlocked)}
	}
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT id, public_id, user_id, title, COALESCE(subtitle, ''), description, price, COALESCE(quantity, 1), category, COALESCE(condition, 'Good'), location, status,
		       category_fields, shipping_options, payment_methods, returns_policy,
		       created_at, updated_at,
		       reserved_for, reserved_at, reservation_expires_at, COALESCE(view_count, 0), COALESCE(like_count, 0), expires_at,
		       moderation_status, COALESCE(moderation_severity, ''), COALESCE(moderation_summary, ''), COALESCE(moderation_flag_profile, false),
		       COALESCE(moderation_fingerprint, ''), moderation_checked_at, moderation_override_by, moderation_override_at
		FROM listings
		WHERE status = ANY($1)
		ORDER BY updated_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, statuses, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query moderation queue: %w", err)
	}
	defer rows.Close()

	var listings []models.Listing
	for rows.Next() {
		var l models.Listing
		var categoryFieldsJSON, shippingOptionsJSON, paymentMethodsJSON, returnsPolicyJSON []byte
		err := rows.Scan(
			&l.ID, &l.PublicID, &l.UserID, &l.Title, &l.Subtitle, &l.Description, &l.Price, &l.Quantity, &l.Category, &l.Condition, &l.Location, &l.Status,
			&categoryFieldsJSON, &shippingOptionsJSON, &paymentMethodsJSON, &returnsPolicyJSON,
			&l.CreatedAt, &l.UpdatedAt,
			&l.ReservedFor, &l.ReservedAt, &l.ReservationExpiresAt, &l.ViewCount, &l.LikeCount, &l.ExpiresAt,
			&l.ModerationStatus, &l.ModerationSeverity, &l.ModerationSummary, &l.ModerationFlagProfile,
			&l.ModerationFingerprint, &l.ModerationCheckedAt, &l.ModerationOverrideBy, &l.ModerationOverrideAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan moderation listing: %w", err)
		}

		parseJSONField(categoryFieldsJSON, &l.CategoryFields)
		parseJSONField(shippingOptionsJSON, &l.ShippingOptions)
		parseJSONField(paymentMethodsJSON, &l.PaymentMethods)
		parseJSONField(returnsPolicyJSON, &l.ReturnsPolicy)

		images, imgErr := r.imageRepo.GetByListingID(ctx, l.ID)
		if imgErr == nil {
			l.Images = images
		}

		listings = append(listings, l)
	}

	return listings, nil
}

// Helper for marshalling JSON
func mustMarshal(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	return b
}

func nullableString(s string) interface{} {
	trimmed := strings.TrimSpace(s)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

// Delete soft deletes a listing by setting status to 'deleted'
func (r *ListingRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE listings SET status = 'deleted' WHERE id = $1`

	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete listing: %w", err)
	}

	return nil
}

// UpdateStatus updates only the status of a listing
func (r *ListingRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	query := `UPDATE listings SET status = $1, updated_at = NOW() WHERE id = $2`

	result, err := r.db.Exec(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update listing status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("listing not found")
	}

	return nil
}

// SetReservation reserves a listing for a buyer with 48-hour expiration
func (r *ListingRepository) SetReservation(ctx context.Context, listingID int, buyerID string) error {
	query := `
		UPDATE listings
		SET status = 'reserved',
		    reserved_for = $1,
		    reserved_at = NOW(),
		    reservation_expires_at = NOW() + INTERVAL '48 hours',
		    updated_at = NOW()
		WHERE id = $2 AND status = 'active'
	`

	result, err := r.db.Exec(ctx, query, buyerID, listingID)
	if err != nil {
		return fmt.Errorf("failed to set reservation: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("listing not found or not available")
	}

	return nil
}

// CancelReservation releases a reservation and returns listing to active status
func (r *ListingRepository) CancelReservation(ctx context.Context, listingID int) error {
	query := `
		UPDATE listings
		SET status = 'active',
		    reserved_for = NULL,
		    reserved_at = NULL,
		    reservation_expires_at = NULL,
		    updated_at = NOW()
		WHERE id = $1 AND status = 'reserved'
	`

	result, err := r.db.Exec(ctx, query, listingID)
	if err != nil {
		return fmt.Errorf("failed to cancel reservation: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("listing not found or not reserved")
	}

	return nil
}

// ExpireOldReservations auto-expires reservations past their deadline
func (r *ListingRepository) ExpireOldReservations(ctx context.Context) (int, error) {
	query := `
		UPDATE listings
		SET status = 'active',
		    reserved_for = NULL,
		    reserved_at = NULL,
		    reservation_expires_at = NULL,
		    updated_at = NOW()
		WHERE status = 'reserved'
		  AND reservation_expires_at IS NOT NULL
		  AND reservation_expires_at <= NOW()
	`

	result, err := r.db.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to expire old reservations: %w", err)
	}

	return int(result.RowsAffected()), nil
}
