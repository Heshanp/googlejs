-- Track which embedding model produced each vector to prevent cross-model similarity bugs.
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS embedding_model TEXT;

-- Existing rows were generated before model tracking, so treat them as stale and regenerate.
UPDATE listings
SET embedding = NULL,
    embedding_model = NULL
WHERE embedding IS NOT NULL
  AND embedding_model IS NULL;

-- Helps filter semantic candidates by active embedding model.
CREATE INDEX IF NOT EXISTS idx_listings_embedding_model_active
ON listings (embedding_model)
WHERE status = 'active' AND embedding IS NOT NULL;
