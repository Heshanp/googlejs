-- Migration: Add shipping_options, payment_methods, and returns_policy JSONB columns

ALTER TABLE listings ADD COLUMN IF NOT EXISTS shipping_options JSONB DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS returns_policy JSONB DEFAULT '{}';

-- Create GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_listings_shipping_options ON listings USING GIN(shipping_options);
CREATE INDEX IF NOT EXISTS idx_listings_payment_methods ON listings USING GIN(payment_methods);
CREATE INDEX IF NOT EXISTS idx_listings_returns_policy ON listings USING GIN(returns_policy);
