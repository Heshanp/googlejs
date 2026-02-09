package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/service"
)

var savedSearchSvc *service.SavedSearchService

// SetSavedSearchService sets the saved search service dependency
func SetSavedSearchService(svc *service.SavedSearchService) {
	savedSearchSvc = svc
}

// CreateSavedSearch handles POST /api/saved-searches
func CreateSavedSearch(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	var input models.CreateSavedSearchInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if input.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}
	if input.Query == "" {
		http.Error(w, "Query is required", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	savedSearch, err := savedSearchSvc.Create(ctx, userIDStr, input)
	if err != nil {
		log.Printf("CreateSavedSearch: error=%v", err)
		// Check for duplicate name error
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			http.Error(w, "A saved search with this name already exists", http.StatusConflict)
			return
		}
		http.Error(w, "Failed to create saved search", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(savedSearch)
}

// ListSavedSearches handles GET /api/saved-searches
func ListSavedSearches(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	// Parse pagination params
	limit := 20
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	ctx := context.Background()
	searches, total, err := savedSearchSvc.GetUserSearches(ctx, userIDStr, limit, offset)
	if err != nil {
		log.Printf("ListSavedSearches: error=%v", err)
		http.Error(w, "Failed to fetch saved searches", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"savedSearches": searches,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	})
}

// GetSavedSearch handles GET /api/saved-searches/:id
func GetSavedSearch(w http.ResponseWriter, r *http.Request, idStr string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid saved search ID", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	savedSearch, err := savedSearchSvc.GetByID(ctx, id, userIDStr)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "Saved search not found", http.StatusNotFound)
			return
		}
		log.Printf("GetSavedSearch: error=%v", err)
		http.Error(w, "Failed to fetch saved search", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(savedSearch)
}

// UpdateSavedSearch handles PUT /api/saved-searches/:id
func UpdateSavedSearch(w http.ResponseWriter, r *http.Request, idStr string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid saved search ID", http.StatusBadRequest)
		return
	}

	var input models.UpdateSavedSearchInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	err = savedSearchSvc.Update(ctx, id, userIDStr, input)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "access denied") {
			http.Error(w, "Saved search not found", http.StatusNotFound)
			return
		}
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			http.Error(w, "A saved search with this name already exists", http.StatusConflict)
			return
		}
		log.Printf("UpdateSavedSearch: error=%v", err)
		http.Error(w, "Failed to update saved search", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// DeleteSavedSearch handles DELETE /api/saved-searches/:id
func DeleteSavedSearch(w http.ResponseWriter, r *http.Request, idStr string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid saved search ID", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	err = savedSearchSvc.Delete(ctx, id, userIDStr)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "access denied") {
			http.Error(w, "Saved search not found", http.StatusNotFound)
			return
		}
		log.Printf("DeleteSavedSearch: error=%v", err)
		http.Error(w, "Failed to delete saved search", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// PreviewSavedSearchResults handles GET /api/saved-searches/:id/results
func PreviewSavedSearchResults(w http.ResponseWriter, r *http.Request, idStr string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid saved search ID", http.StatusBadRequest)
		return
	}

	// Parse limit param
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 50 {
			limit = parsed
		}
	}

	ctx := context.Background()
	listings, err := savedSearchSvc.PreviewResults(ctx, id, userIDStr, limit)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "Saved search not found", http.StatusNotFound)
			return
		}
		log.Printf("PreviewSavedSearchResults: error=%v", err)
		http.Error(w, "Failed to fetch results", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"listings": listings,
		"count":    len(listings),
	})
}

// HandleSavedSearchRoutes routes saved search related requests
func HandleSavedSearchRoutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/saved-searches")
	path = strings.TrimPrefix(path, "/")

	// POST /api/saved-searches - create saved search
	if path == "" && r.Method == http.MethodPost {
		CreateSavedSearch(w, r)
		return
	}

	// GET /api/saved-searches - list saved searches
	if path == "" && r.Method == http.MethodGet {
		ListSavedSearches(w, r)
		return
	}

	// Handle /api/saved-searches/:id/* routes
	parts := strings.Split(path, "/")
	if len(parts) >= 1 && parts[0] != "" {
		savedSearchID := parts[0]

		// GET /api/saved-searches/:id - get single saved search
		if len(parts) == 1 && r.Method == http.MethodGet {
			GetSavedSearch(w, r, savedSearchID)
			return
		}

		// PUT /api/saved-searches/:id - update saved search
		if len(parts) == 1 && r.Method == http.MethodPut {
			UpdateSavedSearch(w, r, savedSearchID)
			return
		}

		// DELETE /api/saved-searches/:id - delete saved search
		if len(parts) == 1 && r.Method == http.MethodDelete {
			DeleteSavedSearch(w, r, savedSearchID)
			return
		}

		// GET /api/saved-searches/:id/results - preview results
		if len(parts) >= 2 && parts[1] == "results" && r.Method == http.MethodGet {
			PreviewSavedSearchResults(w, r, savedSearchID)
			return
		}
	}

	http.Error(w, "Not found", http.StatusNotFound)
}
