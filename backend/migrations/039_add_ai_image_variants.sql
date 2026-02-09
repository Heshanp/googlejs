-- Migration 039: Add AI image variant support for listing images
-- - Keeps original source images immutable and recoverable
-- - Tracks active display image per listing/display_order

BEGIN;

ALTER TABLE listing_images
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS source_image_id BIGINT NULL REFERENCES listing_images(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS variant_type TEXT NULL,
    ADD COLUMN IF NOT EXISTS ai_model TEXT NULL,
    ADD COLUMN IF NOT EXISTS ai_prompt_version TEXT NULL,
    ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ NULL;

ALTER TABLE listing_images
    DROP CONSTRAINT IF EXISTS listing_images_variant_type_check;

ALTER TABLE listing_images
    ADD CONSTRAINT listing_images_variant_type_check
    CHECK (variant_type IS NULL OR variant_type = 'pro_backdrop');

ALTER TABLE listing_images
    DROP CONSTRAINT IF EXISTS listing_images_variant_requires_source_check;

ALTER TABLE listing_images
    ADD CONSTRAINT listing_images_variant_requires_source_check
    CHECK (variant_type IS NULL OR source_image_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_listing_images_source_image_id
    ON listing_images(source_image_id);

-- Ensure only one active image per listing slot (display_order), while allowing inactive originals
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_images_active_slot_unique
    ON listing_images(listing_id, display_order)
    WHERE is_active = TRUE;

COMMIT;
