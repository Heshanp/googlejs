-- Migration 023: Performance Optimizations
-- Priority: OPTIONAL (Phase 5)
-- Risk: Low - VACUUM FULL requires exclusive lock
-- Benefit: Better update performance, smaller indexes, reduced storage

-- ⚠️ WARNING: VACUUM FULL requires an exclusive lock
-- Run this during a maintenance window or skip VACUUM FULL commands

-- =============================================================================
-- PART 1: Drop Redundant Indexes
-- =============================================================================

-- The users table has UNIQUE constraints on email and google_id
-- UNIQUE constraints automatically create indexes, so explicit indexes are redundant

-- Check current indexes on users table:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';

-- Drop redundant email index (UNIQUE constraint already creates one)
DROP INDEX IF EXISTS idx_users_email;

-- Drop redundant google_id index (UNIQUE constraint already creates one)
DROP INDEX IF EXISTS idx_users_google_id;

-- Benefits:
-- - Reduces storage (2 fewer indexes)
-- - Faster INSERTs/UPDATEs (fewer indexes to maintain)
-- - Simpler query planner decisions

-- =============================================================================
-- PART 2: Optimize JSONB Index for Containment Queries
-- =============================================================================

-- The category_fields JSONB column uses default GIN operator class
-- Based on user confirmation: queries are primarily containment (@>)
-- We can use jsonb_path_ops for better performance on containment queries

-- Drop current index
DROP INDEX IF EXISTS idx_listings_category_fields;

-- Create optimized index for containment queries
-- jsonb_path_ops:
-- - Smaller index size (~30% smaller)
-- - Faster for @> containment queries
-- - Does NOT support: ? (key existence), ?| (any key), ?& (all keys)
-- - If you need key existence queries later, recreate with default ops
CREATE INDEX idx_listings_category_fields ON listings
    USING GIN(category_fields jsonb_path_ops);

-- Benefits:
-- - Faster queries: category_fields @> '{"brand":"Toyota"}'
-- - Smaller index size (saves disk space)

-- =============================================================================
-- PART 3: Set FILLFACTOR for Update-Heavy Tables
-- =============================================================================

-- FILLFACTOR determines how full each page is
-- Default: 100 (no free space)
-- Lower fillfactor: leaves space for HOT (Heap-Only Tuple) updates

-- Tables with frequent UPDATEs benefit from fillfactor < 100:
-- - listings: status updates, reservation updates
-- - offers: status updates, responded_at updates

-- Set fillfactor to 90 (leave 10% free space per page)
ALTER TABLE listings SET (fillfactor = 90);
ALTER TABLE offers SET (fillfactor = 90);

-- Benefits:
-- - HOT updates avoid index maintenance
-- - Reduces table bloat
-- - Faster UPDATE operations

-- Note: Existing data won't be affected until VACUUM FULL or CLUSTER

-- =============================================================================
-- PART 4: VACUUM FULL (OPTIONAL - Requires Maintenance Window)
-- =============================================================================

-- VACUUM FULL rewrites tables to reclaim space and apply fillfactor
-- ⚠️ WARNING: VACUUM FULL requires an EXCLUSIVE lock (blocks all operations)
-- Only run during scheduled maintenance window

-- Uncomment to run (after backing up and during maintenance window):

-- VACUUM FULL listings;
-- VACUUM FULL offers;

-- Alternative: Use regular VACUUM (doesn't require exclusive lock)
-- Regular VACUUM doesn't reclaim space but updates statistics

VACUUM ANALYZE listings;
VACUUM ANALYZE offers;
VACUUM ANALYZE users;
VACUUM ANALYZE conversations;
VACUUM ANALYZE messages;
VACUUM ANALYZE listing_images;

-- =============================================================================
-- PART 5: Update Statistics
-- =============================================================================

-- Update table statistics for query planner optimization
ANALYZE;

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Check index sizes (should see reduction after JSONB optimization)
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid::regclass) DESC;

-- Check table bloat (after VACUUM FULL)
-- SELECT
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Verify fillfactor setting
-- SELECT relname, reloptions
-- FROM pg_class
-- WHERE relname IN ('listings', 'offers');

-- Expected output:
-- relname  | reloptions
-- ---------+-----------------
-- listings | {fillfactor=90}
-- offers   | {fillfactor=90}

-- =============================================================================
-- Rollback
-- =============================================================================

-- Recreate redundant indexes (if needed):
-- CREATE INDEX idx_users_email ON users(email);
-- CREATE INDEX idx_users_google_id ON users(google_id);

-- Revert JSONB index to default ops:
-- DROP INDEX idx_listings_category_fields;
-- CREATE INDEX idx_listings_category_fields ON listings USING GIN(category_fields);

-- Revert fillfactor to default (100):
-- ALTER TABLE listings SET (fillfactor = 100);
-- ALTER TABLE offers SET (fillfactor = 100);
-- VACUUM FULL listings;  -- Required to apply new fillfactor
-- VACUUM FULL offers;
