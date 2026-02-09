-- Add public UUID identifier for listings (used in public URLs)

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add column
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS public_id UUID;

-- Backfill existing rows
UPDATE listings
SET public_id = gen_random_uuid()
WHERE public_id IS NULL;

-- Ensure new rows get a value
ALTER TABLE listings
ALTER COLUMN public_id SET DEFAULT gen_random_uuid();

-- Enforce presence + uniqueness
ALTER TABLE listings
ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_public_id
ON listings(public_id);

COMMENT ON COLUMN listings.public_id IS 'Public, non-sequential identifier used in URLs and external references.';
