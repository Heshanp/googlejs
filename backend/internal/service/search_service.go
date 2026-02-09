package service

import (
	"context"
	"log"
	"strings"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
)

type searchRepository interface {
	HybridSearch(ctx context.Context, embedding []float32, embeddingModel string, filters models.Filters, limit int) ([]models.Listing, error)
	KeywordSearch(ctx context.Context, filters models.Filters, limit int) ([]models.Listing, error)
}

type searchImageRepository interface {
	GetByListingID(ctx context.Context, listingID int) ([]models.ListingImage, error)
}

type searchPass struct {
	label   string
	filters models.Filters
}

// SearchService handles search operations
type SearchService struct {
	vectorRepo        searchRepository
	imageRepo         searchImageRepository
	embeddingsService *EmbeddingsService
}

// NewSearchService creates a new search service
func NewSearchService(vectorRepo *repository.VectorRepository, imageRepo *repository.ImageRepository, embeddingsService *EmbeddingsService) *SearchService {
	return &SearchService{
		vectorRepo:        vectorRepo,
		imageRepo:         imageRepo,
		embeddingsService: embeddingsService,
	}
}

// Search performs a hybrid search with the given query and filters
func (s *SearchService) Search(ctx context.Context, query string, filters models.Filters, limit int) ([]models.Listing, error) {
	query = strings.TrimSpace(query)
	if limit <= 0 {
		limit = 20
	}
	filters.Query = query

	var err error
	var queryEmbedding []float32
	var embeddingModel string
	canUseHybrid := false

	if s.embeddingsService != nil {
		queryEmbedding, embeddingModel, err = s.embeddingsService.GenerateEmbeddingWithModel(ctx, query)
		if err != nil {
			log.Printf("[SEARCH] Embedding generation failed for query %q, falling back to keyword search: %v", query, err)
		} else {
			canUseHybrid = true
		}
	}

	passes := buildSearchPasses(filters)
	listings := make([]models.Listing, 0, limit)
	seenListingIDs := make(map[int]struct{}, limit)

	for i, pass := range passes {
		remaining := limit - len(listings)
		if remaining <= 0 {
			break
		}

		passListings, passErr := s.searchWithFilters(ctx, pass.filters, remaining, queryEmbedding, embeddingModel, canUseHybrid)
		err = passErr
		if err != nil {
			return nil, err
		}

		added := 0
		for _, listing := range passListings {
			if _, exists := seenListingIDs[listing.ID]; exists {
				continue
			}
			seenListingIDs[listing.ID] = struct{}{}
			listings = append(listings, listing)
			added++
			if len(listings) >= limit {
				break
			}
		}

		log.Printf(
			"[SEARCH] Pass=%s query=%q pass_results=%d unique_added=%d total=%d",
			pass.label,
			query,
			len(passListings),
			added,
			len(listings),
		)

		if i < len(passes)-1 {
			nextPass := passes[i+1]
			log.Printf(
				"[SEARCH] Continuing search expansion from pass=%s to pass=%s (remaining_slots=%d)",
				pass.label,
				nextPass.label,
				limit-len(listings),
			)
		}
	}

	// Load images for each listing
	if s.imageRepo != nil {
		for i := range listings {
			images, err := s.imageRepo.GetByListingID(ctx, listings[i].ID)
			if err != nil {
				// Log error but continue - some listings may not have images
				continue
			}
			listings[i].Images = images
		}
	}

	return listings, nil
}

func buildSearchPasses(filters models.Filters) []searchPass {
	passes := []searchPass{
		{label: "strict", filters: filters},
	}

	if hasRelaxableFacetFilters(filters) {
		withoutMakeModel := filters
		withoutMakeModel.Make = ""
		withoutMakeModel.Model = ""

		if withoutMakeModel != filters {
			passes = append(passes, searchPass{
				label:   "without_make_model",
				filters: withoutMakeModel,
			})
		}
	}

	return passes
}

func hasRelaxableFacetFilters(filters models.Filters) bool {
	return strings.TrimSpace(filters.Make) != "" ||
		strings.TrimSpace(filters.Model) != ""
}

func (s *SearchService) searchWithFilters(
	ctx context.Context,
	filters models.Filters,
	limit int,
	queryEmbedding []float32,
	embeddingModel string,
	canUseHybrid bool,
) ([]models.Listing, error) {
	// Prefer semantic+keyword hybrid, but always fall back to keyword search if semantic fails.
	if canUseHybrid {
		listings, err := s.vectorRepo.HybridSearch(ctx, queryEmbedding, embeddingModel, filters, limit)
		if err != nil {
			log.Printf("[SEARCH] Hybrid search failed for pass filters; falling back to keyword search: %v", err)
			return s.vectorRepo.KeywordSearch(ctx, filters, limit)
		}
		if len(listings) == 0 {
			// Semantic miss but keyword may still match user intent.
			fallbackListings, fallbackErr := s.vectorRepo.KeywordSearch(ctx, filters, limit)
			if fallbackErr == nil {
				return fallbackListings, nil
			}
		}

		return listings, nil
	}

	return s.vectorRepo.KeywordSearch(ctx, filters, limit)
}
