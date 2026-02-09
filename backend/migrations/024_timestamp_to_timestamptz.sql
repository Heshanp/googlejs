-- Migration 024: TIMESTAMP to TIMESTAMPTZ
-- Priority: RECOMMENDED (Future-proofing)
-- Risk: Low - existing times interpreted as session timezone (UTC or local)
-- Benefit: Proper timezone handling, future-proof for multi-timezone support

-- Background:
-- TIMESTAMP (without time zone) stores local time without timezone info
-- TIMESTAMPTZ stores UTC internally and converts to session timezone
-- For single timezone: no functional change, but better for future expansion
-- Existing data will be interpreted as session timezone (check postgresql.conf)

-- IMPORTANT: Verify your PostgreSQL timezone setting first
-- SHOW timezone;
-- If timezone = 'UTC', existing times are already effectively UTC
-- If timezone = 'America/New_York' (or other), times will be interpreted as that timezone

-- =============================================================================
-- PART 1: listings table
-- =============================================================================

-- Convert timestamp columns to timestamptz
ALTER TABLE listings
    ALTER COLUMN created_at TYPE TIMESTAMPTZ,
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ,
    ALTER COLUMN reserved_at TYPE TIMESTAMPTZ,
    ALTER COLUMN reservation_expires_at TYPE TIMESTAMPTZ;

-- Update default values to use timezone-aware functions
ALTER TABLE listings
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();

-- Note: Trigger already uses CURRENT_TIMESTAMP which works with TIMESTAMPTZ

-- =============================================================================
-- PART 2: conversations table
-- =============================================================================

ALTER TABLE conversations
    ALTER COLUMN last_message_at TYPE TIMESTAMPTZ,
    ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Update defaults
ALTER TABLE conversations
    ALTER COLUMN last_message_at SET DEFAULT now(),
    ALTER COLUMN created_at SET DEFAULT now();

-- =============================================================================
-- PART 3: messages table
-- =============================================================================

ALTER TABLE messages
    ALTER COLUMN read_at TYPE TIMESTAMPTZ,
    ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Update defaults
ALTER TABLE messages
    ALTER COLUMN created_at SET DEFAULT now();

-- =============================================================================
-- PART 4: offers table
-- =============================================================================

ALTER TABLE offers
    ALTER COLUMN expires_at TYPE TIMESTAMPTZ,
    ALTER COLUMN responded_at TYPE TIMESTAMPTZ,
    ALTER COLUMN created_at TYPE TIMESTAMPTZ,
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- Update defaults
ALTER TABLE offers
    ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '48 hours'),
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();

-- =============================================================================
-- PART 5: listing_images table
-- =============================================================================

ALTER TABLE listing_images
    ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Update defaults
ALTER TABLE listing_images
    ALTER COLUMN created_at SET DEFAULT now();

-- =============================================================================
-- Verification Note
-- =============================================================================

-- After migration, verify:
-- 1. Check column types:
--    SELECT table_name, column_name, data_type
--    FROM information_schema.columns
--    WHERE column_name LIKE '%_at' AND table_schema = 'public';

-- 2. Check existing data timestamps haven't changed logically:
--    SELECT created_at FROM listings LIMIT 5;

-- 3. Test inserting new rows:
--    INSERT INTO listings (...) VALUES (...);
--    -- Should use current time with timezone

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================

-- To revert to TIMESTAMP (not recommended):
-- ALTER TABLE listings ALTER COLUMN created_at TYPE TIMESTAMP;
-- ALTER TABLE listings ALTER COLUMN updated_at TYPE TIMESTAMP;
-- (repeat for all columns)

-- Note: Rolling back loses timezone info permanently
-- Only rollback if absolutely necessary
