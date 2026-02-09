package models

import "time"

// ListingStatus is the lifecycle status of a listing.
type ListingStatus string

const (
	ListingStatusActive        ListingStatus = "active"
	ListingStatusReserved      ListingStatus = "reserved"
	ListingStatusSold          ListingStatus = "sold"
	ListingStatusDeleted       ListingStatus = "deleted"
	ListingStatusExpired       ListingStatus = "expired"
	ListingStatusPendingReview ListingStatus = "pending_review"
	ListingStatusBlocked       ListingStatus = "blocked"
)

// Listing represents a marketplace listing
type Listing struct {
	ID                    int                     `json:"id"`
	PublicID              string                  `json:"publicId" db:"public_id"`
	UserID                *string                 `json:"userId,omitempty"`
	Title                 string                  `json:"title"`
	Subtitle              string                  `json:"subtitle,omitempty"`
	Description           string                  `json:"description"`
	Price                 int                     `json:"price"`
	Quantity              int                     `json:"quantity"`
	Category              string                  `json:"category"`
	Condition             string                  `json:"condition"`
	Location              string                  `json:"location"`
	Status                string                  `json:"status"`
	CategoryFields        map[string]interface{}  `json:"categoryFields,omitempty"` // Dynamic category-specific fields
	ShippingOptions       map[string]interface{}  `json:"shippingOptions,omitempty"`
	PaymentMethods        map[string]interface{}  `json:"paymentMethods,omitempty"`
	ReturnsPolicy         map[string]interface{}  `json:"returnsPolicy,omitempty"`
	Images                []ListingImage          `json:"images,omitempty"`
	CreatedAt             time.Time               `json:"createdAt"`
	UpdatedAt             time.Time               `json:"updatedAt"`
	ReservedFor           *string                 `json:"reservedFor,omitempty" db:"reserved_for"`
	ReservedAt            *time.Time              `json:"reservedAt,omitempty" db:"reserved_at"`
	ReservationExpiresAt  *time.Time              `json:"reservationExpiresAt,omitempty" db:"reservation_expires_at"`
	ViewCount             int                     `json:"viewCount"`
	LikeCount             int                     `json:"likeCount"`
	ExpiresAt             *time.Time              `json:"expiresAt,omitempty" db:"expires_at"`
	ModerationStatus      ListingModerationStatus `json:"moderationStatus,omitempty" db:"moderation_status"`
	ModerationSeverity    ModerationSeverity      `json:"moderationSeverity,omitempty" db:"moderation_severity"`
	ModerationSummary     string                  `json:"moderationSummary,omitempty" db:"moderation_summary"`
	ModerationFlagProfile bool                    `json:"moderationFlagProfile" db:"moderation_flag_profile"`
	ModerationFingerprint string                  `json:"-" db:"moderation_fingerprint"`
	ModerationCheckedAt   *time.Time              `json:"moderationCheckedAt,omitempty" db:"moderation_checked_at"`
	ModerationOverrideBy  *string                 `json:"moderationOverrideBy,omitempty" db:"moderation_override_by"`
	ModerationOverrideAt  *time.Time              `json:"moderationOverrideAt,omitempty" db:"moderation_override_at"`
}
