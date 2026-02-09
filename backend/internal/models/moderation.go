package models

import "time"

// ModerationDecision is the normalized outcome for publish moderation.
type ModerationDecision string

const (
	ModerationDecisionClean        ModerationDecision = "clean"
	ModerationDecisionFlagged      ModerationDecision = "flagged"
	ModerationDecisionReviewNeeded ModerationDecision = "review_required"
)

// ModerationSeverity indicates policy severity.
type ModerationSeverity string

const (
	ModerationSeverityClean    ModerationSeverity = "clean"
	ModerationSeverityMedium   ModerationSeverity = "medium"
	ModerationSeverityHigh     ModerationSeverity = "high"
	ModerationSeverityCritical ModerationSeverity = "critical"
)

// ListingModerationStatus tracks moderation lifecycle on listing rows.
type ListingModerationStatus string

const (
	ListingModerationStatusNotReviewed   ListingModerationStatus = "not_reviewed"
	ListingModerationStatusClean         ListingModerationStatus = "clean"
	ListingModerationStatusPendingReview ListingModerationStatus = "pending_review"
	ListingModerationStatusFlagged       ListingModerationStatus = "flagged"
	ListingModerationStatusApproved      ListingModerationStatus = "approved"
	ListingModerationStatusRejected      ListingModerationStatus = "rejected"
	ListingModerationStatusError         ListingModerationStatus = "error"
)

// ModerationViolation describes one policy hit.
type ModerationViolation struct {
	Code     string             `json:"code"`
	Category string             `json:"category"`
	Severity ModerationSeverity `json:"severity"`
	Reason   string             `json:"reason"`
}

// ModerationResult is the normalized moderation output used by handlers.
type ModerationResult struct {
	Decision    ModerationDecision    `json:"decision"`
	Severity    ModerationSeverity    `json:"severity"`
	FlagProfile bool                  `json:"flag_profile"`
	Violations  []ModerationViolation `json:"violations"`
	Summary     string                `json:"summary"`
	Source      string                `json:"source,omitempty"`
	Model       string                `json:"model,omitempty"`
	RawResponse string                `json:"-"`
}

// ModerationAuditRecord represents persisted moderation evidence.
type ModerationAuditRecord struct {
	ID                 int64                 `json:"id"`
	ListingID          *int                  `json:"listingId,omitempty"`
	UserID             *string               `json:"userId,omitempty"`
	ContentFingerprint string                `json:"contentFingerprint"`
	Decision           ModerationDecision    `json:"decision"`
	Severity           ModerationSeverity    `json:"severity"`
	FlagProfile        bool                  `json:"flagProfile"`
	Violations         []ModerationViolation `json:"violations"`
	Summary            string                `json:"summary"`
	Source             string                `json:"source"`
	Model              string                `json:"model,omitempty"`
	RawResponse        string                `json:"rawResponse,omitempty"`
	CreatedAt          time.Time             `json:"createdAt"`
}

// ViolationEvent represents one deduplicated violation event.
type ViolationEvent struct {
	ID                 int64                 `json:"id"`
	UserID             string                `json:"userId"`
	ListingID          *int                  `json:"listingId,omitempty"`
	ContentFingerprint string                `json:"contentFingerprint"`
	Decision           ModerationDecision    `json:"decision"`
	Severity           ModerationSeverity    `json:"severity"`
	Violations         []ModerationViolation `json:"violations"`
	Summary            string                `json:"summary"`
	CreatedAt          time.Time             `json:"createdAt"`
}

// IsBlocking reports if publication must be blocked.
func (m ModerationResult) IsBlocking() bool {
	return m.Decision == ModerationDecisionFlagged || m.Decision == ModerationDecisionReviewNeeded
}
