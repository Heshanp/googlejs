-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW index for fast vector similarity search
-- m: maximum number of connections per layer (default: 16)
-- ef_construction: size of dynamic candidate list for constructing graph (default: 64)
CREATE INDEX IF NOT EXISTS idx_listings_embedding
ON listings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Optional: Create index for L2 distance (Euclidean)
-- CREATE INDEX idx_listings_embedding_l2 ON listings USING hnsw (embedding vector_l2_ops);

-- Optional: Create index for inner product
-- CREATE INDEX idx_listings_embedding_ip ON listings USING hnsw (embedding vector_ip_ops);
