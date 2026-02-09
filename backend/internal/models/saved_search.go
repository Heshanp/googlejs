package models

import (
	"encoding/json"
	"time"
)

// SavedSearch represents a user's saved search for deal alerts
type SavedSearch struct {
	ID             int64           `json:"id"`
	UserID         string          `json:"userId"`
	Name           string          `json:"name"`
	Query          string          `json:"query"`
	Filters        json.RawMessage `json:"filters"`
	NotifyOnNew    bool            `json:"notifyOnNew"`
	LastNotifiedAt *time.Time      `json:"lastNotifiedAt,omitempty"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
}

// CreateSavedSearchInput contains fields for creating a saved search
type CreateSavedSearchInput struct {
	Name        string          `json:"name"`
	Query       string          `json:"query"`
	Filters     json.RawMessage `json:"filters"`
	NotifyOnNew *bool           `json:"notifyOnNew,omitempty"` // Defaults to true if not provided
}

// UpdateSavedSearchInput contains fields for updating a saved search
type UpdateSavedSearchInput struct {
	Name        *string          `json:"name,omitempty"`
	Query       *string          `json:"query,omitempty"`
	Filters     *json.RawMessage `json:"filters,omitempty"`
	NotifyOnNew *bool            `json:"notifyOnNew,omitempty"`
}

// SavedSearchResult tracks which listings have been notified for a saved search
type SavedSearchResult struct {
	ID            int64     `json:"id"`
	SavedSearchID int64     `json:"savedSearchId"`
	ListingID     int64     `json:"listingId"`
	NotifiedAt    time.Time `json:"notifiedAt"`
}

// SavedSearchWithCount includes the saved search and a count of results
type SavedSearchWithCount struct {
	SavedSearch
	ResultCount int `json:"resultCount"`
}

// ParsedFilters represents the decoded filters for search execution
type ParsedFilters struct {
	Category     *string  `json:"category,omitempty"`
	PriceMin     *int     `json:"priceMin,omitempty"`
	PriceMax     *int     `json:"priceMax,omitempty"`
	Location     *string  `json:"location,omitempty"`
	Condition    *string  `json:"condition,omitempty"`
	Make         *string  `json:"make,omitempty"`
	Model        *string  `json:"model,omitempty"`
	YearMin      *int     `json:"yearMin,omitempty"`
	YearMax      *int     `json:"yearMax,omitempty"`
	OdometerMax  *int     `json:"odometerMax,omitempty"`
	Color        *string  `json:"color,omitempty"`
	Keywords     []string `json:"keywords,omitempty"`
	FreeShipping *bool    `json:"freeShipping,omitempty"`
}

// ParseFilters decodes the JSON filters into a structured format
func (s *SavedSearch) ParseFilters() (*ParsedFilters, error) {
	if len(s.Filters) == 0 || string(s.Filters) == "{}" {
		return &ParsedFilters{}, nil
	}
	var filters ParsedFilters
	if err := json.Unmarshal(s.Filters, &filters); err != nil {
		return nil, err
	}
	return &filters, nil
}
