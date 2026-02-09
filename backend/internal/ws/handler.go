package ws

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
)

// Simple rate limiter for WebSocket messages
type rateLimiter struct {
	buckets    map[string]*bucket
	mu         sync.RWMutex
	maxTokens  int
	refillRate time.Duration
}

type bucket struct {
	tokens     int
	lastRefill time.Time
}

func newRateLimiter(maxTokens int, refillRate time.Duration) *rateLimiter {
	return &rateLimiter{
		buckets:    make(map[string]*bucket),
		maxTokens:  maxTokens,
		refillRate: refillRate,
	}
}

func (rl *rateLimiter) allow(userID string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	b, exists := rl.buckets[userID]
	if !exists {
		b = &bucket{tokens: rl.maxTokens, lastRefill: time.Now()}
		rl.buckets[userID] = b
	}

	// Refill tokens
	elapsed := time.Since(b.lastRefill)
	tokensToAdd := int(elapsed / rl.refillRate)
	if tokensToAdd > 0 {
		b.tokens += tokensToAdd
		if b.tokens > rl.maxTokens {
			b.tokens = rl.maxTokens
		}
		b.lastRefill = time.Now()
	}

	if b.tokens > 0 {
		b.tokens--
		return true
	}
	return false
}

// Handler processes WebSocket messages and orchestrates chat operations
type Handler struct {
	hub              *Hub
	conversationRepo *repository.ConversationRepository
	messageRepo      *repository.MessageRepository
	rateLimiter      *rateLimiter
}

// NewHandler creates a new WebSocket message handler
func NewHandler(hub *Hub, convRepo *repository.ConversationRepository, msgRepo *repository.MessageRepository) *Handler {
	return &Handler{
		hub:              hub,
		conversationRepo: convRepo,
		messageRepo:      msgRepo,
		rateLimiter:      newRateLimiter(60, time.Second), // 60 messages per minute
	}
}

// HandleMessage processes an inbound WebSocket message
func (h *Handler) HandleMessage(ctx context.Context, client *Client, msg *InboundMessage) {
	switch msg.Type {
	case TypeSendMessage:
		h.handleSendMessage(ctx, client, msg)
	case TypeTyping:
		h.handleTyping(ctx, client, msg)
	case TypeMarkRead:
		h.handleMarkRead(ctx, client, msg)
	case TypeSendOffer:
		h.handleSendOffer(ctx, client, msg)
	case TypeRespondOffer:
		h.handleRespondOffer(ctx, client, msg)
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

// Maximum message content length (10KB)
const maxContentLength = 10000

// handleSendMessage processes a new message from a client
func (h *Handler) handleSendMessage(ctx context.Context, client *Client, msg *InboundMessage) {
	if msg.ConversationID == "" || msg.Content == "" {
		client.sendError("conversationId and content are required")
		return
	}

	// Validate message length
	if len(msg.Content) > maxContentLength {
		client.sendError("message too long (max 10000 characters)")
		return
	}

	// Rate limit check
	if !h.rateLimiter.allow(client.userID) {
		client.sendError("rate limit exceeded - please slow down")
		return
	}

	// Verify user is participant in this conversation
	isParticipant, err := h.conversationRepo.IsParticipant(ctx, msg.ConversationID, client.userID)
	if err != nil {
		log.Printf("Error checking participant: %v", err)
		client.sendError("failed to verify access")
		return
	}
	if !isParticipant {
		client.sendError("not authorized for this conversation")
		return
	}

	// Get conversation to find who to notify
	conv, err := h.conversationRepo.GetByID(ctx, msg.ConversationID)
	if err != nil {
		log.Printf("Error getting conversation: %v", err)
		client.sendError("conversation not found")
		return
	}

	// Persist message to database first (guaranteed delivery)
	savedMsg, err := h.messageRepo.Create(ctx, models.CreateMessageInput{
		ConversationID: msg.ConversationID,
		SenderID:       client.userID,
		Content:        msg.Content,
	})
	if err != nil {
		log.Printf("Error saving message: %v", err)
		client.sendError("failed to save message")
		return
	}

	// Update conversation's last_message_at
	if err := h.conversationRepo.UpdateLastMessageTime(ctx, msg.ConversationID); err != nil {
		log.Printf("Error updating conversation timestamp: %v", err)
	}

	// Broadcast to both participants
	outMsg := &OutboundMessage{
		Type:           TypeNewMessage,
		ConversationID: msg.ConversationID,
		Message:        savedMsg,
		Timestamp:      time.Now(),
	}

	h.hub.Broadcast(&BroadcastTarget{
		UserIDs: []string{conv.BuyerID, conv.SellerID},
		Message: outMsg,
	})
}

// handleTyping broadcasts typing indicator to the other participant
func (h *Handler) handleTyping(ctx context.Context, client *Client, msg *InboundMessage) {
	if msg.ConversationID == "" {
		return
	}

	// Verify participant
	isParticipant, err := h.conversationRepo.IsParticipant(ctx, msg.ConversationID, client.userID)
	if err != nil || !isParticipant {
		return
	}

	// Get conversation to find other participant
	conv, err := h.conversationRepo.GetByID(ctx, msg.ConversationID)
	if err != nil {
		return
	}

	// Determine other user
	otherUserID := conv.BuyerID
	if client.userID == conv.BuyerID {
		otherUserID = conv.SellerID
	}

	// Broadcast typing indicator (ephemeral, no persistence)
	outMsg := &OutboundMessage{
		Type:           TypeTypingNotify,
		ConversationID: msg.ConversationID,
		UserID:         client.userID,
		Timestamp:      time.Now(),
	}

	h.hub.Broadcast(&BroadcastTarget{
		UserIDs: []string{otherUserID},
		Message: outMsg,
	})
}

// handleMarkRead marks messages as read and notifies sender
func (h *Handler) handleMarkRead(ctx context.Context, client *Client, msg *InboundMessage) {
	if msg.ConversationID == "" {
		return
	}

	// Verify participant
	isParticipant, err := h.conversationRepo.IsParticipant(ctx, msg.ConversationID, client.userID)
	if err != nil || !isParticipant {
		return
	}

	// Mark all messages as read (or up to specific messageID if provided)
	if msg.MessageID != "" {
		err = h.messageRepo.MarkAsRead(ctx, msg.ConversationID, client.userID, msg.MessageID)
	} else {
		err = h.messageRepo.MarkAllAsRead(ctx, msg.ConversationID, client.userID)
	}

	if err != nil {
		log.Printf("Error marking messages as read: %v", err)
		return
	}

	// Get conversation to notify other participant
	conv, err := h.conversationRepo.GetByID(ctx, msg.ConversationID)
	if err != nil {
		return
	}

	broadcastMessageID := msg.MessageID
	if broadcastMessageID == "" {
		lastID, err := h.messageRepo.GetLatestMessageIDFromOtherUser(ctx, msg.ConversationID, client.userID)
		if err != nil {
			log.Printf("Error fetching latest message ID for read receipt: %v", err)
		} else {
			broadcastMessageID = lastID
		}
	}

	// Determine other user
	otherUserID := conv.BuyerID
	if client.userID == conv.BuyerID {
		otherUserID = conv.SellerID
	}

	// Broadcast read receipt
	outMsg := &OutboundMessage{
		Type:           TypeReadReceipt,
		ConversationID: msg.ConversationID,
		UserID:         client.userID,
		MessageID:      broadcastMessageID,
		Timestamp:      time.Now(),
	}

	h.hub.Broadcast(&BroadcastTarget{
		UserIDs: []string{otherUserID},
		Message: outMsg,
	})
}

// handleSendOffer processes sending a new offer via WebSocket
// Note: For now, offers are primarily sent via REST API, but this provides
// real-time notification capability when offers are created through any channel
func (h *Handler) handleSendOffer(ctx context.Context, client *Client, msg *InboundMessage) {
	if msg.ConversationID == "" || msg.OfferAmount <= 0 {
		client.sendError("conversationId and offerAmount are required")
		return
	}

	// Rate limit check
	if !h.rateLimiter.allow(client.userID) {
		client.sendError("rate limit exceeded - please slow down")
		return
	}

	// Verify user is participant in this conversation
	isParticipant, err := h.conversationRepo.IsParticipant(ctx, msg.ConversationID, client.userID)
	if err != nil || !isParticipant {
		client.sendError("not authorized for this conversation")
		return
	}

	// Get conversation to find recipient
	conv, err := h.conversationRepo.GetByID(ctx, msg.ConversationID)
	if err != nil {
		log.Printf("Error getting conversation: %v", err)
		client.sendError("conversation not found")
		return
	}

	// Determine recipient (the other party)
	recipientID := conv.BuyerID
	if client.userID == conv.BuyerID {
		recipientID = conv.SellerID
	}

	// Note: The actual offer creation should happen via REST API (handler/offers.go)
	// This WebSocket handler is for broadcasting offer notifications in real-time
	// When using WS for offers, we would need to inject offerRepo here
	// For now, we broadcast a notification to alert the other party

	outMsg := &OutboundMessage{
		Type:           TypeNewOffer,
		ConversationID: msg.ConversationID,
		UserID:         client.userID,
		Timestamp:      time.Now(),
	}

	h.hub.Broadcast(&BroadcastTarget{
		UserIDs: []string{recipientID},
		Message: outMsg,
	})
}

// handleRespondOffer processes offer response notifications via WebSocket
func (h *Handler) handleRespondOffer(ctx context.Context, client *Client, msg *InboundMessage) {
	if msg.OfferID == "" || msg.Accept == nil {
		client.sendError("offerId and accept are required")
		return
	}

	// Verify conversation access
	if msg.ConversationID != "" {
		isParticipant, err := h.conversationRepo.IsParticipant(ctx, msg.ConversationID, client.userID)
		if err != nil || !isParticipant {
			client.sendError("not authorized for this conversation")
			return
		}
	}

	// Get conversation to find who to notify
	conv, err := h.conversationRepo.GetByID(ctx, msg.ConversationID)
	if err != nil {
		log.Printf("Error getting conversation: %v", err)
		client.sendError("conversation not found")
		return
	}

	// Determine other user
	otherUserID := conv.BuyerID
	if client.userID == conv.BuyerID {
		otherUserID = conv.SellerID
	}

	// Broadcast offer update notification
	outMsg := &OutboundMessage{
		Type:           TypeOfferUpdate,
		ConversationID: msg.ConversationID,
		UserID:         client.userID,
		Timestamp:      time.Now(),
	}

	h.hub.Broadcast(&BroadcastTarget{
		UserIDs: []string{otherUserID},
		Message: outMsg,
	})
}

// SendToUser sends a message to a specific user (for external use)
func (h *Handler) SendToUser(userID string, msg *OutboundMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.hub.mu.RLock()
	defer h.hub.mu.RUnlock()

	if clients, ok := h.hub.clients[userID]; ok {
		for client := range clients {
			client.Send(data)
		}
	}
}
