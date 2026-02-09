package models

import "time"

// NotificationType defines the type of notification
type NotificationType string

const (
	NotificationTypeMessage       NotificationType = "message"
	NotificationTypeLike          NotificationType = "like"
	NotificationTypeOffer         NotificationType = "offer"
	NotificationTypeReview        NotificationType = "review"
	NotificationTypeSystem        NotificationType = "system"
	NotificationTypePriceDrop     NotificationType = "price_drop"
	NotificationTypeListingSold   NotificationType = "listing_sold"
	NotificationTypeOfferAccepted NotificationType = "offer_accepted"
	NotificationTypeDealAlert     NotificationType = "deal_alert"
)

// Notification represents a user notification
type Notification struct {
	ID              int64            `json:"id"`
	UserID          string           `json:"userId"`
	Type            NotificationType `json:"type"`
	Title           string           `json:"title"`
	Body            string           `json:"body"`
	ListingID       *int64           `json:"listingId,omitempty"`
	ListingPublicID *string          `json:"listingPublicId,omitempty"`
	ConversationID  *string          `json:"conversationId,omitempty"`
	ActorID         *string          `json:"actorId,omitempty"`
	IsRead          bool             `json:"isRead"`
	ReadAt          *time.Time       `json:"readAt,omitempty"`
	Metadata        map[string]any   `json:"metadata,omitempty"`
	CreatedAt       time.Time        `json:"createdAt"`
}

// CreateNotificationInput contains fields for creating a notification
type CreateNotificationInput struct {
	UserID         string
	Type           NotificationType
	Title          string
	Body           string
	ListingID      *int64
	ConversationID *string
	ActorID        *string
	Metadata       map[string]any
}

// PriceDropMetadata contains additional data for price drop notifications
type PriceDropMetadata struct {
	OldPrice         int     `json:"oldPrice"`
	NewPrice         int     `json:"newPrice"`
	PriceWhenLiked   int     `json:"priceWhenLiked"`
	SavingsAmount    int     `json:"savingsAmount"`
	SavingsPercent   float64 `json:"savingsPercent"`
	MarketComparison *string `json:"marketComparison,omitempty"` // e.g., "30% below market average"
}

// DealAlertMetadata contains additional data for deal alert notifications
type DealAlertMetadata struct {
	MarketAvgPrice    int    `json:"marketAvgPrice"`
	MarketMedianPrice int    `json:"marketMedianPrice"`
	PricePosition     string `json:"pricePosition"` // "great_deal", "below_average", etc.
	Percentile        int    `json:"percentile"`    // cheaper than X% of similar listings
	MatchReason       string `json:"matchReason"`   // Why this matches user interests
	SimilarCount      int    `json:"similarCount"`  // Number of similar listings compared
}

// PriceHistory represents a single price change record
type PriceHistory struct {
	ID        int64     `json:"id"`
	ListingID int64     `json:"listingId"`
	OldPrice  int       `json:"oldPrice"`
	NewPrice  int       `json:"newPrice"`
	ChangedAt time.Time `json:"changedAt"`
}
