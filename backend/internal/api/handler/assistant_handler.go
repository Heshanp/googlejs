package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/service"
)

var assistantService *service.AssistantService

// SetAssistantService sets the assistant service dependency
func SetAssistantService(svc *service.AssistantService) {
	assistantService = svc
}

// AssistantChatRequest is the request body for the assistant chat endpoint
type AssistantChatRequest struct {
	ListingID string                        `json:"listingId,omitempty"`
	History   []service.ConversationMessage `json:"history"`
	Query     string                        `json:"query"`
}

// AssistantChatResponse wraps the assistant response
type AssistantChatResponse struct {
	Success bool                         `json:"success"`
	Data    *service.AssistantChatResult `json:"data,omitempty"`
	Error   string                       `json:"error,omitempty"`
}

// AssistantChat handles POST /api/assistant/chat
// No authentication required — public endpoint for judges and all users
func AssistantChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if assistantService == nil {
		sendAssistantError(w, "Assistant service not configured", http.StatusServiceUnavailable)
		return
	}

	// Parse request body
	var req AssistantChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendAssistantError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Query == "" {
		sendAssistantError(w, "Query is required", http.StatusBadRequest)
		return
	}

	// Build listing context if a listing ID is provided
	var listingCtx *service.ListingContext
	var comparisonCtx *service.ComparisonContext

	if req.ListingID != "" && listingRepo != nil {
		listingPublicID := strings.TrimSpace(req.ListingID)
		resolvedID, err := listingRepo.ResolveID(r.Context(), listingPublicID)
		if err != nil {
			if errors.Is(err, repository.ErrInvalidListingID) || errors.Is(err, repository.ErrListingNotFound) {
				sendAssistantError(w, "Invalid listing ID", http.StatusBadRequest)
				return
			}
			sendAssistantError(w, "Failed to load listing context", http.StatusInternalServerError)
			return
		}

		listing, err := listingRepo.GetByID(r.Context(), resolvedID)
		if err == nil && listing != nil {
			listingCtx = &service.ListingContext{
				Title:          listing.Title,
				Description:    listing.Description,
				Price:          listing.Price,
				Condition:      listing.Condition,
				Category:       listing.Category,
				Location:       listing.Location,
				CategoryFields: listing.CategoryFields,
			}

			// Fetch similar listings comparison context
			if vectorRepo != nil {
				ctx, err := vectorRepo.GetSimilarListingsContext(r.Context(), resolvedID)
				if err == nil && ctx != nil && ctx.Stats.TotalCount > 0 {
					comparisonCtx = &service.ComparisonContext{
						TotalCount:    ctx.Stats.TotalCount,
						AvgPrice:      ctx.Stats.AvgPrice,
						MedianPrice:   ctx.Stats.MedianPrice,
						MinPrice:      ctx.Stats.MinPrice,
						MaxPrice:      ctx.Stats.MaxPrice,
						Percentile:    ctx.Stats.Percentile,
						PricePosition: ctx.Stats.PricePosition,
						Comparables:   convertComparables(ctx.Comparables),
					}
				}
			}
		}
	}

	// Call assistant service
	result, err := assistantService.Chat(r.Context(), service.AssistantChatInput{
		ListingContext:    listingCtx,
		ComparisonContext: comparisonCtx,
		History:           req.History,
		Query:             req.Query,
	})

	if err != nil {
		sendAssistantError(w, "Assistant error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AssistantChatResponse{
		Success: true,
		Data:    result,
	})
}

// convertComparables converts repository comparables to service comparables
func convertComparables(repoComparables []repository.CompactSimilarListing) []service.CompactComparable {
	result := make([]service.CompactComparable, len(repoComparables))
	for i, c := range repoComparables {
		result[i] = service.CompactComparable{
			Title:     c.Title,
			Price:     c.Price,
			Condition: c.Condition,
			Year:      c.Year,
			Mileage:   c.Mileage,
		}
	}
	return result
}

func sendAssistantError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(AssistantChatResponse{
		Success: false,
		Error:   message,
	})
}
