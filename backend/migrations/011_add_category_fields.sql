-- Migration: Add category_fields JSONB column for dynamic category-specific data
-- This column stores all category fields from AI analysis (e.g., transmission, fuel_type, body_type, brand, storage_capacity, etc.)

ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_fields JSONB DEFAULT '{}';

-- Create GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_listings_category_fields ON listings USING GIN(category_fields);
