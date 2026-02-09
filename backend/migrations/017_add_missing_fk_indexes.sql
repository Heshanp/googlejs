-- Migration 017: Add Missing Foreign Key Indexes
-- Priority: CRITICAL (Phase 1)
-- Risk: Zero - only adds indexes
-- Benefit: Immediate performance improvement on JOINs and FK queries

-- CRITICAL: Missing index on listings.user_id
-- This FK is heavily used in:
-- - "Get user's listings" queries
-- - JOINs in conversation queries
-- - Permission checks
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);

-- CRITICAL: Missing index on messages.sender_id
-- This FK is used for:
-- - Permission checks (is user the sender?)
-- - Sender lookups in message lists
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- BONUS: Composite index for common query pattern
-- Covers: "Get user's active listings, newest first"
-- This is likely the most common query for seller dashboards
CREATE INDEX IF NOT EXISTS idx_listings_user_active
  ON listings(user_id, created_at DESC)
  WHERE status = 'active';

-- Note: These indexes can be created CONCURRENTLY in production to avoid locks:
-- CREATE INDEX CONCURRENTLY idx_listings_user_id ON listings(user_id);
