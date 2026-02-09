-- Migration 021: VARCHAR to TEXT
-- Priority: CRITICAL (Phase 3)
-- Risk: Medium - breaking change but pgx handles transparently
-- Benefit: PostgreSQL best practice, flexibility, no length-checking overhead

-- IMPORTANT: Test this migration in staging first
-- Verify that application code doesn't do VARCHAR-specific length validation
-- The pgx driver should handle VARCHAR → TEXT conversion transparently

-- Background: In PostgreSQL, TEXT has NO performance penalty vs VARCHAR(n)
-- VARCHAR(n) only adds overhead for length checking
-- TEXT is the PostgreSQL-recommended type for variable-length strings

-- listings table
-- First drop search_vector (depends on title, description, category_fields)
ALTER TABLE listings DROP COLUMN IF EXISTS search_vector;

ALTER TABLE listings ALTER COLUMN title TYPE TEXT;
ALTER TABLE listings ALTER COLUMN category TYPE TEXT;
ALTER TABLE listings ALTER COLUMN location TYPE TEXT;

-- Recreate search_vector after type changes
ALTER TABLE listings
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
        COALESCE(title, '') || ' ' ||
        COALESCE(description, '') || ' ' ||
        COALESCE(category_fields->>'make', '') || ' ' ||
        COALESCE(category_fields->>'model', '')
    )
) STORED;

-- Recreate the index on search_vector
CREATE INDEX IF NOT EXISTS idx_listings_search ON listings USING GIN(search_vector);

-- users table
ALTER TABLE users ALTER COLUMN email TYPE TEXT;
ALTER TABLE users ALTER COLUMN name TYPE TEXT;
ALTER TABLE users ALTER COLUMN google_id TYPE TEXT;
ALTER TABLE users ALTER COLUMN phone TYPE TEXT;
ALTER TABLE users ALTER COLUMN location_city TYPE TEXT;
ALTER TABLE users ALTER COLUMN location_suburb TYPE TEXT;
ALTER TABLE users ALTER COLUMN location_region TYPE TEXT;

-- offers table
ALTER TABLE offers ALTER COLUMN status TYPE TEXT;

-- listing_images table (if it has VARCHAR columns)
ALTER TABLE listing_images ALTER COLUMN url TYPE TEXT;
ALTER TABLE listing_images ALTER COLUMN filename TYPE TEXT;

-- Note: This migration is FAST - no table rewrite needed
-- PostgreSQL just changes the type metadata
-- Existing data remains unchanged

-- Rollback (if needed):
-- ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);
-- (repeat for all columns - not recommended)
