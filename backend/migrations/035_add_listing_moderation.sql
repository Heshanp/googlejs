-- Listing moderation, publish idempotency, and user violation tracking

-- -----------------------------------------------------------------------------
-- User moderation fields
-- -----------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_flagged
  ON users(is_flagged)
  WHERE is_flagged = TRUE;

-- -----------------------------------------------------------------------------
-- Listing moderation state
-- -----------------------------------------------------------------------------
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'not_reviewed';

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS moderation_severity TEXT;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS moderation_summary TEXT;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS moderation_flag_profile BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS moderation_fingerprint TEXT;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS moderation_checked_at TIMESTAMPTZ;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS moderation_override_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS moderation_override_at TIMESTAMPTZ;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_moderation_status_valid;
ALTER TABLE listings
  ADD CONSTRAINT listings_moderation_status_valid
  CHECK (moderation_status IN ('not_reviewed', 'clean', 'pending_review', 'flagged', 'approved', 'rejected', 'error'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_moderation_severity_valid;
ALTER TABLE listings
  ADD CONSTRAINT listings_moderation_severity_valid
  CHECK (moderation_severity IS NULL OR moderation_severity IN ('clean', 'medium', 'high', 'critical'));

-- Extend listing status to support moderation workflow
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_valid;
ALTER TABLE listings
  ADD CONSTRAINT listings_status_valid
  CHECK (status IN ('active', 'reserved', 'sold', 'deleted', 'expired', 'pending_review', 'blocked'));

CREATE INDEX IF NOT EXISTS idx_listings_pending_or_blocked
  ON listings(created_at DESC)
  WHERE status IN ('pending_review', 'blocked');

CREATE INDEX IF NOT EXISTS idx_listings_moderation_fingerprint
  ON listings(moderation_fingerprint)
  WHERE moderation_fingerprint IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Moderation cache to avoid repeated token spend on unchanged content
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_decisions_cache (
  fingerprint TEXT PRIMARY KEY,
  decision TEXT NOT NULL,
  severity TEXT NOT NULL,
  flag_profile BOOLEAN NOT NULL DEFAULT FALSE,
  violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'ai',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_decisions_cache_expires_at
  ON moderation_decisions_cache(expires_at);

-- -----------------------------------------------------------------------------
-- Audit trail of moderation decisions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_moderation_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content_fingerprint TEXT NOT NULL,
  decision TEXT NOT NULL,
  severity TEXT NOT NULL,
  flag_profile BOOLEAN NOT NULL DEFAULT FALSE,
  violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'ai',
  model TEXT,
  raw_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_moderation_audit_listing_id
  ON listing_moderation_audit(listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_moderation_audit_user_id
  ON listing_moderation_audit(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_moderation_audit_fingerprint
  ON listing_moderation_audit(content_fingerprint);

-- -----------------------------------------------------------------------------
-- Violation events (deduped by user + fingerprint to prevent retry inflation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_violation_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id BIGINT REFERENCES listings(id) ON DELETE SET NULL,
  content_fingerprint TEXT NOT NULL,
  decision TEXT NOT NULL,
  severity TEXT NOT NULL,
  violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_violation_events_user_id
  ON user_violation_events(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Publish idempotency for create/update publish endpoints
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_idempotency_keys (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_moderation_idempotency_expires_at
  ON moderation_idempotency_keys(expires_at);

COMMENT ON TABLE moderation_decisions_cache IS 'Reusable moderation outcomes by content fingerprint to reduce AI spend.';
COMMENT ON TABLE listing_moderation_audit IS 'Immutable audit trail for AI + manual moderation actions.';
COMMENT ON TABLE user_violation_events IS 'Deduplicated user policy violations keyed by content fingerprint.';
COMMENT ON TABLE moderation_idempotency_keys IS 'Idempotency keys for publish endpoints to prevent duplicate moderation calls.';
