-- Migration: Add quantity and subtitle columns to listings

ALTER TABLE listings ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS subtitle TEXT;

-- Add index for common quantity queries (e.g., in-stock items)
CREATE INDEX IF NOT EXISTS idx_listings_quantity ON listings(quantity) WHERE quantity > 0;
