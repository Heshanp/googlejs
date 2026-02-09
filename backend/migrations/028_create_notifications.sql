-- Create notifications table for storing user notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,

    -- Related entity references
    listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
    conversation_id TEXT,
    actor_id TEXT,  -- The user who triggered the notification (e.g., buyer who liked)

    -- Notification state
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMPTZ,

    -- Metadata for extensibility
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_listing_id ON notifications(listing_id) WHERE listing_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE notifications IS 'Stores user notifications for deal alerts, price drops, messages, etc.';
COMMENT ON COLUMN notifications.type IS 'Notification types: message, like, offer, review, system, price_drop, listing_sold, offer_accepted, deal_alert';
COMMENT ON COLUMN notifications.metadata IS 'Additional JSON data like price_when_liked, current_price, savings_percentage, etc.';
