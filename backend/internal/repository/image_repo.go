package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
)

// ImageRepository handles database operations for listing images
type ImageRepository struct {
	db *pgxpool.Pool
}

// NewImageRepository creates a new image repository
func NewImageRepository(db *pgxpool.Pool) *ImageRepository {
	return &ImageRepository{db: db}
}

// GetByID retrieves a single listing image by ID.
func (r *ImageRepository) GetByID(ctx context.Context, imageID int) (*models.ListingImage, error) {
	query := `
		SELECT id, listing_id, url, filename, display_order, is_active, source_image_id, variant_type, ai_model, ai_prompt_version, ai_generated_at, created_at
		FROM listing_images
		WHERE id = $1
	`

	var img models.ListingImage
	if err := r.db.QueryRow(ctx, query, imageID).Scan(
		&img.ID,
		&img.ListingID,
		&img.URL,
		&img.Filename,
		&img.DisplayOrder,
		&img.IsActive,
		&img.SourceImageID,
		&img.VariantType,
		&img.AIModel,
		&img.AIPromptVersion,
		&img.AIGeneratedAt,
		&img.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("failed to get image: %w", err)
	}

	return &img, nil
}

// GetByListingID retrieves all images for a listing
func (r *ImageRepository) GetByListingID(ctx context.Context, listingID int) ([]models.ListingImage, error) {
	query := `
		SELECT id, listing_id, url, filename, display_order, is_active, source_image_id, variant_type, ai_model, ai_prompt_version, ai_generated_at, created_at
		FROM listing_images
		WHERE listing_id = $1
		  AND is_active = TRUE
		ORDER BY display_order ASC, id ASC
	`

	rows, err := r.db.Query(ctx, query, listingID)
	if err != nil {
		return nil, fmt.Errorf("failed to query images: %w", err)
	}
	defer rows.Close()

	var images []models.ListingImage
	for rows.Next() {
		var img models.ListingImage
		err := rows.Scan(
			&img.ID,
			&img.ListingID,
			&img.URL,
			&img.Filename,
			&img.DisplayOrder,
			&img.IsActive,
			&img.SourceImageID,
			&img.VariantType,
			&img.AIModel,
			&img.AIPromptVersion,
			&img.AIGeneratedAt,
			&img.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan image: %w", err)
		}
		images = append(images, img)
	}

	return images, nil
}

// Create inserts a new image record
func (r *ImageRepository) Create(ctx context.Context, image *models.ListingImage) error {
	query := `
		INSERT INTO listing_images (
			listing_id, url, filename, display_order,
			is_active, source_image_id, variant_type, ai_model, ai_prompt_version, ai_generated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		ctx, query,
		image.ListingID,
		image.URL,
		image.Filename,
		image.DisplayOrder,
		image.IsActive,
		image.SourceImageID,
		image.VariantType,
		image.AIModel,
		image.AIPromptVersion,
		image.AIGeneratedAt,
	).Scan(&image.ID, &image.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create image: %w", err)
	}

	return nil
}

// CreateBatch inserts multiple image records for a listing
func (r *ImageRepository) CreateBatch(ctx context.Context, listingID int, images []models.ListingImage) error {
	for i := range images {
		images[i].ListingID = listingID
		images[i].DisplayOrder = i
		images[i].IsActive = true
		if err := r.Create(ctx, &images[i]); err != nil {
			return err
		}
	}
	return nil
}

// DeleteByListingID removes all images for a listing
func (r *ImageRepository) DeleteByListingID(ctx context.Context, listingID int) error {
	query := `DELETE FROM listing_images WHERE listing_id = $1`
	_, err := r.db.Exec(ctx, query, listingID)
	if err != nil {
		return fmt.Errorf("failed to delete images: %w", err)
	}
	return nil
}

// DeleteExcept removes images for a listing except those with specified IDs
func (r *ImageRepository) DeleteExcept(ctx context.Context, listingID int, keepIDs []int) error {
	if len(keepIDs) == 0 {
		// If no IDs to keep, delete all active images for this listing.
		_, err := r.db.Exec(ctx, `DELETE FROM listing_images WHERE listing_id = $1 AND is_active = TRUE`, listingID)
		if err != nil {
			return fmt.Errorf("failed to delete active images: %w", err)
		}
		return nil
	}

	query := `DELETE FROM listing_images WHERE listing_id = $1 AND is_active = TRUE AND id != ALL($2)`
	_, err := r.db.Exec(ctx, query, listingID, keepIDs)
	if err != nil {
		return fmt.Errorf("failed to delete images: %w", err)
	}
	return nil
}

// DeactivateImages marks selected images as inactive for a listing.
func (r *ImageRepository) DeactivateImages(ctx context.Context, listingID int, imageIDs []int) error {
	if len(imageIDs) == 0 {
		return nil
	}

	query := `
		UPDATE listing_images
		SET is_active = FALSE
		WHERE listing_id = $1
		  AND id = ANY($2)
	`
	_, err := r.db.Exec(ctx, query, listingID, imageIDs)
	if err != nil {
		return fmt.Errorf("failed to deactivate images: %w", err)
	}
	return nil
}
