package models

import "time"

// Conversation represents a chat between buyer and seller about a listing
type Conversation struct {
	ID              string    `json:"id"`
	ListingID       int       `json:"listingId"`
	ListingPublicID string    `json:"listingPublicId,omitempty"`
	BuyerID         string    `json:"buyerId"`
	SellerID        string    `json:"sellerId"`
	LastMessageAt   time.Time `json:"lastMessageAt"`
	CreatedAt       time.Time `json:"createdAt"`

	// Joined fields (not stored in conversations table)
	ListingTitle                string     `json:"listingTitle,omitempty"`
	ListingImage                string     `json:"listingImage,omitempty"`
	ListingPrice                int        `json:"listingPrice,omitempty"`
	ListingStatus               string     `json:"listingStatus,omitempty"`
	ListingReservationExpiresAt *time.Time `json:"listingReservationExpiresAt,omitempty"`
	ListingReservedFor          *string    `json:"listingReservedFor,omitempty"`
	ListingSellerId             *string    `json:"listingSellerId,omitempty"`
	OtherUserName               string     `json:"otherUserName,omitempty"`
	OtherUserImage              string     `json:"otherUserImage,omitempty"`
	UnreadCount                 int        `json:"unreadCount,omitempty"`
	LastMessage                 string     `json:"lastMessage,omitempty"`

	// Participant names/avatars (for single conversation fetch)
	BuyerName    string `json:"buyerName,omitempty"`
	SellerName   string `json:"sellerName,omitempty"`
	BuyerAvatar  string `json:"buyerAvatar,omitempty"`
	SellerAvatar string `json:"sellerAvatar,omitempty"`
}

// Message represents a single message in a conversation
type Message struct {
	ID             string     `json:"id"`
	ConversationID string     `json:"conversationId"`
	SenderID       string     `json:"senderId"`
	Content        string     `json:"content"`
	ReadAt         *time.Time `json:"readAt,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
}

// CreateConversationInput contains fields for creating a new conversation
type CreateConversationInput struct {
	ListingID int
	BuyerID   string
	SellerID  string
}

// CreateMessageInput contains fields for creating a new message
type CreateMessageInput struct {
	ConversationID string
	SenderID       string
	Content        string
}
