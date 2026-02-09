-- Migration 019: Add CHECK Constraints
-- Priority: IMPORTANT (Phase 2)
-- Risk: Low - may fail if data violates constraints
-- Benefit: Database-level validation, prevents invalid data

-- IMPORTANT: Before running, verify data meets constraints:
-- SELECT DISTINCT status FROM listings;
-- SELECT MIN(price), MAX(price) FROM listings WHERE price < 0;
-- SELECT MIN(amount) FROM offers WHERE amount <= 0;

-- Validate listings.status values
-- This prevents application bugs from inserting invalid status values
ALTER TABLE listings ADD CONSTRAINT listings_status_valid
  CHECK (status IN ('active', 'reserved', 'sold', 'deleted', 'expired'));

-- Validate listings.price is non-negative
-- Prices should never be negative (use NULL for "price on request")
ALTER TABLE listings ADD CONSTRAINT listings_price_positive
  CHECK (price IS NULL OR price >= 0);

-- Validate offers.amount is positive
-- Offers must have a positive price (zero or negative offers don't make sense)
ALTER TABLE offers ADD CONSTRAINT offers_amount_positive
  CHECK (amount > 0);

-- Note: offers.status already has a CHECK constraint from migration 015
-- CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn'))
