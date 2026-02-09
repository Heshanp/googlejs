package ws

import (
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
)

// MessageType defines the type of WebSocket message
type MessageType string

const (
	// Inbound message types (client -> server)
	TypeSendMessage  MessageType = "send_message"
	TypeTyping       MessageType = "typing"
	TypeMarkRead     MessageType = "mark_read"
	TypePing         MessageType = "ping"
	TypeSendOffer    MessageType = "send_offer"    // New offer via WebSocket
	TypeRespondOffer MessageType = "respond_offer" // Accept/reject offer via WebSocket

	// Outbound message types (server -> client)
	TypeNewMessage   MessageType = "new_message"
	TypeTypingNotify MessageType = "typing_notify"
	TypeReadReceipt  MessageType = "read_receipt"
	TypePong         MessageType = "pong"
	TypeError        MessageType = "error"
	TypeNewOffer     MessageType = "new_offer"    // Notify recipient of new offer
	TypeOfferUpdate  MessageType = "offer_update" // Notify of offer status change
	TypeNotification MessageType = "notification" // General notification (price drop, deal alert, etc.)
)

// InboundMessage represents a message from client to server
type InboundMessage struct {
	Type           MessageType `json:"type"`
	ConversationID string      `json:"conversationId,omitempty"`
	Content        string      `json:"content,omitempty"`
	MessageID      string      `json:"messageId,omitempty"`
	// Offer-related fields
	OfferID     string `json:"offerId,omitempty"`
	OfferAmount int    `json:"offerAmount,omitempty"`
	Accept      *bool  `json:"accept,omitempty"` // For respond_offer
}

// OutboundMessage represents a message from server to client
type OutboundMessage struct {
	Type           MessageType            `json:"type"`
	ConversationID string                 `json:"conversationId,omitempty"`
	Message        *models.Message        `json:"message,omitempty"`
	Offer          *models.Offer          `json:"offer,omitempty"`        // For offer notifications
	Notification   *models.Notification   `json:"notification,omitempty"` // For general notifications
	UserID         string                 `json:"userId,omitempty"`
	MessageID      string                 `json:"messageId,omitempty"`
	Error          string                 `json:"error,omitempty"`
	Timestamp      time.Time              `json:"timestamp"`
}

// BroadcastTarget specifies who should receive a broadcast
type BroadcastTarget struct {
	UserIDs []string
	Message *OutboundMessage
}
