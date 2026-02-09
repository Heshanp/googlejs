-- Drop vector index
DROP INDEX IF EXISTS idx_listings_embedding;

-- Drop embedding column
ALTER TABLE listings DROP COLUMN IF EXISTS embedding;

-- Note: We don't drop the extension itself as it might be used by other tables
-- To drop: DROP EXTENSION IF EXISTS vector CASCADE;
