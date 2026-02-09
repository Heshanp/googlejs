-- Add condition column to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT 'Good';

-- Update existing listings to have a condition if needed
UPDATE listings SET condition = 'Good' WHERE condition IS NULL;
