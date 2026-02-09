-- Create price_history table to track listing price changes
-- This enables price drop notifications for users who liked items at higher prices
CREATE TABLE IF NOT EXISTS price_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    old_price INT NOT NULL,
    new_price INT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for efficient lookup of recent price changes per listing
CREATE INDEX IF NOT EXISTS idx_price_history_listing_id ON price_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history(changed_at DESC);

-- Composite index for finding recent price drops
CREATE INDEX IF NOT EXISTS idx_price_history_listing_changed ON price_history(listing_id, changed_at DESC);

-- Add price_when_liked column to likes table
-- This captures the price at the moment of liking for drop detection
ALTER TABLE likes ADD COLUMN IF NOT EXISTS price_when_liked INT;

-- Comment for documentation
COMMENT ON TABLE price_history IS 'Tracks historical price changes for listings to enable price drop notifications';
COMMENT ON COLUMN likes.price_when_liked IS 'The listing price when the user liked it, for price drop detection';

-- Function to automatically log price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if price actually changed
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO price_history (listing_id, old_price, new_price)
        VALUES (NEW.id, OLD.price, NEW.price);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically capture price changes
DROP TRIGGER IF EXISTS trigger_log_price_change ON listings;
CREATE TRIGGER trigger_log_price_change
    AFTER UPDATE OF price ON listings
    FOR EACH ROW
    EXECUTE FUNCTION log_price_change();
