package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/yourusername/justsell/backend/internal/data"
	"github.com/yourusername/justsell/backend/internal/service"
)

type LocationsSearchResponse struct {
	Locations []data.NZLocation `json:"locations"`
}

type LocationsCitiesResponse struct {
	Cities []service.MajorCity `json:"cities"`
}

type LocationsSuburbsResponse struct {
	Suburbs []data.NZLocation `json:"suburbs"`
}

// LocationsSearch handles GET /api/locations/search?q=...&limit=...
func LocationsSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if locationService == nil {
		http.Error(w, "Location service not initialized", http.StatusInternalServerError)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len([]rune(q)) < 2 {
		http.Error(w, "Query parameter 'q' is required and must be at least 2 characters", http.StatusBadRequest)
		return
	}

	limit := 20
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	locations := locationService.SearchLocations(q, limit)
	json.NewEncoder(w).Encode(LocationsSearchResponse{Locations: locations})
}

// LocationsCities handles GET /api/locations/cities?limit=...
func LocationsCities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if locationService == nil {
		http.Error(w, "Location service not initialized", http.StatusInternalServerError)
		return
	}

	limit := 80
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	cities := locationService.GetMajorCities(limit)
	json.NewEncoder(w).Encode(LocationsCitiesResponse{Cities: cities})
}

// LocationsSuburbs handles GET /api/locations/suburbs?city=...&limit=...
func LocationsSuburbs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if locationService == nil {
		http.Error(w, "Location service not initialized", http.StatusInternalServerError)
		return
	}

	city := strings.TrimSpace(r.URL.Query().Get("city"))
	if city == "" {
		http.Error(w, "Query parameter 'city' is required", http.StatusBadRequest)
		return
	}

	limit := 500
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	suburbs := locationService.GetSuburbsByCity(city, limit)
	json.NewEncoder(w).Encode(LocationsSuburbsResponse{Suburbs: suburbs})
}
