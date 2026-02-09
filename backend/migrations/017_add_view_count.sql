-- Add view_count column to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_listings_view_count ON listings(view_count);
