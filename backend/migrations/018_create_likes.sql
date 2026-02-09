-- Create likes table for tracking user favorites
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, listing_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_listing_id ON likes(listing_id);

-- Add like_count column to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create index for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_listings_like_count ON listings(like_count);
