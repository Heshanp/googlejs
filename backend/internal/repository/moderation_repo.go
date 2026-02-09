package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
)

// ModerationRepository handles moderation-specific persistence.
type ModerationRepository struct {
	db *pgxpool.Pool
}

// IdempotencyRecord is a persisted publish idempotency response.
type IdempotencyRecord struct {
	RequestFingerprint string
	ResponseStatus     int
	ResponseBody       json.RawMessage
	ExpiresAt          time.Time
}

// NewModerationRepository creates a moderation repository.
func NewModerationRepository(db *pgxpool.Pool) *ModerationRepository {
	return &ModerationRepository{db: db}
}

// GetCachedDecision returns a valid cached moderation result by fingerprint.
func (r *ModerationRepository) GetCachedDecision(ctx context.Context, fingerprint string, now time.Time) (*models.ModerationResult, error) {
	if fingerprint == "" {
		return nil, nil
	}

	var result models.ModerationResult
	var violationsJSON []byte
	var expiresAt time.Time

	err := r.db.QueryRow(ctx, `
		SELECT decision, severity, flag_profile, violations, summary, source, expires_at
		FROM moderation_decisions_cache
		WHERE fingerprint = $1 AND expires_at > $2
	`, fingerprint, now).Scan(
		&result.Decision,
		&result.Severity,
		&result.FlagProfile,
		&violationsJSON,
		&result.Summary,
		&result.Source,
		&expiresAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get cached decision: %w", err)
	}

	if len(violationsJSON) > 0 {
		if unmarshalErr := json.Unmarshal(violationsJSON, &result.Violations); unmarshalErr != nil {
			result.Violations = []models.ModerationViolation{}
		}
	}

	return &result, nil
}

// UpsertCachedDecision stores a moderation decision for cache reuse.
func (r *ModerationRepository) UpsertCachedDecision(ctx context.Context, fingerprint string, result models.ModerationResult, ttl time.Duration) error {
	if fingerprint == "" || ttl <= 0 {
		return nil
	}

	violationsJSON, err := json.Marshal(result.Violations)
	if err != nil {
		violationsJSON = []byte("[]")
	}

	expiresAt := time.Now().Add(ttl)

	_, err = r.db.Exec(ctx, `
		INSERT INTO moderation_decisions_cache (
			fingerprint, decision, severity, flag_profile, violations, summary, source, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (fingerprint) DO UPDATE SET
			decision = EXCLUDED.decision,
			severity = EXCLUDED.severity,
			flag_profile = EXCLUDED.flag_profile,
			violations = EXCLUDED.violations,
			summary = EXCLUDED.summary,
			source = EXCLUDED.source,
			expires_at = EXCLUDED.expires_at,
			created_at = NOW()
	`,
		fingerprint,
		result.Decision,
		result.Severity,
		result.FlagProfile,
		violationsJSON,
		result.Summary,
		result.Source,
		expiresAt,
	)
	if err != nil {
		return fmt.Errorf("upsert cached decision: %w", err)
	}

	return nil
}

// InsertAudit appends an immutable moderation audit record.
func (r *ModerationRepository) InsertAudit(
	ctx context.Context,
	listingID *int,
	userID *string,
	fingerprint string,
	result models.ModerationResult,
) error {
	violationsJSON, err := json.Marshal(result.Violations)
	if err != nil {
		violationsJSON = []byte("[]")
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO listing_moderation_audit (
			listing_id, user_id, content_fingerprint, decision, severity,
			flag_profile, violations, summary, source, model, raw_response
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		listingID,
		userID,
		fingerprint,
		result.Decision,
		result.Severity,
		result.FlagProfile,
		violationsJSON,
		result.Summary,
		result.Source,
		result.Model,
		result.RawResponse,
	)
	if err != nil {
		return fmt.Errorf("insert moderation audit: %w", err)
	}

	return nil
}

// RecordViolationIfNew inserts a deduped violation event and increments user count once per fingerprint.
func (r *ModerationRepository) RecordViolationIfNew(
	ctx context.Context,
	userID string,
	listingID *int,
	fingerprint string,
	result models.ModerationResult,
	autoFlagThreshold int,
) (bool, int, bool, error) {
	if userID == "" || fingerprint == "" {
		return false, 0, false, nil
	}
	if autoFlagThreshold <= 0 {
		autoFlagThreshold = 3
	}

	violationsJSON, err := json.Marshal(result.Violations)
	if err != nil {
		violationsJSON = []byte("[]")
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return false, 0, false, fmt.Errorf("begin violation tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var insertedEventID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO user_violation_events (
			user_id, listing_id, content_fingerprint, decision, severity, violations, summary
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id, content_fingerprint) DO NOTHING
		RETURNING id
	`,
		userID,
		listingID,
		fingerprint,
		result.Decision,
		result.Severity,
		violationsJSON,
		result.Summary,
	).Scan(&insertedEventID)

	inserted := true
	if err == pgx.ErrNoRows {
		inserted = false
	} else if err != nil {
		return false, 0, false, fmt.Errorf("insert violation event: %w", err)
	}

	var count int
	var isFlagged bool
	if inserted {
		err = tx.QueryRow(ctx, `
			UPDATE users
			SET violation_count = violation_count + 1,
			    is_flagged = CASE
			        WHEN violation_count + 1 >= $2 THEN TRUE
			        ELSE is_flagged
			    END,
			    updated_at = NOW()
			WHERE id = $1
			RETURNING violation_count, is_flagged
		`, userID, autoFlagThreshold).Scan(&count, &isFlagged)
		if err != nil {
			return false, 0, false, fmt.Errorf("increment user violations: %w", err)
		}
	} else {
		err = tx.QueryRow(ctx, `
			SELECT violation_count, is_flagged
			FROM users
			WHERE id = $1
		`, userID).Scan(&count, &isFlagged)
		if err != nil {
			return false, 0, false, fmt.Errorf("read existing user violations: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return false, 0, false, fmt.Errorf("commit violation tx: %w", err)
	}

	return inserted, count, isFlagged, nil
}

// GetViolationHistory returns user violation events for admin inspection.
func (r *ModerationRepository) GetViolationHistory(ctx context.Context, userID string, limit, offset int) ([]models.ViolationEvent, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, listing_id, content_fingerprint, decision, severity, violations, summary, created_at
		FROM user_violation_events
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query violation history: %w", err)
	}
	defer rows.Close()

	var events []models.ViolationEvent
	for rows.Next() {
		var e models.ViolationEvent
		var violationsJSON []byte
		if scanErr := rows.Scan(
			&e.ID,
			&e.UserID,
			&e.ListingID,
			&e.ContentFingerprint,
			&e.Decision,
			&e.Severity,
			&violationsJSON,
			&e.Summary,
			&e.CreatedAt,
		); scanErr != nil {
			return nil, fmt.Errorf("scan violation history: %w", scanErr)
		}
		if len(violationsJSON) > 0 {
			if unmarshalErr := json.Unmarshal(violationsJSON, &e.Violations); unmarshalErr != nil {
				e.Violations = []models.ModerationViolation{}
			}
		}
		events = append(events, e)
	}

	return events, nil
}

// GetIdempotencyRecord returns a stored publish response for idempotent retries.
func (r *ModerationRepository) GetIdempotencyRecord(ctx context.Context, userID, key string, now time.Time) (*IdempotencyRecord, error) {
	if userID == "" || key == "" {
		return nil, nil
	}

	var record IdempotencyRecord
	err := r.db.QueryRow(ctx, `
		SELECT request_fingerprint, response_status, response_body, expires_at
		FROM moderation_idempotency_keys
		WHERE user_id = $1 AND idempotency_key = $2
		  AND expires_at > $3
	`, userID, key, now).Scan(
		&record.RequestFingerprint,
		&record.ResponseStatus,
		&record.ResponseBody,
		&record.ExpiresAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get idempotency record: %w", err)
	}

	return &record, nil
}

// SaveIdempotencyRecord stores a publish response for replay-safe retries.
func (r *ModerationRepository) SaveIdempotencyRecord(
	ctx context.Context,
	userID string,
	key string,
	requestFingerprint string,
	responseStatus int,
	responseBody any,
	ttl time.Duration,
) error {
	if userID == "" || key == "" || requestFingerprint == "" || ttl <= 0 {
		return nil
	}

	responseJSON, err := json.Marshal(responseBody)
	if err != nil {
		responseJSON = []byte("{}")
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO moderation_idempotency_keys (
			user_id, idempotency_key, request_fingerprint, response_status, response_body, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, idempotency_key) DO NOTHING
	`, userID, key, requestFingerprint, responseStatus, responseJSON, time.Now().Add(ttl))
	if err != nil {
		return fmt.Errorf("save idempotency record: %w", err)
	}

	return nil
}

// PurgeExpiredEntries removes expired cache/idempotency entries.
func (r *ModerationRepository) PurgeExpiredEntries(ctx context.Context, now time.Time) error {
	if _, err := r.db.Exec(ctx, `DELETE FROM moderation_decisions_cache WHERE expires_at <= $1`, now); err != nil {
		return fmt.Errorf("purge moderation cache: %w", err)
	}
	if _, err := r.db.Exec(ctx, `DELETE FROM moderation_idempotency_keys WHERE expires_at <= $1`, now); err != nil {
		return fmt.Errorf("purge idempotency keys: %w", err)
	}
	return nil
}
