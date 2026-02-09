-- Create saved_searches table for storing user search preferences
CREATE TABLE IF NOT EXISTS saved_searches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    notify_on_new BOOLEAN DEFAULT TRUE NOT NULL,
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, name)
);

-- Track which listings have been notified for each saved search to avoid duplicates
CREATE TABLE IF NOT EXISTS saved_search_results (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    saved_search_id BIGINT NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    notified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(saved_search_id, listing_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_notify ON saved_searches(notify_on_new) WHERE notify_on_new = TRUE;
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON saved_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_search_results_search_id ON saved_search_results(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_saved_search_results_listing_id ON saved_search_results(listing_id);

-- Comments for documentation
COMMENT ON TABLE saved_searches IS 'Stores user saved search preferences for deal alerts on new matching listings';
COMMENT ON COLUMN saved_searches.filters IS 'JSONB containing search filters: category, priceMin, priceMax, location, etc.';
COMMENT ON COLUMN saved_searches.notify_on_new IS 'Whether to send notifications when new listings match this search';
COMMENT ON COLUMN saved_searches.last_notified_at IS 'Timestamp of the last notification sent for this search';
COMMENT ON TABLE saved_search_results IS 'Tracks which listings have been notified for each saved search to prevent duplicates';

-- Function to automatically update updated_at on save
CREATE OR REPLACE FUNCTION update_saved_search_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
DROP TRIGGER IF EXISTS trigger_update_saved_search_timestamp ON saved_searches;
CREATE TRIGGER trigger_update_saved_search_timestamp
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_search_timestamp();
