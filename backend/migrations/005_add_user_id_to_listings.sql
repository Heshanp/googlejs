-- Add user_id column to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
