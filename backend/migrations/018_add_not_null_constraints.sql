-- Migration 018: Add NOT NULL Constraints
-- Priority: CRITICAL (Phase 2)
-- Risk: Low - may fail if data contains NULLs (fix data first)
-- Benefit: Data integrity, prevents invalid NULL values

-- IMPORTANT: Before running this migration, verify no NULL values exist:
-- SELECT COUNT(*) FROM listings WHERE user_id IS NULL;
-- SELECT COUNT(*) FROM listings WHERE status IS NULL;
-- SELECT COUNT(*) FROM listings WHERE created_at IS NULL;
-- etc.

-- If NULLs found, fix them first:
-- UPDATE listings SET status = 'active' WHERE status IS NULL;
-- DELETE FROM listings WHERE user_id IS NULL; -- or assign to admin user

-- listings table
-- Every listing MUST have an owner
ALTER TABLE listings ALTER COLUMN user_id SET NOT NULL;

-- status has a DEFAULT, should enforce NOT NULL
ALTER TABLE listings ALTER COLUMN status SET NOT NULL;

-- Timestamps should always be set
ALTER TABLE listings ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE listings ALTER COLUMN updated_at SET NOT NULL;

-- conversations table
-- Conversations always need timestamps
ALTER TABLE conversations ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN last_message_at SET NOT NULL;

-- messages table
-- Messages always need creation timestamp
ALTER TABLE messages ALTER COLUMN created_at SET NOT NULL;

-- offers table
-- Offers always need timestamps
ALTER TABLE offers ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE offers ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE offers ALTER COLUMN expires_at SET NOT NULL;
