package handler

import (
	"testing"

	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/service"
)

// ============================================================================
// Tests for convertComparables
// ============================================================================

func TestConvertComparables_Empty(t *testing.T) {
	input := []repository.CompactSimilarListing{}
	result := convertComparables(input)

	if len(result) != 0 {
		t.Errorf("Expected empty result, got %d items", len(result))
	}
}

func TestConvertComparables_SingleItem(t *testing.T) {
	input := []repository.CompactSimilarListing{
		{
			Title:     "Test Item",
			Price:     5000,
			Condition: "Good",
			Year:      2020,
			Mileage:   50000,
		},
	}

	result := convertComparables(input)

	if len(result) != 1 {
		t.Fatalf("Expected 1 result, got %d", len(result))
	}

	if result[0].Title != "Test Item" {
		t.Errorf("Title mismatch: expected 'Test Item', got %q", result[0].Title)
	}
	if result[0].Price != 5000 {
		t.Errorf("Price mismatch: expected 5000, got %d", result[0].Price)
	}
	if result[0].Condition != "Good" {
		t.Errorf("Condition mismatch: expected 'Good', got %q", result[0].Condition)
	}
	if result[0].Year != 2020 {
		t.Errorf("Year mismatch: expected 2020, got %d", result[0].Year)
	}
	if result[0].Mileage != 50000 {
		t.Errorf("Mileage mismatch: expected 50000, got %d", result[0].Mileage)
	}
}

func TestConvertComparables_MultipleItems(t *testing.T) {
	input := []repository.CompactSimilarListing{
		{Title: "Item 1", Price: 1000, Condition: "New", Year: 2023, Mileage: 0},
		{Title: "Item 2", Price: 2000, Condition: "Good", Year: 2022, Mileage: 10000},
		{Title: "Item 3", Price: 3000, Condition: "Fair", Year: 2021, Mileage: 50000},
	}

	result := convertComparables(input)

	if len(result) != 3 {
		t.Fatalf("Expected 3 results, got %d", len(result))
	}

	// Verify order is preserved
	expectedTitles := []string{"Item 1", "Item 2", "Item 3"}
	expectedPrices := []int{1000, 2000, 3000}

	for i, expected := range expectedTitles {
		if result[i].Title != expected {
			t.Errorf("Index %d: expected title %q, got %q", i, expected, result[i].Title)
		}
	}

	for i, expected := range expectedPrices {
		if result[i].Price != expected {
			t.Errorf("Index %d: expected price %d, got %d", i, expected, result[i].Price)
		}
	}
}

func TestConvertComparables_ZeroValues(t *testing.T) {
	// Test that zero values are correctly copied (not filtered or modified)
	input := []repository.CompactSimilarListing{
		{Title: "Zero Test", Price: 0, Condition: "", Year: 0, Mileage: 0},
	}

	result := convertComparables(input)

	if len(result) != 1 {
		t.Fatalf("Expected 1 result, got %d", len(result))
	}

	if result[0].Price != 0 {
		t.Errorf("Expected zero price to be preserved, got %d", result[0].Price)
	}
	if result[0].Year != 0 {
		t.Errorf("Expected zero year to be preserved, got %d", result[0].Year)
	}
	if result[0].Mileage != 0 {
		t.Errorf("Expected zero mileage to be preserved, got %d", result[0].Mileage)
	}
	if result[0].Condition != "" {
		t.Errorf("Expected empty condition to be preserved, got %q", result[0].Condition)
	}
}

func TestConvertComparables_TypeConversion(t *testing.T) {
	// Verify the result is the correct type
	input := []repository.CompactSimilarListing{
		{Title: "Type Test", Price: 100, Condition: "Good", Year: 2020, Mileage: 1000},
	}

	result := convertComparables(input)

	// This test ensures the function returns the correct type
	var _ []service.CompactComparable = result // Compile-time type check
}
