-- Add reservation tracking columns to listings table
ALTER TABLE listings
ADD COLUMN reserved_for UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN reserved_at TIMESTAMP,
ADD COLUMN reservation_expires_at TIMESTAMP;

-- Index for finding user's reserved items (efficient lookup)
CREATE INDEX IF NOT EXISTS idx_listings_reserved_for
ON listings(reserved_for)
WHERE reserved_for IS NOT NULL;

-- Partial index for auto-expiring reservations (performance optimization)
CREATE INDEX IF NOT EXISTS idx_listings_reservation_expires
ON listings(reservation_expires_at)
WHERE status = 'reserved' AND reservation_expires_at IS NOT NULL;

-- Update existing pending offers to have 48-hour expiration if not set
UPDATE offers
SET expires_at = created_at + INTERVAL '48 hours'
WHERE status = 'pending' AND expires_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN listings.reserved_for IS 'User ID of buyer who has accepted offer (48-hour hold)';
COMMENT ON COLUMN listings.reserved_at IS 'Timestamp when reservation was created';
COMMENT ON COLUMN listings.reservation_expires_at IS 'Auto-release timestamp (48 hours after acceptance)';
