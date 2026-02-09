package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/ws"
)

var offerRepo *repository.OfferRepository

// SetOfferRepo sets the offer repository dependency
func SetOfferRepo(repo *repository.OfferRepository) {
	offerRepo = repo
}

// CreateOffer handles POST /api/offers
func CreateOffer(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)
	log.Printf("CreateOffer: userID=%s", userIDStr)

	var input struct {
		ConversationID string  `json:"conversationId"`
		Amount         int     `json:"amount"`
		Message        *string `json:"message,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Printf("CreateOffer: invalid request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("CreateOffer: input=%+v", input)

	if input.ConversationID == "" {
		log.Printf("CreateOffer: conversationId is empty")
		http.Error(w, "conversationId is required", http.StatusBadRequest)
		return
	}

	if input.Amount <= 0 {
		log.Printf("CreateOffer: amount=%d is not positive", input.Amount)
		http.Error(w, "amount must be greater than 0", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Check for existing pending offer in this conversation (ignore "no rows" error)
	existingOffer, err := offerRepo.GetPendingForConversation(ctx, input.ConversationID)
	if err != nil {
		log.Printf("CreateOffer: GetPendingForConversation error (expected if no pending): %v", err)
	}
	if existingOffer != nil {
		log.Printf("CreateOffer: found existing pending offer")
		http.Error(w, "There is already a pending offer in this conversation", http.StatusConflict)
		return
	}

	// Get conversation to find listing and participants
	log.Printf("CreateOffer: fetching conversation %s", input.ConversationID)
	conv, err := conversationRepo.GetByID(ctx, input.ConversationID)
	if err != nil {
		log.Printf("CreateOffer: GetByID error: %v", err)
		http.Error(w, "Conversation not found", http.StatusNotFound)
		return
	}
	log.Printf("CreateOffer: conversation found - listingID=%d, buyerID=%s, sellerID=%s", conv.ListingID, conv.BuyerID, conv.SellerID)

	// Verify user is participant
	if conv.BuyerID != userIDStr && conv.SellerID != userIDStr {
		log.Printf("CreateOffer: user %s not participant in conversation", userIDStr)
		http.Error(w, "Not authorized for this conversation", http.StatusForbidden)
		return
	}

	// Determine recipient (the other party)
	recipientID := conv.BuyerID
	if userIDStr == conv.BuyerID {
		recipientID = conv.SellerID
	}
	log.Printf("CreateOffer: recipientID=%s", recipientID)

	// Create the offer
	log.Printf("CreateOffer: creating offer - listingID=%d, convID=%s, senderID=%s, recipientID=%s, amount=%d",
		conv.ListingID, input.ConversationID, userIDStr, recipientID, input.Amount)
	offer, err := offerRepo.Create(ctx, models.CreateOfferInput{
		ListingID:      conv.ListingID,
		ConversationID: input.ConversationID,
		SenderID:       userIDStr,
		RecipientID:    recipientID,
		Amount:         input.Amount,
		Message:        input.Message,
	})
	if err != nil {
		log.Printf("CreateOffer: offerRepo.Create error: %v", err)
		http.Error(w, "Failed to create offer", http.StatusInternalServerError)
		return
	}
	log.Printf("CreateOffer: offer created successfully with ID=%s", offer.ID)

	// Broadcast new offer via WebSocket so other tabs/clients update instantly.
	if hub := getWSHub(); hub != nil {
		hub.Broadcast(&ws.BroadcastTarget{
			UserIDs: []string{recipientID, userIDStr},
			Message: &ws.OutboundMessage{
				Type:           ws.TypeNewOffer,
				ConversationID: offer.ConversationID,
				Offer:          offer,
				UserID:         userIDStr,
				Timestamp:      time.Now(),
			},
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(offer)
}

// GetOffersForConversation handles GET /api/conversations/:id/offers
func GetOffersForConversation(w http.ResponseWriter, r *http.Request, conversationID string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	ctx := context.Background()

	// Verify user is participant
	isParticipant, err := conversationRepo.IsParticipant(ctx, conversationID, userIDStr)
	if err != nil || !isParticipant {
		http.Error(w, "Conversation not found", http.StatusNotFound)
		return
	}

	offers, err := offerRepo.GetByConversationID(ctx, conversationID)
	if err != nil {
		log.Printf("Error fetching offers: %v", err)
		http.Error(w, "Failed to fetch offers", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"offers": offers,
		"total":  len(offers),
	})
}

// RespondToOffer handles POST /api/offers/:id/respond
func RespondToOffer(w http.ResponseWriter, r *http.Request, offerID string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	var input struct {
		Accept bool `json:"accept"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Verify user is the recipient
	isRecipient, err := offerRepo.IsRecipient(ctx, offerID, userIDStr)
	if err != nil {
		http.Error(w, "Offer not found", http.StatusNotFound)
		return
	}
	if !isRecipient {
		http.Error(w, "Only the recipient can respond to this offer", http.StatusForbidden)
		return
	}

	// Get the offer to check status
	offer, err := offerRepo.GetByID(ctx, offerID)
	if err != nil {
		http.Error(w, "Offer not found", http.StatusNotFound)
		return
	}

	if offer.Status != models.OfferStatusPending {
		http.Error(w, "Offer is no longer pending", http.StatusConflict)
		return
	}

	// Update status
	var newStatus models.OfferStatus
	if input.Accept {
		newStatus = models.OfferStatusAccepted

		// Reserve the listing for 48 hours when offer is accepted
		// The buyer is the offer sender, NOT the person accepting (who is the seller)
		if err := listingRepo.SetReservation(ctx, offer.ListingID, offer.SenderID); err != nil {
			log.Printf("Error setting listing reservation: %v", err)
			http.Error(w, "Failed to reserve listing", http.StatusInternalServerError)
			return
		}
		log.Printf("Listing %d reserved for buyer %s (48-hour hold)", offer.ListingID, offer.SenderID)
	} else {
		newStatus = models.OfferStatusRejected
	}

	if err := offerRepo.UpdateStatus(ctx, offerID, newStatus); err != nil {
		log.Printf("Error updating offer status: %v", err)
		http.Error(w, "Failed to update offer", http.StatusInternalServerError)
		return
	}

	// Fetch updated offer
	updatedOffer, err := offerRepo.GetByID(ctx, offerID)
	if err != nil {
		log.Printf("Error fetching updated offer: %v", err)
		http.Error(w, "Failed to fetch updated offer", http.StatusInternalServerError)
		return
	}

	// Broadcast offer update via WebSocket.
	if hub := getWSHub(); hub != nil {
		hub.Broadcast(&ws.BroadcastTarget{
			UserIDs: []string{updatedOffer.SenderID, updatedOffer.RecipientID},
			Message: &ws.OutboundMessage{
				Type:           ws.TypeOfferUpdate,
				ConversationID: updatedOffer.ConversationID,
				Offer:          updatedOffer,
				UserID:         userIDStr,
				Timestamp:      time.Now(),
			},
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedOffer)
}

// CounterOffer handles POST /api/offers/:id/counter
func CounterOffer(w http.ResponseWriter, r *http.Request, offerID string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	var input struct {
		Amount  int     `json:"amount"`
		Message *string `json:"message,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if input.Amount <= 0 {
		http.Error(w, "amount must be greater than 0", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Verify user is the recipient of the original offer
	isRecipient, err := offerRepo.IsRecipient(ctx, offerID, userIDStr)
	if err != nil {
		http.Error(w, "Offer not found", http.StatusNotFound)
		return
	}
	if !isRecipient {
		http.Error(w, "Only the recipient can counter this offer", http.StatusForbidden)
		return
	}

	// Get the original offer
	originalOffer, err := offerRepo.GetByID(ctx, offerID)
	if err != nil {
		http.Error(w, "Offer not found", http.StatusNotFound)
		return
	}

	if originalOffer.Status != models.OfferStatusPending {
		http.Error(w, "Offer is no longer pending", http.StatusConflict)
		return
	}

	// Mark original offer as countered
	if err := offerRepo.MarkAsCountered(ctx, offerID); err != nil {
		log.Printf("Error marking offer as countered: %v", err)
		http.Error(w, "Failed to update original offer", http.StatusInternalServerError)
		return
	}

	// Broadcast the original offer status update (pending -> countered).
	if hub := getWSHub(); hub != nil {
		updatedOriginal, err := offerRepo.GetByID(ctx, offerID)
		if err == nil {
			hub.Broadcast(&ws.BroadcastTarget{
				UserIDs: []string{updatedOriginal.SenderID, updatedOriginal.RecipientID},
				Message: &ws.OutboundMessage{
					Type:           ws.TypeOfferUpdate,
					ConversationID: updatedOriginal.ConversationID,
					Offer:          updatedOriginal,
					UserID:         userIDStr,
					Timestamp:      time.Now(),
				},
			})
		}
	}

	// Create counter-offer (sender and recipient are swapped)
	counterOffer, err := offerRepo.Create(ctx, models.CreateOfferInput{
		ListingID:      originalOffer.ListingID,
		ConversationID: originalOffer.ConversationID,
		SenderID:       userIDStr,
		RecipientID:    originalOffer.SenderID, // Counter to original sender
		Amount:         input.Amount,
		Message:        input.Message,
		ParentOfferID:  &offerID, // Link to original offer
	})
	if err != nil {
		log.Printf("Error creating counter-offer: %v", err)
		http.Error(w, "Failed to create counter-offer", http.StatusInternalServerError)
		return
	}

	// Broadcast the new counter-offer via WebSocket.
	if hub := getWSHub(); hub != nil {
		hub.Broadcast(&ws.BroadcastTarget{
			UserIDs: []string{counterOffer.SenderID, counterOffer.RecipientID},
			Message: &ws.OutboundMessage{
				Type:           ws.TypeNewOffer,
				ConversationID: counterOffer.ConversationID,
				Offer:          counterOffer,
				UserID:         userIDStr,
				Timestamp:      time.Now(),
			},
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(counterOffer)
}

// WithdrawOffer handles DELETE /api/offers/:id
func WithdrawOffer(w http.ResponseWriter, r *http.Request, offerID string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	ctx := context.Background()

	// Verify user is the sender
	isSender, err := offerRepo.IsSender(ctx, offerID, userIDStr)
	if err != nil {
		http.Error(w, "Offer not found", http.StatusNotFound)
		return
	}
	if !isSender {
		http.Error(w, "Only the sender can withdraw this offer", http.StatusForbidden)
		return
	}

	if err := offerRepo.Withdraw(ctx, offerID, userIDStr); err != nil {
		log.Printf("Error withdrawing offer: %v", err)
		http.Error(w, "Failed to withdraw offer", http.StatusInternalServerError)
		return
	}

	// Broadcast offer update via WebSocket (pending -> withdrawn).
	if hub := getWSHub(); hub != nil {
		updatedOffer, err := offerRepo.GetByID(ctx, offerID)
		if err == nil {
			hub.Broadcast(&ws.BroadcastTarget{
				UserIDs: []string{updatedOffer.SenderID, updatedOffer.RecipientID},
				Message: &ws.OutboundMessage{
					Type:           ws.TypeOfferUpdate,
					ConversationID: updatedOffer.ConversationID,
					Offer:          updatedOffer,
					UserID:         userIDStr,
					Timestamp:      time.Now(),
				},
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// GetOfferByID handles GET /api/offers/:id
func GetOfferByID(w http.ResponseWriter, r *http.Request, offerID string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	ctx := context.Background()

	offer, err := offerRepo.GetByID(ctx, offerID)
	if err != nil {
		http.Error(w, "Offer not found", http.StatusNotFound)
		return
	}

	// Verify user is participant (sender or recipient)
	if offer.SenderID != userIDStr && offer.RecipientID != userIDStr {
		http.Error(w, "Not authorized to view this offer", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(offer)
}

// HandleOfferRoutes routes offer-related requests
func HandleOfferRoutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/offers")
	path = strings.TrimPrefix(path, "/")

	// POST /api/offers - create new offer
	if path == "" {
		if r.Method == http.MethodPost {
			CreateOffer(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Split path for sub-routes
	parts := strings.Split(path, "/")
	offerID := parts[0]

	// POST /api/offers/:id/respond
	if len(parts) >= 2 && parts[1] == "respond" {
		if r.Method == http.MethodPost {
			RespondToOffer(w, r, offerID)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// POST /api/offers/:id/counter
	if len(parts) >= 2 && parts[1] == "counter" {
		if r.Method == http.MethodPost {
			CounterOffer(w, r, offerID)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// GET /api/offers/:id or DELETE /api/offers/:id
	switch r.Method {
	case http.MethodGet:
		GetOfferByID(w, r, offerID)
	case http.MethodDelete:
		WithdrawOffer(w, r, offerID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
