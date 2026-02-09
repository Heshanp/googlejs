package models

import "time"

// OfferStatus defines the state of an offer
type OfferStatus string

const (
	OfferStatusPending   OfferStatus = "pending"
	OfferStatusAccepted  OfferStatus = "accepted"
	OfferStatusRejected  OfferStatus = "rejected"
	OfferStatusCountered OfferStatus = "countered"
	OfferStatusExpired   OfferStatus = "expired"
	OfferStatusWithdrawn OfferStatus = "withdrawn"
)

// Offer represents a price negotiation offer between buyer and seller
type Offer struct {
	ID             string      `json:"id"`
	ListingID      int         `json:"listingId"`
	ConversationID string      `json:"conversationId"`
	SenderID       string      `json:"senderId"`
	RecipientID    string      `json:"recipientId"`
	Amount         int         `json:"amount"` // Price in cents
	Status         OfferStatus `json:"status"`
	Message        *string     `json:"message,omitempty"`
	ParentOfferID  *string     `json:"parentOfferId,omitempty"`
	ExpiresAt      *time.Time  `json:"expiresAt,omitempty"`
	RespondedAt    *time.Time  `json:"respondedAt,omitempty"`
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt"`

	// Joined fields (not stored in offers table)
	SenderName   string `json:"senderName,omitempty"`
	ListingTitle string `json:"listingTitle,omitempty"`
	ListingPrice int    `json:"listingPrice,omitempty"`
}

// CreateOfferInput contains fields for creating a new offer
type CreateOfferInput struct {
	ListingID      int
	ConversationID string
	SenderID       string
	RecipientID    string
	Amount         int
	Message        *string
	ParentOfferID  *string
}

// RespondOfferInput contains fields for responding to an offer
type RespondOfferInput struct {
	OfferID string
	UserID  string
	Accept  bool
}

// CounterOfferInput contains fields for making a counter-offer
type CounterOfferInput struct {
	OriginalOfferID string
	SenderID        string
	Amount          int
	Message         *string
}
