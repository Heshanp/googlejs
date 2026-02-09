-- Migration 022: SERIAL → IDENTITY + BIGINT
-- Priority: CRITICAL (Phase 4)
-- Risk: HIGH - table rewrite, requires downtime
-- Benefit: SQL-standard, future-proof to 9 quintillion IDs

-- ⚠️ CRITICAL WARNINGS:
-- 1. TEST THIS IN STAGING FIRST - DO NOT RUN IN PRODUCTION WITHOUT TESTING
-- 2. BACKUP YOUR DATABASE BEFORE RUNNING
-- 3. THIS REQUIRES DOWNTIME - schedule a maintenance window (est. 5-15 min)
-- 4. Run this migration during low-traffic periods
-- 5. Monitor disk space - table copies require 2x space temporarily

-- Background:
-- - SERIAL is legacy PostgreSQL syntax (still works but not SQL standard)
-- - GENERATED ALWAYS AS IDENTITY is SQL-standard (PostgreSQL 10+)
-- - INTEGER max: 2,147,483,647 (2.1 billion)
-- - BIGINT max: 9,223,372,036,854,775,807 (9 quintillion)

-- =============================================================================
-- PART 1: Migrate listings table (SERIAL INTEGER → IDENTITY BIGINT)
-- =============================================================================

BEGIN;

-- Step 1: Create new listings table with correct structure
CREATE TABLE listings_new (
    -- Use BIGINT GENERATED ALWAYS AS IDENTITY (SQL-standard, future-proof)
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- All columns as TEXT (from migration 021)
    title TEXT NOT NULL,
    subtitle TEXT,  -- From migration 026
    description TEXT,
    price INTEGER,
    quantity INTEGER DEFAULT 1,  -- From migration 026
    category TEXT,
    condition TEXT DEFAULT 'Good',  -- From migration 027
    location TEXT,

    -- Foreign keys
    user_id UUID NOT NULL REFERENCES users(id),

    -- Status with constraints (from migrations 018, 019)
    status TEXT NOT NULL DEFAULT 'active',

    -- View and like counts (from migrations 017, 018)
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,

    -- Full-text search vector (from migration 012)
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            COALESCE(title, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(category_fields->>'make', '') || ' ' ||
            COALESCE(category_fields->>'model', '')
        )
    ) STORED,

    -- Vector search
    embedding vector(768),

    -- Dynamic category fields
    category_fields JSONB DEFAULT '{}',

    -- Shipping, payment, and returns (from migration 025)
    shipping_options JSONB DEFAULT '{}',
    payment_methods JSONB DEFAULT '{}',
    returns_policy JSONB DEFAULT '{}',

    -- Reservation system
    reserved_for UUID REFERENCES users(id) ON DELETE SET NULL,
    reserved_at TIMESTAMP,
    reservation_expires_at TIMESTAMP,

    -- Timestamps (NOT NULL from migration 018)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints (from migrations 018, 019)
    CONSTRAINT listings_status_valid CHECK (status IN ('active', 'reserved', 'sold', 'deleted', 'expired')),
    CONSTRAINT listings_price_positive CHECK (price IS NULL OR price >= 0)
);

-- Step 2: Copy all data from old table to new table
-- Use OVERRIDING SYSTEM VALUE to allow copying existing IDs
-- Note: Only select columns that exist at this point (migrations 001-021)
-- Columns from 025, 026, 027 (subtitle, quantity, condition, shipping_options, etc.)
-- will get their DEFAULT values as those migrations run AFTER this one
INSERT INTO listings_new (
    id, title, description, price, category, location, user_id,
    status, view_count, like_count, embedding, category_fields,
    reserved_for, reserved_at, reservation_expires_at, created_at, updated_at
) OVERRIDING SYSTEM VALUE
SELECT
    id, title, description, price, category, location, user_id,
    status,
    COALESCE(view_count, 0),
    COALESCE(like_count, 0),
    embedding, category_fields,
    reserved_for, reserved_at, reservation_expires_at, created_at, updated_at
FROM listings;

-- Step 3: Set sequence to current max ID (so new inserts continue from current max)
SELECT setval('listings_new_id_seq', (SELECT COALESCE(MAX(id), 1) FROM listings_new));

-- Step 4: Update dependent tables' foreign keys to BIGINT
ALTER TABLE listing_images ALTER COLUMN listing_id TYPE BIGINT;
ALTER TABLE conversations ALTER COLUMN listing_id TYPE BIGINT;
ALTER TABLE offers ALTER COLUMN listing_id TYPE BIGINT;

-- Step 5: Drop old table and rename new table
-- Drop FK constraints first
ALTER TABLE listing_images DROP CONSTRAINT IF EXISTS listing_images_listing_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_listing_id_fkey;
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_listing_id_fkey;

-- Drop old table
DROP TABLE listings CASCADE;

-- Rename new table
ALTER TABLE listings_new RENAME TO listings;

-- Rename sequence to standard name
ALTER SEQUENCE listings_new_id_seq RENAME TO listings_id_seq;

-- Step 6: Recreate foreign key constraints
ALTER TABLE listing_images
    ADD CONSTRAINT listing_images_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE conversations
    ADD CONSTRAINT conversations_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE offers
    ADD CONSTRAINT offers_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

-- Step 7: Recreate all indexes (combining indexes from multiple migrations)
CREATE INDEX idx_listings_search ON listings USING GIN(search_vector);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_location ON listings(location);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_user_id ON listings(user_id);  -- From migration 017
CREATE INDEX idx_listings_view_count ON listings(view_count);  -- From migration 017
CREATE INDEX idx_listings_like_count ON listings(like_count);  -- From migration 018
CREATE INDEX idx_listings_embedding ON listings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m=16, ef_construction=64);
CREATE INDEX idx_listings_category_fields ON listings USING GIN(category_fields);
CREATE INDEX idx_listings_shipping_options ON listings USING GIN(shipping_options);  -- From migration 025
CREATE INDEX idx_listings_payment_methods ON listings USING GIN(payment_methods);  -- From migration 025
CREATE INDEX idx_listings_returns_policy ON listings USING GIN(returns_policy);  -- From migration 025
CREATE INDEX idx_listings_quantity ON listings(quantity) WHERE quantity > 0;  -- From migration 026
CREATE INDEX idx_listings_reserved_for ON listings(reserved_for)
    WHERE reserved_for IS NOT NULL;
CREATE INDEX idx_listings_reservation_expires ON listings(reservation_expires_at)
    WHERE status = 'reserved';
CREATE INDEX idx_listings_user_active ON listings(user_id, created_at DESC)
    WHERE status = 'active';  -- From migration 017

-- Step 8: Recreate trigger
CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =============================================================================
-- PART 2: Migrate listing_images table (SERIAL INTEGER → IDENTITY BIGINT)
-- =============================================================================

BEGIN;

-- Step 1: Create new listing_images table
CREATE TABLE listing_images_new (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url TEXT NOT NULL,  -- From migration 021
    filename TEXT NOT NULL,  -- From migration 021
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy all data
-- Use OVERRIDING SYSTEM VALUE to allow copying existing IDs
INSERT INTO listing_images_new OVERRIDING SYSTEM VALUE
SELECT * FROM listing_images;

-- Step 3: Set sequence to current max ID
SELECT setval('listing_images_new_id_seq', (SELECT COALESCE(MAX(id), 1) FROM listing_images_new));

-- Step 4: Drop old table and rename
DROP TABLE listing_images;
ALTER TABLE listing_images_new RENAME TO listing_images;
ALTER SEQUENCE listing_images_new_id_seq RENAME TO listing_images_id_seq;

-- Step 5: Recreate indexes
CREATE INDEX idx_listing_images_listing_id ON listing_images(listing_id);
CREATE INDEX idx_listing_images_order ON listing_images(listing_id, display_order);

COMMIT;

-- =============================================================================
-- Verification Queries (run after migration to verify success)
-- =============================================================================

-- Check table structures
-- \d listings
-- \d listing_images

-- Verify ID types are BIGINT GENERATED ALWAYS AS IDENTITY
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name IN ('listings', 'listing_images')
-- AND column_name = 'id';

-- Verify foreign key column types are BIGINT
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('listing_images', 'conversations', 'offers')
-- AND column_name = 'listing_id';

-- Verify data integrity (counts should match)
-- SELECT 'listings' as table_name, COUNT(*) FROM listings
-- UNION ALL
-- SELECT 'listing_images', COUNT(*) FROM listing_images;

-- Test sequence works (run after migration)
-- INSERT INTO listings (title, description, user_id, status)
-- VALUES ('Test listing', 'Test description',
--         (SELECT id FROM users LIMIT 1), 'active');
-- DELETE FROM listings WHERE title = 'Test listing';

-- =============================================================================
-- Rollback Strategy
-- =============================================================================

-- There is NO simple rollback for this migration
-- If migration fails:
-- 1. ROLLBACK the transaction (if still in transaction)
-- 2. Restore from backup
-- 3. Debug the issue in staging

-- If migration succeeds but you need to revert:
-- 1. Restore from backup taken before migration
-- 2. This is why testing in staging is CRITICAL

-- =============================================================================
-- Performance Notes
-- =============================================================================

-- Expected downtime: 5-15 minutes depending on:
-- - Number of listings (table size)
-- - Number of indexes to rebuild
-- - Server hardware performance
-- - Database connection count (close connections for faster completion)

-- Disk space required: ~2x current table size temporarily
-- Monitor: SELECT pg_size_pretty(pg_total_relation_size('listings'));
