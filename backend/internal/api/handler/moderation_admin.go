package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
)

// HandleAdminModerationRoutes handles moderation admin actions.
func HandleAdminModerationRoutes(w http.ResponseWriter, r *http.Request) {
	if listingRepo == nil || moderationRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}
	if !isAdminRequest(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/admin/moderation")
	path = strings.Trim(path, "/")
	parts := []string{}
	if path != "" {
		parts = strings.Split(path, "/")
	}

	switch {
	case len(parts) == 1 && parts[0] == "listings" && r.Method == http.MethodGet:
		adminGetModerationQueue(w, r)
		return
	case len(parts) == 3 && parts[0] == "listings" && parts[2] == "approve" && r.Method == http.MethodPost:
		adminOverrideListing(w, r, parts[1], true)
		return
	case len(parts) == 3 && parts[0] == "listings" && parts[2] == "reject" && r.Method == http.MethodPost:
		adminOverrideListing(w, r, parts[1], false)
		return
	case len(parts) == 3 && parts[0] == "users" && parts[2] == "violations" && r.Method == http.MethodGet:
		adminGetUserViolations(w, r, parts[1])
		return
	case len(parts) == 3 && parts[0] == "users" && parts[2] == "unflag" && r.Method == http.MethodPost:
		adminUnflagUser(w, r, parts[1])
		return
	default:
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
}

func adminGetModerationQueue(w http.ResponseWriter, r *http.Request) {
	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))
	statuses := []string{}
	if statusFilter == "" || strings.EqualFold(statusFilter, "all") {
		statuses = []string{string(models.ListingStatusPendingReview), string(models.ListingStatusBlocked)}
	} else {
		for _, s := range strings.Split(statusFilter, ",") {
			s = strings.ToLower(strings.TrimSpace(s))
			if s != "" {
				statuses = append(statuses, s)
			}
		}
	}

	limit := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	offset := 0
	if raw := strings.TrimSpace(r.URL.Query().Get("offset")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	listings, err := listingRepo.GetModerationQueue(r.Context(), statuses, limit, offset)
	if err != nil {
		http.Error(w, "Failed to load moderation queue", http.StatusInternalServerError)
		return
	}

	type moderationListingItem struct {
		Listing models.Listing `json:"listing"`
		User    any            `json:"user,omitempty"`
	}

	items := make([]moderationListingItem, 0, len(listings))
	userRepo := repository.GetUserRepository()
	for _, listing := range listings {
		listing.Images = mapListingImagesForResponse(listing.Status, listing.Images)
		item := moderationListingItem{Listing: listing}
		if userRepo != nil && listing.UserID != nil {
			if user, getErr := userRepo.GetByID(r.Context(), *listing.UserID); getErr == nil && user != nil {
				item.User = map[string]any{
					"id":             user.ID,
					"email":          user.Email,
					"name":           user.Name,
					"violationCount": user.ViolationCount,
					"isFlagged":      user.IsFlagged,
				}
			}
		}
		items = append(items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"data":  items,
		"total": len(items),
	})
}

func adminOverrideListing(w http.ResponseWriter, r *http.Request, listingID string, approve bool) {
	resolvedID, err := listingRepo.ResolveID(r.Context(), listingID)
	if err != nil {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}

	var body struct {
		Summary string `json:"summary"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	adminUserID := getRequestUserID(r)
	if err := listingRepo.ApplyModerationOverride(r.Context(), resolvedID, approve, adminUserID, body.Summary); err != nil {
		http.Error(w, "Failed to update listing moderation", http.StatusInternalServerError)
		return
	}

	listing, err := listingRepo.GetByID(r.Context(), resolvedID)
	if err != nil {
		http.Error(w, "Listing not found", http.StatusNotFound)
		return
	}
	listing.Images = mapListingImagesForResponse(listing.Status, listing.Images)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"listing": listing,
	})
}

func adminGetUserViolations(w http.ResponseWriter, r *http.Request, userID string) {
	limit := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	offset := 0
	if raw := strings.TrimSpace(r.URL.Query().Get("offset")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	events, err := moderationRepo.GetViolationHistory(r.Context(), userID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch violation history", http.StatusInternalServerError)
		return
	}

	userRepo := repository.GetUserRepository()
	userPayload := map[string]any{"id": userID}
	if userRepo != nil {
		if user, getErr := userRepo.GetByID(r.Context(), userID); getErr == nil && user != nil {
			userPayload = map[string]any{
				"id":             user.ID,
				"email":          user.Email,
				"name":           user.Name,
				"violationCount": user.ViolationCount,
				"isFlagged":      user.IsFlagged,
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"user":       userPayload,
		"violations": events,
		"total":      len(events),
	})
}

func adminUnflagUser(w http.ResponseWriter, r *http.Request, userID string) {
	userRepo := repository.GetUserRepository()
	if userRepo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	if err := userRepo.SetFlagStatus(r.Context(), userID, false); err != nil {
		http.Error(w, "Failed to unflag user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success":   true,
		"userId":    userID,
		"isFlagged": false,
	})
}
