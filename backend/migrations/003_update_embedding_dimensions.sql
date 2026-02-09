-- Drop the existing index
DROP INDEX IF EXISTS idx_listings_embedding;

-- Clear existing embeddings as they are incompatible (1536 -> 768)
UPDATE listings SET embedding = NULL;

-- Alter the column type to 768 dimensions (for Gemini embedding models)
ALTER TABLE listings
ALTER COLUMN embedding TYPE vector(768);

-- Recreate the HNSW index with the new dimension
CREATE INDEX idx_listings_embedding
ON listings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
