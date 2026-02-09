package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yourusername/justsell/backend/internal/service"
)

func TestLocationsSearch_ServiceNotInitialized(t *testing.T) {
	original := locationService
	locationService = nil
	defer func() { locationService = original }()

	req := httptest.NewRequest(http.MethodGet, "/api/locations/search?q=te", nil)
	w := httptest.NewRecorder()

	LocationsSearch(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestLocationsSearch_MissingQuery(t *testing.T) {
	original := locationService
	locationService = service.NewLocationService()
	defer func() { locationService = original }()

	req := httptest.NewRequest(http.MethodGet, "/api/locations/search", nil)
	w := httptest.NewRecorder()

	LocationsSearch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestLocationsSearch_Success(t *testing.T) {
	original := locationService
	locationService = service.NewLocationService()
	defer func() { locationService = original }()

	req := httptest.NewRequest(http.MethodGet, "/api/locations/search?q=te+atatu&limit=5", nil)
	w := httptest.NewRecorder()

	LocationsSearch(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var decoded LocationsSearchResponse
	if err := json.Unmarshal(w.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("Failed to decode response JSON: %v", err)
	}

	if len(decoded.Locations) == 0 {
		t.Fatal("Expected at least one location, got none")
	}
	if len(decoded.Locations) > 5 {
		t.Fatalf("Expected at most 5 locations, got %d", len(decoded.Locations))
	}
}

func TestLocationsCities_ServiceNotInitialized(t *testing.T) {
	original := locationService
	locationService = nil
	defer func() { locationService = original }()

	req := httptest.NewRequest(http.MethodGet, "/api/locations/cities?limit=10", nil)
	w := httptest.NewRecorder()

	LocationsCities(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

func TestLocationsCities_Success(t *testing.T) {
	original := locationService
	locationService = service.NewLocationService()
	defer func() { locationService = original }()

	req := httptest.NewRequest(http.MethodGet, "/api/locations/cities?limit=10", nil)
	w := httptest.NewRecorder()

	LocationsCities(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var decoded LocationsCitiesResponse
	if err := json.Unmarshal(w.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("Failed to decode response JSON: %v", err)
	}

	if len(decoded.Cities) == 0 {
		t.Fatal("Expected at least one city, got none")
	}
	if len(decoded.Cities) > 10 {
		t.Fatalf("Expected at most 10 cities, got %d", len(decoded.Cities))
	}
	if decoded.Cities[0].Name == "" {
		t.Fatal("Expected city name to be populated")
	}
}

func TestLocationsSuburbs_MissingCity(t *testing.T) {
	original := locationService
	locationService = service.NewLocationService()
	defer func() { locationService = original }()

	req := httptest.NewRequest(http.MethodGet, "/api/locations/suburbs", nil)
	w := httptest.NewRecorder()

	LocationsSuburbs(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestLocationsSuburbs_Success(t *testing.T) {
	original := locationService
	locationService = service.NewLocationService()
	defer func() { locationService = original }()

	req := httptest.NewRequest(http.MethodGet, "/api/locations/suburbs?city=Wellington&limit=10", nil)
	w := httptest.NewRecorder()

	LocationsSuburbs(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var decoded LocationsSuburbsResponse
	if err := json.Unmarshal(w.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("Failed to decode response JSON: %v", err)
	}

	if len(decoded.Suburbs) == 0 {
		t.Fatal("Expected suburbs for Wellington, got none")
	}
	if len(decoded.Suburbs) > 10 {
		t.Fatalf("Expected at most 10 suburbs, got %d", len(decoded.Suburbs))
	}
}
