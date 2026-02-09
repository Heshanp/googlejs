-- Add listing expiration feature
-- Listings expire within 1 week by default, users can select 1 day to 1 month

-- Add expires_at column to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index for efficient expired listing queries (filter active listings by expiration)
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON listings(expires_at)
WHERE status = 'active' AND expires_at IS NOT NULL;

-- Backfill existing active listings with 1 week from now
UPDATE listings
SET expires_at = NOW() + INTERVAL '7 days'
WHERE status = 'active' AND expires_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN listings.expires_at IS 'When the listing expires. Default 7 days from creation. Range: 1 day to 1 month.';
