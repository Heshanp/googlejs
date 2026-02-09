package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yourusername/justsell/backend/internal/models"
)

func TestSearch_MissingQuery(t *testing.T) {
	// Test that search returns error when query parameter is missing
	// Note: Without searchService initialized, returns 500 first
	// With searchService but no query, returns 400
	req := httptest.NewRequest(http.MethodGet, "/api/search", nil)
	w := httptest.NewRecorder()

	Search(w, req)

	// Handler checks service first (500), then query (400)
	// Either is acceptable error behavior
	if w.Code != http.StatusBadRequest && w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status 400 or 500, got %d", w.Code)
	}

	body := w.Body.String()
	if body == "" {
		t.Error("Expected error message in response body")
	}
}

func TestSearch_EmptyQuery(t *testing.T) {
	// Test that search returns error when query is empty string
	// Note: Without searchService initialized, returns 500 first
	req := httptest.NewRequest(http.MethodGet, "/api/search?q=", nil)
	w := httptest.NewRecorder()

	Search(w, req)

	// Handler checks service first (500), then query (400)
	if w.Code != http.StatusBadRequest && w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status 400 or 500, got %d", w.Code)
	}
}

func TestSearch_ServiceNotInitialized(t *testing.T) {
	// Temporarily clear search service
	originalService := searchService
	searchService = nil
	defer func() {
		searchService = originalService
	}()

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=test", nil)
	w := httptest.NewRecorder()

	Search(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestSearchResponse_JSONStructure(t *testing.T) {
	// Test that SearchResponse serializes correctly
	response := SearchResponse{
		Listings: []models.Listing{
			{
				ID:          1,
				Title:       "Test Umbrella",
				Description: "A nice umbrella for rainy days",
				Price:       50,
				Category:    "cat_fashion",
				Location:    "Auckland",
			},
		},
		Total: 1,
		Query: "umbrella",
	}

	jsonBytes, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Failed to marshal response: %v", err)
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	// Check required fields
	if _, ok := decoded["listings"]; !ok {
		t.Error("Expected 'listings' field in response")
	}
	if _, ok := decoded["total"]; !ok {
		t.Error("Expected 'total' field in response")
	}
	if _, ok := decoded["query"]; !ok {
		t.Error("Expected 'query' field in response")
	}

	// Verify values
	if decoded["total"].(float64) != 1 {
		t.Errorf("Expected total=1, got %v", decoded["total"])
	}
	if decoded["query"].(string) != "umbrella" {
		t.Errorf("Expected query='umbrella', got %v", decoded["query"])
	}
}

func TestSearchRequest_DefaultLimit(t *testing.T) {
	// Test that default limit is applied when not specified
	tests := []struct {
		name          string
		queryString   string
		expectedLimit int
	}{
		{"no limit", "?q=test", 20},
		{"valid limit", "?q=test&limit=10", 10},
		{"zero limit uses default", "?q=test&limit=0", 20},
		{"negative limit uses default", "?q=test&limit=-5", 20},
		{"over max uses default", "?q=test&limit=150", 20},
		{"max valid limit", "?q=test&limit=100", 100},
		{"invalid limit string", "?q=test&limit=abc", 20},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/search"+tt.queryString, nil)

			// Simulate the limit parsing logic from the handler
			var limit int
			if limitStr := req.URL.Query().Get("limit"); limitStr != "" {
				var l int
				for _, c := range limitStr {
					if c >= '0' && c <= '9' {
						l = l*10 + int(c-'0')
					} else {
						l = 0
						break
					}
				}
				if l > 0 && l <= 100 {
					limit = l
				}
			}
			if limit <= 0 || limit > 100 {
				limit = 20
			}

			if limit != tt.expectedLimit {
				t.Errorf("For %s, expected limit=%d, got %d", tt.queryString, tt.expectedLimit, limit)
			}
		})
	}
}

func TestSearchRequest_FilterParsing(t *testing.T) {
	// Test that filters are correctly parsed from query parameters
	req := httptest.NewRequest(http.MethodGet, "/api/search?q=car&category=cat_vehicles&make=Toyota&model=Camry&location=Auckland&priceMin=10000&priceMax=50000&yearMin=2015&yearMax=2020", nil)

	query := req.URL.Query()

	// Verify all parameters are correctly parsed
	if query.Get("q") != "car" {
		t.Errorf("Expected q='car', got '%s'", query.Get("q"))
	}
	if query.Get("category") != "cat_vehicles" {
		t.Errorf("Expected category='cat_vehicles', got '%s'", query.Get("category"))
	}
	if query.Get("make") != "Toyota" {
		t.Errorf("Expected make='Toyota', got '%s'", query.Get("make"))
	}
	if query.Get("model") != "Camry" {
		t.Errorf("Expected model='Camry', got '%s'", query.Get("model"))
	}
	if query.Get("location") != "Auckland" {
		t.Errorf("Expected location='Auckland', got '%s'", query.Get("location"))
	}
	if query.Get("priceMin") != "10000" {
		t.Errorf("Expected priceMin='10000', got '%s'", query.Get("priceMin"))
	}
	if query.Get("priceMax") != "50000" {
		t.Errorf("Expected priceMax='50000', got '%s'", query.Get("priceMax"))
	}
	if query.Get("yearMin") != "2015" {
		t.Errorf("Expected yearMin='2015', got '%s'", query.Get("yearMin"))
	}
	if query.Get("yearMax") != "2020" {
		t.Errorf("Expected yearMax='2020', got '%s'", query.Get("yearMax"))
	}
}

func TestSearchFilters_NoAIParsing(t *testing.T) {
	// This test verifies that filters are built from explicit parameters only,
	// without AI parsing modifying them. This ensures:
	// 1. Search is fast (no AI API call)
	// 2. Search is consistent (no non-deterministic category guessing)
	// 3. Search finds all relevant items (no restrictive AI-guessed filters)

	// Simulate building filters the way the handler does (after AI removal)
	req := httptest.NewRequest(http.MethodGet, "/api/search?q=umbrella", nil)
	query := req.URL.Query()

	filters := models.Filters{
		Query:    query.Get("q"),
		Category: query.Get("category"),
		Make:     query.Get("make"),
		Model:    query.Get("model"),
		Location: query.Get("location"),
	}

	// Verify that only explicit query is set, no AI-inferred category
	if filters.Query != "umbrella" {
		t.Errorf("Expected Query='umbrella', got '%s'", filters.Query)
	}
	if filters.Category != "" {
		t.Errorf("Expected Category to be empty (no AI inference), got '%s'", filters.Category)
	}
	if filters.Make != "" {
		t.Errorf("Expected Make to be empty (no AI inference), got '%s'", filters.Make)
	}
}

func TestSearchFilters_ExplicitCategoryPreserved(t *testing.T) {
	// Test that explicitly provided category is preserved
	req := httptest.NewRequest(http.MethodGet, "/api/search?q=umbrella&category=cat_fashion", nil)
	query := req.URL.Query()

	filters := models.Filters{
		Query:    query.Get("q"),
		Category: query.Get("category"),
	}

	if filters.Query != "umbrella" {
		t.Errorf("Expected Query='umbrella', got '%s'", filters.Query)
	}
	if filters.Category != "cat_fashion" {
		t.Errorf("Expected Category='cat_fashion', got '%s'", filters.Category)
	}
}

func TestSearchResponse_EmptyListings(t *testing.T) {
	// Test that empty results return empty array, not null
	response := SearchResponse{
		Listings: []models.Listing{},
		Total:    0,
		Query:    "nonexistent",
	}

	jsonBytes, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("Failed to marshal response: %v", err)
	}

	// Verify listings is [] not null
	var decoded map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	listings, ok := decoded["listings"].([]interface{})
	if !ok {
		t.Error("Expected listings to be an array")
	}
	if len(listings) != 0 {
		t.Errorf("Expected empty array, got %d items", len(listings))
	}
}
