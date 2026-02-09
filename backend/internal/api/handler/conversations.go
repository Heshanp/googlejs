package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/ws"
)

var conversationRepo *repository.ConversationRepository
var messageRepo *repository.MessageRepository

// SetConversationRepo sets the conversation repository dependency
func SetConversationRepo(repo *repository.ConversationRepository) {
	conversationRepo = repo
}

// SetMessageRepo sets the message repository dependency
func SetMessageRepo(repo *repository.MessageRepository) {
	messageRepo = repo
}

// GetConversations handles GET /api/conversations
func GetConversations(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse pagination params
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	conversations, err := conversationRepo.GetByUserID(context.Background(), userID.(string), limit, offset)
	if err != nil {
		log.Printf("Error fetching conversations: %v", err)
		http.Error(w, "Failed to fetch conversations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"conversations": conversations,
		"total":         len(conversations),
	})
}

// CreateConversation handles POST /api/conversations
func CreateConversation(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	var input struct {
		ListingID string `json:"listingId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	input.ListingID = strings.TrimSpace(input.ListingID)
	if input.ListingID == "" {
		http.Error(w, "listingId is required", http.StatusBadRequest)
		return
	}

	if listingRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	resolvedListingID, err := listingRepo.ResolveID(r.Context(), input.ListingID)
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			http.Error(w, "Listing not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Invalid listing ID", http.StatusBadRequest)
		return
	}

	// Get listing to find seller
	listing, err := listingRepo.GetByID(r.Context(), resolvedListingID)
	if err != nil {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}
	if !isPublicListingStatus(listing.Status) {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	// Seller ID from listing
	if listing.UserID == nil {
		http.Error(w, "Listing has no owner", http.StatusBadRequest)
		return
	}
	sellerID := *listing.UserID

	// Prevent seller from messaging themselves
	if sellerID == userIDStr {
		http.Error(w, "Cannot start conversation with yourself", http.StatusBadRequest)
		return
	}

	// Create or get existing conversation
	conversation, err := conversationRepo.Create(r.Context(), models.CreateConversationInput{
		ListingID: resolvedListingID,
		BuyerID:   userIDStr,
		SellerID:  sellerID,
	})
	if err != nil {
		log.Printf("Error creating conversation: %v", err)
		http.Error(w, "Failed to create conversation", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(conversation)
}

// GetConversationMessages handles GET /api/conversations/:id/messages
func GetConversationMessages(w http.ResponseWriter, r *http.Request, conversationID string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	// Verify user is participant
	isParticipant, err := conversationRepo.IsParticipant(context.Background(), conversationID, userIDStr)
	if err != nil || !isParticipant {
		http.Error(w, "Conversation not found", http.StatusNotFound)
		return
	}

	// Parse pagination params
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	messages, err := messageRepo.GetByConversationID(context.Background(), conversationID, limit, offset)
	if err != nil {
		log.Printf("Error fetching messages: %v", err)
		http.Error(w, "Failed to fetch messages", http.StatusInternalServerError)
		return
	}

	// NOTE: Do NOT auto-mark as read here - messages are marked read
	// only when frontend explicitly calls POST /api/conversations/:id/read
	// This ensures messages aren't marked read for background tabs

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages": messages,
		"total":    len(messages),
	})
}

// GetConversationByID handles GET /api/conversations/:id
func GetConversationByID(w http.ResponseWriter, r *http.Request, conversationID string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Verify user is participant
	isParticipant, err := conversationRepo.IsParticipant(context.Background(), conversationID, userID.(string))
	if err != nil || !isParticipant {
		http.Error(w, "Conversation not found", http.StatusNotFound)
		return
	}

	conversation, err := conversationRepo.GetByID(context.Background(), conversationID)
	if err != nil {
		http.Error(w, "Conversation not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(conversation)
}

// CreateMessage handles POST /api/conversations/:id/messages
func CreateMessage(w http.ResponseWriter, r *http.Request, conversationID string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	// Verify user is participant
	isParticipant, err := conversationRepo.IsParticipant(context.Background(), conversationID, userIDStr)
	if err != nil || !isParticipant {
		http.Error(w, "Conversation not found", http.StatusNotFound)
		return
	}

	var input struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if input.Content == "" {
		http.Error(w, "content is required", http.StatusBadRequest)
		return
	}

	// Validate message length (max 10KB)
	if len(input.Content) > 10000 {
		http.Error(w, "message too long (max 10000 characters)", http.StatusBadRequest)
		return
	}

	// Create message
	message, err := messageRepo.Create(context.Background(), models.CreateMessageInput{
		ConversationID: conversationID,
		SenderID:       userIDStr,
		Content:        input.Content,
	})
	if err != nil {
		log.Printf("Error creating message: %v", err)
		http.Error(w, "Failed to create message", http.StatusInternalServerError)
		return
	}

	// Update conversation's last_message_at
	if err := conversationRepo.UpdateLastMessageTime(context.Background(), conversationID); err != nil {
		log.Printf("Error updating conversation timestamp: %v", err)
	}

	// Broadcast new message via WebSocket (keeps other tabs/clients in sync).
	if hub := getWSHub(); hub != nil {
		conv, err := conversationRepo.GetByID(context.Background(), conversationID)
		if err != nil {
			log.Printf("Error fetching conversation for WS broadcast: %v", err)
		} else {
			hub.Broadcast(&ws.BroadcastTarget{
				UserIDs: []string{conv.BuyerID, conv.SellerID},
				Message: &ws.OutboundMessage{
					Type:           ws.TypeNewMessage,
					ConversationID: conversationID,
					Message:        message,
					UserID:         userIDStr,
					Timestamp:      time.Now(),
				},
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(message)
}

// MarkAsRead handles POST /api/conversations/:id/read
func MarkAsRead(w http.ResponseWriter, r *http.Request, conversationID string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	// Verify user is participant
	isParticipant, err := conversationRepo.IsParticipant(context.Background(), conversationID, userIDStr)
	if err != nil || !isParticipant {
		http.Error(w, "Conversation not found", http.StatusNotFound)
		return
	}

	// Mark all messages as read
	if err := messageRepo.MarkAllAsRead(context.Background(), conversationID, userIDStr); err != nil {
		log.Printf("Error marking messages as read: %v", err)
		http.Error(w, "Failed to mark as read", http.StatusInternalServerError)
		return
	}

	// Fetch latest message ID from the other participant for read receipt accuracy.
	latestMessageID, err := messageRepo.GetLatestMessageIDFromOtherUser(context.Background(), conversationID, userIDStr)
	if err != nil {
		log.Printf("Error fetching latest message ID for read receipt: %v", err)
		latestMessageID = ""
	}

	// Notify the other participant via WebSocket.
	if hub := getWSHub(); hub != nil {
		conv, err := conversationRepo.GetByID(context.Background(), conversationID)
		if err != nil {
			log.Printf("Error fetching conversation for read receipt WS broadcast: %v", err)
		} else {
			otherUserID := conv.BuyerID
			if userIDStr == conv.BuyerID {
				otherUserID = conv.SellerID
			}

			hub.Broadcast(&ws.BroadcastTarget{
				UserIDs: []string{otherUserID},
				Message: &ws.OutboundMessage{
					Type:           ws.TypeReadReceipt,
					ConversationID: conversationID,
					UserID:         userIDStr,
					MessageID:      latestMessageID,
					Timestamp:      time.Now(),
				},
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// HandleConversationRoutes routes conversation-related requests
func HandleConversationRoutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/conversations")
	path = strings.TrimPrefix(path, "/")

	// GET /api/conversations
	if path == "" {
		switch r.Method {
		case http.MethodGet:
			GetConversations(w, r)
		case http.MethodPost:
			CreateConversation(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Split path for sub-routes
	parts := strings.Split(path, "/")
	conversationID := parts[0]

	// GET/POST /api/conversations/:id/messages
	if len(parts) >= 2 && parts[1] == "messages" {
		switch r.Method {
		case http.MethodGet:
			GetConversationMessages(w, r, conversationID)
		case http.MethodPost:
			CreateMessage(w, r, conversationID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// POST /api/conversations/:id/read
	if len(parts) >= 2 && parts[1] == "read" {
		if r.Method == http.MethodPost {
			MarkAsRead(w, r, conversationID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// GET /api/conversations/:id/offers
	if len(parts) >= 2 && parts[1] == "offers" {
		if r.Method == http.MethodGet {
			GetOffersForConversation(w, r, conversationID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// GET /api/conversations/:id
	if r.Method == http.MethodGet {
		GetConversationByID(w, r, conversationID)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}
