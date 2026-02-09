-- Migration 020: Add Missing Triggers
-- Priority: IMPORTANT (Phase 2)
-- Risk: Zero - only adds trigger
-- Benefit: Auto-update updated_at column on offers table

-- The offers table has an updated_at column but no trigger to auto-update it
-- The listings table already has this trigger (migration 001)
-- We can reuse the same update_updated_at_column() function

-- Add trigger to auto-update offers.updated_at on row updates
CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: The function update_updated_at_column() was created in migration 001
-- and is already being used by the listings table trigger
