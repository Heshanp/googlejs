-- Drop search_vector first (depends on legacy columns)
ALTER TABLE listings DROP COLUMN IF EXISTS search_vector;

-- Drop legacy columns
ALTER TABLE listings 
DROP COLUMN IF EXISTS make,
DROP COLUMN IF EXISTS model,
DROP COLUMN IF EXISTS year,
DROP COLUMN IF EXISTS odometer;

-- Recreate search_vector using category_fields for text search
ALTER TABLE listings
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
        COALESCE(title, '') || ' ' ||
        COALESCE(description, '') || ' ' ||
        COALESCE(category_fields->>'make', '') || ' ' ||
        COALESCE(category_fields->>'model', '')
    )
) STORED;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_listings_search ON listings USING GIN(search_vector);
