package service

import (
	"context"
	"errors"
	"testing"

	"github.com/yourusername/justsell/backend/internal/models"
)

type mockSearchRepo struct {
	keywordCalls   []models.Filters
	keywordResults [][]models.Listing
	keywordErrors  []error
	hybridCalls    int
}

func (m *mockSearchRepo) HybridSearch(ctx context.Context, embedding []float32, embeddingModel string, filters models.Filters, limit int) ([]models.Listing, error) {
	m.hybridCalls++
	return []models.Listing{}, nil
}

func (m *mockSearchRepo) KeywordSearch(ctx context.Context, filters models.Filters, limit int) ([]models.Listing, error) {
	m.keywordCalls = append(m.keywordCalls, filters)
	callIndex := len(m.keywordCalls) - 1

	if callIndex < len(m.keywordErrors) && m.keywordErrors[callIndex] != nil {
		return nil, m.keywordErrors[callIndex]
	}
	if callIndex < len(m.keywordResults) {
		return m.keywordResults[callIndex], nil
	}
	return []models.Listing{}, nil
}

func TestSearch_AggregatesStrictAndRelaxedPassResults(t *testing.T) {
	mockRepo := &mockSearchRepo{
		keywordResults: [][]models.Listing{
			{{ID: 1001, Title: "Lexus CT200h exact metadata"}},
			{{ID: 1001, Title: "Lexus CT200h exact metadata"}, {ID: 1002, Title: "Lexus CT 200h stale model metadata"}},
		},
	}
	svc := &SearchService{
		vectorRepo:        mockRepo,
		embeddingsService: nil,
	}

	filters := models.Filters{
		Make:     "Lexus",
		Model:    "ct200h",
		Location: "Auckland",
	}
	listings, err := svc.Search(context.Background(), "Find me a lexus CT200h", filters, 20)
	if err != nil {
		t.Fatalf("Search returned unexpected error: %v", err)
	}

	if len(mockRepo.keywordCalls) != 2 {
		t.Fatalf("expected strict + relaxed passes (2 calls), got %d", len(mockRepo.keywordCalls))
	}

	strict := mockRepo.keywordCalls[0]
	relaxed := mockRepo.keywordCalls[1]
	if strict.Make != "Lexus" || strict.Model != "ct200h" || strict.Location != "Auckland" {
		t.Fatalf("strict pass mismatch: %+v", strict)
	}
	if relaxed.Make != "" || relaxed.Model != "" || relaxed.Location != "Auckland" {
		t.Fatalf("relaxed pass should clear make/model only and preserve location, got %+v", relaxed)
	}

	if len(listings) != 2 {
		t.Fatalf("expected 2 merged listings, got %d", len(listings))
	}
	if listings[0].ID != 1001 || listings[1].ID != 1002 {
		t.Fatalf("unexpected listing order/IDs: %+v", listings)
	}
}

func TestSearch_UsesRelaxedPassWhenStrictMisses(t *testing.T) {
	mockRepo := &mockSearchRepo{
		keywordResults: [][]models.Listing{
			{},
			{{ID: 2001, Title: "Recovered via relaxed pass"}},
		},
	}
	svc := &SearchService{
		vectorRepo:        mockRepo,
		embeddingsService: nil,
	}

	filters := models.Filters{Make: "Lexus", Model: "ct200h"}
	listings, err := svc.Search(context.Background(), "lexus ct200h", filters, 20)
	if err != nil {
		t.Fatalf("Search returned unexpected error: %v", err)
	}
	if len(listings) != 1 {
		t.Fatalf("expected 1 listing from relaxed pass, got %d", len(listings))
	}
	if len(mockRepo.keywordCalls) != 2 {
		t.Fatalf("expected strict + relaxed passes (2 calls), got %d", len(mockRepo.keywordCalls))
	}
}

func TestSearch_DoesNotRelaxWithoutStringFacetFilters(t *testing.T) {
	priceMin := 1000
	mockRepo := &mockSearchRepo{
		keywordResults: [][]models.Listing{
			{{ID: 3001, Title: "Numeric-filter result"}},
		},
	}
	svc := &SearchService{
		vectorRepo:        mockRepo,
		embeddingsService: nil,
	}

	_, err := svc.Search(context.Background(), "umbrella", models.Filters{PriceMin: &priceMin}, 20)
	if err != nil {
		t.Fatalf("Search returned unexpected error: %v", err)
	}
	if len(mockRepo.keywordCalls) != 1 {
		t.Fatalf("expected 1 keyword call (strict only), got %d", len(mockRepo.keywordCalls))
	}
}

func TestSearch_DoesNotRelaxForLocationOnlyFilters(t *testing.T) {
	mockRepo := &mockSearchRepo{
		keywordResults: [][]models.Listing{
			{{ID: 3101, Title: "Auckland-only listing"}},
		},
	}
	svc := &SearchService{
		vectorRepo:        mockRepo,
		embeddingsService: nil,
	}

	_, err := svc.Search(context.Background(), "coffee machine", models.Filters{Location: "Auckland"}, 20)
	if err != nil {
		t.Fatalf("Search returned unexpected error: %v", err)
	}
	if len(mockRepo.keywordCalls) != 1 {
		t.Fatalf("expected 1 keyword call (strict only), got %d", len(mockRepo.keywordCalls))
	}
	if mockRepo.keywordCalls[0].Location != "Auckland" {
		t.Fatalf("expected strict pass to preserve location filter, got %+v", mockRepo.keywordCalls[0])
	}
}

func TestSearch_DeduplicatesAcrossPasses(t *testing.T) {
	mockRepo := &mockSearchRepo{
		keywordResults: [][]models.Listing{
			{{ID: 4001, Title: "Listing A"}, {ID: 4002, Title: "Listing B"}},
			{{ID: 4002, Title: "Listing B"}, {ID: 4003, Title: "Listing C"}},
		},
	}
	svc := &SearchService{
		vectorRepo:        mockRepo,
		embeddingsService: nil,
	}

	listings, err := svc.Search(context.Background(), "lexus", models.Filters{Make: "Lexus"}, 20)
	if err != nil {
		t.Fatalf("Search returned unexpected error: %v", err)
	}

	if len(listings) != 3 {
		t.Fatalf("expected 3 deduplicated listings, got %d", len(listings))
	}
	if listings[0].ID != 4001 || listings[1].ID != 4002 || listings[2].ID != 4003 {
		t.Fatalf("unexpected dedup order/IDs: %+v", listings)
	}
}

func TestSearch_DoesNotRelaxOnError(t *testing.T) {
	mockRepo := &mockSearchRepo{
		keywordErrors: []error{
			errors.New("db failure"),
		},
	}
	svc := &SearchService{
		vectorRepo:        mockRepo,
		embeddingsService: nil,
	}

	_, err := svc.Search(context.Background(), "lexus ct200h", models.Filters{Make: "Lexus", Model: "ct200h"}, 20)
	if err == nil {
		t.Fatal("expected error but got nil")
	}
	if len(mockRepo.keywordCalls) != 1 {
		t.Fatalf("expected one call before returning error, got %d", len(mockRepo.keywordCalls))
	}
}
