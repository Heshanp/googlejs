package service

import (
	"strings"
	"testing"
)

// ============================================================================
// Tests for formatPricePosition
// ============================================================================

func TestFormatPricePosition(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "great_deal returns correct string",
			input:    "great_deal",
			expected: "Great Deal - significantly below market",
		},
		{
			name:     "below_average returns correct string",
			input:    "below_average",
			expected: "Good Price - below average",
		},
		{
			name:     "average returns correct string",
			input:    "average",
			expected: "Fair Price - around market average",
		},
		{
			name:     "above_average returns correct string",
			input:    "above_average",
			expected: "Above Average - slightly higher than typical",
		},
		{
			name:     "overpriced returns correct string",
			input:    "overpriced",
			expected: "Overpriced - significantly above market",
		},
		{
			name:     "unknown position returns Unknown",
			input:    "invalid_position",
			expected: "Unknown",
		},
		{
			name:     "empty string returns Unknown",
			input:    "",
			expected: "Unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatPricePosition(tt.input)
			if result != tt.expected {
				t.Errorf("formatPricePosition(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

// ============================================================================
// Tests for buildAssistantSystemPrompt
// ============================================================================

func TestBuildAssistantSystemPrompt_NoContext(t *testing.T) {
	// When no listing or comparison context is provided
	result := buildAssistantSystemPrompt(nil, nil)

	// Should still contain base instructions
	if !strings.Contains(result, "AI shopping assistant") {
		t.Error("Expected prompt to contain 'AI shopping assistant'")
	}
	if !strings.Contains(result, "STRICT SCOPE") {
		t.Error("Expected prompt to contain 'STRICT SCOPE'")
	}
	// Should NOT contain listing-specific sections
	if strings.Contains(result, "CURRENT LISTING CONTEXT") {
		t.Error("Prompt should not contain 'CURRENT LISTING CONTEXT' when listing is nil")
	}
	if strings.Contains(result, "MARKET COMPARISON DATA") {
		t.Error("Prompt should not contain 'MARKET COMPARISON DATA' when comparison is nil")
	}
}

func TestBuildAssistantSystemPrompt_WithListingOnly(t *testing.T) {
	listing := &ListingContext{
		Title:       "Test Product",
		Description: "A great test product",
		Price:       500,
		Condition:   "Good",
		Category:    "cat_electronics",
		Location:    "Auckland, NZ",
		CategoryFields: map[string]interface{}{
			"brand": "TestBrand",
			"model": "X100",
		},
	}

	result := buildAssistantSystemPrompt(listing, nil)

	// Should contain listing context
	if !strings.Contains(result, "CURRENT LISTING CONTEXT") {
		t.Error("Expected prompt to contain 'CURRENT LISTING CONTEXT'")
	}
	if !strings.Contains(result, "Title: Test Product") {
		t.Error("Expected prompt to contain the listing title")
	}
	if !strings.Contains(result, "Price: $500") {
		t.Error("Expected prompt to contain the correct price format")
	}
	if !strings.Contains(result, "Condition: Good") {
		t.Error("Expected prompt to contain the condition")
	}
	if !strings.Contains(result, "Category: cat_electronics") {
		t.Error("Expected prompt to contain the category")
	}
	if !strings.Contains(result, "Location: Auckland, NZ") {
		t.Error("Expected prompt to contain the location")
	}
	if !strings.Contains(result, "Specifications:") {
		t.Error("Expected prompt to contain 'Specifications:' section")
	}
	if !strings.Contains(result, "brand: TestBrand") {
		t.Error("Expected prompt to contain category field 'brand'")
	}

	// Should NOT contain market data
	if strings.Contains(result, "MARKET COMPARISON DATA") {
		t.Error("Prompt should not contain 'MARKET COMPARISON DATA' when comparison is nil")
	}
}

func TestBuildAssistantSystemPrompt_WithComparisonOnly(t *testing.T) {
	comparison := &ComparisonContext{
		TotalCount:    5,
		AvgPrice:      10000,
		MedianPrice:   9500,
		MinPrice:      7000,
		MaxPrice:      15000,
		Percentile:    80,
		PricePosition: "great_deal",
		Comparables: []CompactComparable{
			{Title: "Similar Item 1", Price: 9000, Condition: "Good", Year: 2020, Mileage: 50000},
			{Title: "Similar Item 2", Price: 11000, Condition: "Excellent", Year: 2021, Mileage: 30000},
		},
	}

	result := buildAssistantSystemPrompt(nil, comparison)

	// Should contain market comparison data
	if !strings.Contains(result, "MARKET COMPARISON DATA") {
		t.Error("Expected prompt to contain 'MARKET COMPARISON DATA'")
	}
	if !strings.Contains(result, "Similar Listings Found: 5") {
		t.Error("Expected prompt to contain similar listings count")
	}
	if !strings.Contains(result, "Price Range: $7000 - $15000") {
		t.Error("Expected prompt to contain price range")
	}
	if !strings.Contains(result, "Average Price: $10000") {
		t.Error("Expected prompt to contain average price")
	}
	if !strings.Contains(result, "Median Price: $9500") {
		t.Error("Expected prompt to contain median price")
	}
	if !strings.Contains(result, "cheaper than 80%") {
		t.Error("Expected prompt to contain percentile information")
	}
	if !strings.Contains(result, "Great Deal - significantly below market") {
		t.Error("Expected prompt to contain formatted price position")
	}
	if !strings.Contains(result, "Top Comparable Listings:") {
		t.Error("Expected prompt to contain 'Top Comparable Listings:'")
	}
	if !strings.Contains(result, "Similar Item 1 - $9000 (Good)") {
		t.Error("Expected prompt to contain first comparable listing")
	}
	if !strings.Contains(result, "2020") {
		t.Error("Expected prompt to contain year for comparable")
	}
	if !strings.Contains(result, "50k mi") {
		t.Error("Expected prompt to contain mileage for comparable")
	}

	// Should NOT contain listing context (since listing is nil)
	if strings.Contains(result, "CURRENT LISTING CONTEXT") {
		t.Error("Prompt should not contain 'CURRENT LISTING CONTEXT' when listing is nil")
	}
}

func TestBuildAssistantSystemPrompt_WithBothContexts(t *testing.T) {
	listing := &ListingContext{
		Title:     "2019 Toyota Camry",
		Price:     8888,
		Condition: "Good",
		Category:  "cat_vehicles",
		Location:  "Wellington",
	}

	comparison := &ComparisonContext{
		TotalCount:    3,
		AvgPrice:      12000,
		MedianPrice:   11500,
		MinPrice:      9000,
		MaxPrice:      15000,
		Percentile:    100,
		PricePosition: "great_deal",
		Comparables: []CompactComparable{
			{Title: "2018 Toyota Camry", Price: 11000, Condition: "Good"},
		},
	}

	result := buildAssistantSystemPrompt(listing, comparison)

	// Should contain both sections
	if !strings.Contains(result, "CURRENT LISTING CONTEXT") {
		t.Error("Expected prompt to contain 'CURRENT LISTING CONTEXT'")
	}
	if !strings.Contains(result, "MARKET COMPARISON DATA") {
		t.Error("Expected prompt to contain 'MARKET COMPARISON DATA'")
	}
	if !strings.Contains(result, "Title: 2019 Toyota Camry") {
		t.Error("Expected prompt to contain listing title")
	}
	if !strings.Contains(result, "Similar Listings Found: 3") {
		t.Error("Expected prompt to contain comparison count")
	}
	if !strings.Contains(result, "IMPORTANT INSTRUCTIONS FOR PRICE QUESTIONS") {
		t.Error("Expected prompt to contain price question instructions")
	}
}

func TestBuildAssistantSystemPrompt_ZeroComparables(t *testing.T) {
	comparison := &ComparisonContext{
		TotalCount:    0, // No similar listings
		AvgPrice:      0,
		MedianPrice:   0,
		MinPrice:      0,
		MaxPrice:      0,
		Percentile:    50,
		PricePosition: "unknown",
		Comparables:   []CompactComparable{},
	}

	result := buildAssistantSystemPrompt(nil, comparison)

	// With TotalCount = 0, market data section should NOT be included
	if strings.Contains(result, "MARKET COMPARISON DATA") {
		t.Error("Prompt should not contain 'MARKET COMPARISON DATA' when TotalCount is 0")
	}
}

func TestBuildAssistantSystemPrompt_ComparableWithoutYearAndMileage(t *testing.T) {
	comparison := &ComparisonContext{
		TotalCount:    1,
		AvgPrice:      500,
		MedianPrice:   500,
		MinPrice:      500,
		MaxPrice:      500,
		Percentile:    50,
		PricePosition: "average",
		Comparables: []CompactComparable{
			{Title: "Generic Item", Price: 500, Condition: "New", Year: 0, Mileage: 0},
		},
	}

	result := buildAssistantSystemPrompt(nil, comparison)

	// Should contain the comparable without year or mileage suffixes
	if !strings.Contains(result, "Generic Item - $500 (New)") {
		t.Error("Expected prompt to contain comparable listing basic info")
	}
	// Should NOT contain ", 0" (year) or "0k mi" (mileage)
	if strings.Contains(result, ", 0") {
		t.Error("Prompt should not contain zero year")
	}
	if strings.Contains(result, "0k mi") {
		t.Error("Prompt should not contain zero mileage")
	}
}

// ============================================================================
// Tests for price position thresholds (validating our understanding)
// ============================================================================

// These tests document the expected behavior of the percentile-to-position mapping
// The thresholds are: >=80 great_deal, >=60 below_average, >=40 average, >=20 above_average, else overpriced
func TestPricePositionThresholds(t *testing.T) {
	tests := []struct {
		name       string
		percentile int
		expected   string
	}{
		{"100% is great_deal", 100, "great_deal"},
		{"80% is great_deal", 80, "great_deal"},
		{"79% is below_average", 79, "below_average"},
		{"60% is below_average", 60, "below_average"},
		{"59% is average", 59, "average"},
		{"40% is average", 40, "average"},
		{"39% is above_average", 39, "above_average"},
		{"20% is above_average", 20, "above_average"},
		{"19% is overpriced", 19, "overpriced"},
		{"0% is overpriced", 0, "overpriced"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var position string
			switch {
			case tt.percentile >= 80:
				position = "great_deal"
			case tt.percentile >= 60:
				position = "below_average"
			case tt.percentile >= 40:
				position = "average"
			case tt.percentile >= 20:
				position = "above_average"
			default:
				position = "overpriced"
			}

			if position != tt.expected {
				t.Errorf("Percentile %d should result in %q, got %q", tt.percentile, tt.expected, position)
			}
		})
	}
}

func TestBuildAssistantSystemPrompt_NZEnforcement(t *testing.T) {
	result := buildAssistantSystemPrompt(nil, nil)

	if !strings.Contains(result, "Google Search data MUST be New Zealand specific only.") {
		t.Error("Expected prompt to enforce NZ-only Google Search data")
	}
	if !strings.Contains(result, "Never use or cite non-NZ market data") {
		t.Error("Expected prompt to reject non-NZ market data")
	}
	if !strings.Contains(result, "Treat all prices as NZD") {
		t.Error("Expected prompt to enforce NZD pricing context")
	}
}

func TestIsNZGroundingSource(t *testing.T) {
	tests := []struct {
		name   string
		source GroundingSource
		want   bool
	}{
		{
			name: "accepts nz domain",
			source: GroundingSource{
				Title: "Trade Me listing trends",
				URL:   "https://www.trademe.co.nz/a/motors/cars",
			},
			want: true,
		},
		{
			name: "accepts explicit new zealand marker in title",
			source: GroundingSource{
				Title: "Best used hatchbacks in New Zealand",
				URL:   "https://www.example.com/reviews/hatchbacks",
			},
			want: true,
		},
		{
			name: "accepts explicit nz marker in URL path",
			source: GroundingSource{
				Title: "Car pricing guide",
				URL:   "https://www.example.com/prices/nz/used-cars",
			},
			want: true,
		},
		{
			name: "rejects non-nz source",
			source: GroundingSource{
				Title: "US used car price trends",
				URL:   "https://www.kbb.com/cars-for-sale",
			},
			want: false,
		},
		{
			name: "rejects nzxt token as nz market marker",
			source: GroundingSource{
				Title: "NZXT H7 case review",
				URL:   "https://www.nzxt.com/products/h7",
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isNZGroundingSource(tt.source)
			if got != tt.want {
				t.Errorf("isNZGroundingSource(%+v) = %v, want %v", tt.source, got, tt.want)
			}
		})
	}
}

func TestFilterNZGroundingSources(t *testing.T) {
	metadata := &groundingMetadata{
		GroundingChunks: []groundingChunk{
			{
				Web: &groundingWeb{
					URI:   "https://www.trademe.co.nz/a/marketplace",
					Title: "Trade Me marketplace",
				},
			},
			{
				Web: &groundingWeb{
					URI:   "https://www.cargurus.com/Cars/l-Used-Cars",
					Title: "US used car prices",
				},
			},
			{
				Web: &groundingWeb{
					URI:   "https://www.trademe.co.nz/a/marketplace",
					Title: "Trade Me marketplace",
				},
			},
		},
	}

	sources, foundNonNZ := filterNZGroundingSources(metadata)
	if !foundNonNZ {
		t.Error("Expected non-NZ source to be detected")
	}
	if len(sources) != 1 {
		t.Fatalf("Expected 1 deduplicated NZ source, got %d", len(sources))
	}
	if sources[0].URL != "https://www.trademe.co.nz/a/marketplace" {
		t.Errorf("Unexpected NZ source URL: %s", sources[0].URL)
	}
}

func TestFilterNZGroundingSources_AllNZ(t *testing.T) {
	metadata := &groundingMetadata{
		GroundingChunks: []groundingChunk{
			{
				Web: &groundingWeb{
					URI:   "https://www.consumer.org.nz/articles/new-zealand-car-pricing",
					Title: "New Zealand car pricing guide",
				},
			},
			{
				Web: &groundingWeb{
					URI:   "https://www.nzta.govt.nz/vehicles/buying-and-selling-a-vehicle",
					Title: "NZTA vehicle buying guide",
				},
			},
		},
	}

	sources, foundNonNZ := filterNZGroundingSources(metadata)
	if foundNonNZ {
		t.Error("Did not expect non-NZ sources to be detected")
	}
	if len(sources) != 2 {
		t.Fatalf("Expected 2 NZ sources, got %d", len(sources))
	}
}

func TestFilterNZGroundingSources_NilMetadata(t *testing.T) {
	sources, foundNonNZ := filterNZGroundingSources(nil)
	if foundNonNZ {
		t.Error("Nil metadata should not report non-NZ sources")
	}
	if len(sources) != 0 {
		t.Fatalf("Expected no sources for nil metadata, got %d", len(sources))
	}
}
