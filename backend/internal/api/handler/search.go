package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/service"
)

var searchService *service.SearchService

// SetSearchService sets the search service dependency
func SetSearchService(svc *service.SearchService) {
	searchService = svc
}

// SearchRequest represents the search request body
type SearchRequest struct {
	Query         string `json:"query"`
	Category      string `json:"category,omitempty"`
	Subcategory   string `json:"subcategory,omitempty"`
	Make          string `json:"make,omitempty"`
	Model         string `json:"model,omitempty"`
	BodyStyle     string `json:"bodyStyle,omitempty"`
	FuelType      string `json:"fuelType,omitempty"`
	Transmission  string `json:"transmission,omitempty"`
	Style         string `json:"style,omitempty"`
	Layout        string `json:"layout,omitempty"`
	HullType      string `json:"hullType,omitempty"`
	EngineType    string `json:"engineType,omitempty"`
	SelfContained *bool  `json:"selfContained,omitempty"`
	EngineSizeMin *int   `json:"engineSizeMin,omitempty"`
	EngineSizeMax *int   `json:"engineSizeMax,omitempty"`
	YearMin       *int   `json:"yearMin,omitempty"`
	YearMax       *int   `json:"yearMax,omitempty"`
	PriceMin      *int   `json:"priceMin,omitempty"`
	PriceMax      *int   `json:"priceMax,omitempty"`
	OdometerMin   *int   `json:"odometerMin,omitempty"`
	OdometerMax   *int   `json:"odometerMax,omitempty"`
	Location      string `json:"location,omitempty"`
	Color         string `json:"color,omitempty"`
	Condition     string `json:"condition,omitempty"`
	Limit         int    `json:"limit,omitempty"`
}

// SearchResponse represents the search response
type SearchResponse struct {
	Listings []models.Listing `json:"listings"`
	Total    int              `json:"total"`
	Query    string           `json:"query"`
}

// Search handles search requests
func Search(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if searchService == nil {
		http.Error(w, "Search service not initialized", http.StatusInternalServerError)
		return
	}

	// Parse request - support both GET (query params) and POST (JSON body)
	var req SearchRequest

	if r.Method == http.MethodPost {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
	} else {
		// GET - parse from query params
		req.Query = r.URL.Query().Get("q")
		req.Category = r.URL.Query().Get("category")
		req.Subcategory = r.URL.Query().Get("subcategory")
		req.Make = r.URL.Query().Get("make")
		req.Model = r.URL.Query().Get("model")
		req.BodyStyle = firstNonEmpty(
			r.URL.Query().Get("body_style"),
			r.URL.Query().Get("bodyStyle"),
			r.URL.Query().Get("body_type"),
		)
		req.FuelType = firstNonEmpty(r.URL.Query().Get("fuel_type"), r.URL.Query().Get("fuelType"))
		req.Transmission = r.URL.Query().Get("transmission")
		req.Style = r.URL.Query().Get("style")
		req.Layout = r.URL.Query().Get("layout")
		req.HullType = firstNonEmpty(r.URL.Query().Get("hull_type"), r.URL.Query().Get("hullType"))
		req.EngineType = firstNonEmpty(r.URL.Query().Get("engine_type"), r.URL.Query().Get("engineType"))
		req.Location = r.URL.Query().Get("location")
		req.Color = r.URL.Query().Get("color")
		req.Condition = r.URL.Query().Get("condition")

		if selfContainedStr := firstNonEmpty(
			r.URL.Query().Get("self_contained"),
			r.URL.Query().Get("selfContained"),
		); selfContainedStr != "" {
			if b, err := strconv.ParseBool(selfContainedStr); err == nil {
				req.SelfContained = &b
			}
		}

		if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil {
				req.Limit = l
			}
		}

		if yearMinStr := r.URL.Query().Get("yearMin"); yearMinStr != "" {
			if y, err := strconv.Atoi(yearMinStr); err == nil {
				req.YearMin = &y
			}
		}

		if yearMaxStr := r.URL.Query().Get("yearMax"); yearMaxStr != "" {
			if y, err := strconv.Atoi(yearMaxStr); err == nil {
				req.YearMax = &y
			}
		}

		if priceMinStr := r.URL.Query().Get("priceMin"); priceMinStr != "" {
			if p, err := strconv.Atoi(priceMinStr); err == nil {
				req.PriceMin = &p
			}
		}

		if priceMaxStr := r.URL.Query().Get("priceMax"); priceMaxStr != "" {
			if p, err := strconv.Atoi(priceMaxStr); err == nil {
				req.PriceMax = &p
			}
		}

		if odometerMinStr := r.URL.Query().Get("odometerMin"); odometerMinStr != "" {
			if o, err := strconv.Atoi(odometerMinStr); err == nil {
				req.OdometerMin = &o
			}
		}

		if odometerMaxStr := r.URL.Query().Get("odometerMax"); odometerMaxStr != "" {
			if o, err := strconv.Atoi(odometerMaxStr); err == nil {
				req.OdometerMax = &o
			}
		}

		if engineSizeMinStr := firstNonEmpty(
			r.URL.Query().Get("engine_size_min"),
			r.URL.Query().Get("engineSizeMin"),
		); engineSizeMinStr != "" {
			if e, err := strconv.Atoi(engineSizeMinStr); err == nil {
				req.EngineSizeMin = &e
			}
		}

		if engineSizeMaxStr := firstNonEmpty(
			r.URL.Query().Get("engine_size_max"),
			r.URL.Query().Get("engineSizeMax"),
		); engineSizeMaxStr != "" {
			if e, err := strconv.Atoi(engineSizeMaxStr); err == nil {
				req.EngineSizeMax = &e
			}
		}
	}

	// Validate query
	if req.Query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	// Default limit
	if req.Limit <= 0 || req.Limit > 100 {
		req.Limit = 20
	}

	// Build filters from explicit request parameters only
	// Note: AI parsing has been removed - semantic vector search finds relevant items
	// without needing AI to guess categories. This makes search:
	// 1. Faster (no AI API call)
	// 2. Consistent (no non-deterministic category guessing)
	// 3. More complete (no category filter excluding valid results)
	filters := models.Filters{
		Query:         req.Query,
		Category:      req.Category,
		Subcategory:   req.Subcategory,
		Make:          req.Make,
		Model:         req.Model,
		BodyStyle:     req.BodyStyle,
		FuelType:      req.FuelType,
		Transmission:  req.Transmission,
		EngineSizeMin: req.EngineSizeMin,
		EngineSizeMax: req.EngineSizeMax,
		Style:         req.Style,
		Layout:        req.Layout,
		HullType:      req.HullType,
		EngineType:    req.EngineType,
		SelfContained: req.SelfContained,
		Location:      req.Location,
		YearMin:       req.YearMin,
		YearMax:       req.YearMax,
		PriceMin:      req.PriceMin,
		PriceMax:      req.PriceMax,
		OdometerMin:   req.OdometerMin,
		OdometerMax:   req.OdometerMax,
		Color:         req.Color,
		Condition:     req.Condition,
	}

	// Execute search
	listings, err := searchService.Search(r.Context(), filters.Query, filters, req.Limit)
	if err != nil {
		// Log error but return empty results (graceful degradation)
		http.Error(w, fmt.Sprintf("Search failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Ensure listings is never nil (nil serializes to null, empty slice to [])
	if listings == nil {
		listings = []models.Listing{}
	}

	// Return results
	response := SearchResponse{
		Listings: listings,
		Total:    len(listings),
		Query:    req.Query,
	}

	json.NewEncoder(w).Encode(response)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
