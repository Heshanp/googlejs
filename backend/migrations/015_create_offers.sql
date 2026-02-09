-- Create offers table for bidirectional negotiation
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,  -- Price in cents
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, accepted, rejected, countered, expired, withdrawn
    message TEXT,  -- Optional message with offer
    parent_offer_id UUID REFERENCES offers(id),  -- For counter-offers (self-referencing)
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '48 hours'),  -- 48-hour expiration
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraint: status must be one of the valid values
    CONSTRAINT valid_offer_status CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_offers_listing ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_conversation ON offers(conversation_id);
CREATE INDEX IF NOT EXISTS idx_offers_sender ON offers(sender_id);
CREATE INDEX IF NOT EXISTS idx_offers_recipient ON offers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_parent ON offers(parent_offer_id);
CREATE INDEX IF NOT EXISTS idx_offers_expires ON offers(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_offers_created ON offers(created_at DESC);
