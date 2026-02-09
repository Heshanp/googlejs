//go:build integration

package service_test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/service"
)

// TestSemanticSearchNLVariations seeds the DB with a single iPhone 15 Pro listing
// and runs many natural-language query variations to verify search relevance.
//
// Run: go test -tags integration -v -run TestSemanticSearchNLVariations ./internal/service/
//
// Requires:
//   - DATABASE_URL  – PostgreSQL with pgvector
//   - GEMINI_API_KEY – Google Gemini API key for embedding generation
func TestSemanticSearchNLVariations(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	apiKey := os.Getenv("GEMINI_API_KEY")
	if dbURL == "" || apiKey == "" {
		t.Skip("Skipping: DATABASE_URL and GEMINI_API_KEY required")
	}

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	embeddingModel := os.Getenv("GEMINI_EMBEDDING_MODEL")
	embSvc := service.NewEmbeddingsService(apiKey, embeddingModel)
	vectorRepo := repository.NewVectorRepository(pool)
	imageRepo := repository.NewImageRepository(pool)
	searchSvc := service.NewSearchService(vectorRepo, imageRepo, embSvc)

	userID := seedTestUser(t, ctx, pool)
	defer cleanupUser(t, ctx, pool, userID)

	listingID := seedIPhoneListing(t, ctx, pool, embSvc, vectorRepo, userID)
	defer cleanupListing(t, ctx, pool, listingID)

	tests := []struct {
		name        string
		query       string
		expectMatch bool
	}{
		// ── Exact / near-exact matches ──────────────────────────────────
		{"exact product name", "iPhone 15 Pro", true},
		{"exact product with storage", "iPhone 15 Pro 256GB", true},
		{"exact product with color", "iPhone 15 Pro Natural Titanium", true},
		{"full title match", "iPhone 15 Pro 256GB Natural Titanium", true},

		// ── Partial model matches ───────────────────────────────────────
		{"brand only", "iPhone", true},
		{"brand + generation", "iPhone 15", true},
		{"brand + variant", "iPhone Pro", true},

		// ── Brand-aware queries ─────────────────────────────────────────
		{"apple phone", "Apple phone", true},
		{"apple iPhone", "Apple iPhone", true},         // "Apple" keyword matches category_fields make
		{"apple smartphone", "Apple smartphone", true}, // semantic similarity strong enough

		// ── Generic category queries ────────────────────────────────────
		{"generic phone", "Find me a phone", true}, // keyword fallback matches "phone" in "iPhone"
		{"generic smartphone", "smartphone", true}, // semantic match above threshold
		{"generic mobile phone", "mobile phone", true},
		{"generic cell phone", "cell phone", true},
		{"generic mobile", "mobile", true},

		// ── OS-aware queries ────────────────────────────────────────────
		{"iOS phone", "Find me an iOS phone", true},
		{"iOS device", "iOS device", true},
		{"iOS smartphone", "iOS smartphone", true},

		// ── Natural-language intent queries ──────────────────────────────
		{"looking for phone", "I'm looking for a phone", true},
		{"need an iPhone", "I need an iPhone", true},
		{"want to buy phone", "I want to buy a phone", true},
		{"phone for sale", "phone for sale", true},
		{"show me phones", "Show me phones", true},
		{"any phones available", "Any phones available?", true},
		{"buy iPhone", "buy iPhone", true},
		{"cheap iPhone", "cheap iPhone", true},
		{"used iPhone", "used iPhone", true},
		{"secondhand phone", "secondhand phone", true},

		// ── Feature / spec queries ──────────────────────────────────────
		{"256GB storage phone", "256GB phone", true},
		{"titanium phone", "titanium phone", true},
		{"pro phone", "pro phone", true},

		// ── Condition-based queries ─────────────────────────────────────
		{"excellent condition phone", "phone in excellent condition", true},

		// ── Wrong model version (should NOT match) ──────────────────────
		{"iPhone 16", "Find me an iPhone 16", false},
		{"iPhone 14", "iPhone 14", false},
		{"iPhone 13", "iPhone 13", false},
		{"iPhone SE", "iPhone SE", false},
		{"iPhone 16 Pro Max", "iPhone 16 Pro Max", false},

		// ── Wrong OS / ecosystem (should NOT match) ─────────────────────
		{"Android phone", "Find me an Android Phone", false},
		{"Android smartphone", "Android smartphone", false},

		// ── Competitor brands (should NOT match) ────────────────────────
		{"Samsung phone", "Samsung phone", false},
		{"Samsung Galaxy", "Samsung Galaxy S24", false},
		{"Google Pixel", "Google Pixel 9", false},
		{"OnePlus phone", "OnePlus phone", false},
		{"Xiaomi phone", "Xiaomi phone", false},
		{"Huawei phone", "Huawei phone", false},
		{"Nokia phone", "Nokia phone", false},
		{"Motorola phone", "Motorola phone", false},
		{"Sony Xperia", "Sony Xperia", false},
		{"Oppo phone", "Oppo Find X", false},

		// ── Different Apple products (should NOT match) ─────────────────
		{"iPad", "iPad Pro", false},
		{"MacBook", "MacBook Pro", false},
		{"Apple Watch", "Apple Watch", false},
		{"AirPods", "AirPods Pro", false},
		{"iMac", "iMac", false},

		// ── Completely unrelated (should NOT match) ─────────────────────
		{"car", "Toyota Camry", false},
		{"laptop", "gaming laptop", false},
		{"furniture", "dining table", false},
		{"clothing", "winter jacket", false},
		{"television", "55 inch TV", false},
		{"headphones", "wireless headphones", false},
		{"camera", "DSLR camera", false},
		{"bicycle", "mountain bike", false},
		{"guitar", "acoustic guitar", false},
		{"shoes", "running shoes", false},
		{"book", "science fiction book", false},
		{"umbrella", "umbrella", false},
		{"couch", "leather couch", false},
		{"refrigerator", "refrigerator", false},
		{"washing machine", "washing machine", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := searchSvc.Search(ctx, tt.query, models.Filters{}, 20)
			if err != nil {
				t.Fatalf("Search(%q) failed: %v", tt.query, err)
			}

			gotMatch := len(results) > 0
			if gotMatch != tt.expectMatch {
				t.Errorf("query=%q  expect_match=%v  got_match=%v  result_count=%d",
					tt.query, tt.expectMatch, gotMatch, len(results))
			}
		})
	}
}

func seedTestUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool) string {
	t.Helper()
	var userID string
	err := pool.QueryRow(ctx, `
		INSERT INTO users (email, name)
		VALUES ('search-test@test.local', 'Search Test User')
		RETURNING id
	`).Scan(&userID)
	if err != nil {
		t.Fatalf("Failed to insert test user: %v", err)
	}
	t.Logf("Seeded test user id=%s", userID)
	return userID
}

func cleanupUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string) {
	t.Helper()
	_, err := pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		t.Logf("Warning: failed to clean up user %s: %v", userID, err)
	}
}

// seedIPhoneListing inserts a single iPhone 15 Pro listing with its embedding.
func seedIPhoneListing(t *testing.T, ctx context.Context, pool *pgxpool.Pool, embSvc *service.EmbeddingsService, vectorRepo *repository.VectorRepository, userID string) int {
	t.Helper()

	title := "iPhone 15 Pro 256GB - Natural Titanium"
	description := "iPhone 15 Pro 256GB in Natural Titanium. Excellent condition, battery health 98%. Comes with original box, USB-C cable, and documentation. No scratches or dents."

	var listingID int
	err := pool.QueryRow(ctx, `
		INSERT INTO listings (title, description, price, category, location, status, category_fields, user_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`,
		title,
		description,
		169900,       // price in cents
		"cat_phones", // category
		"Auckland",   // location
		"active",     // status
		`{"brand":"Apple","make":"Apple","model":"iPhone 15 Pro","storage":"256GB","batteryHealth":98,"color":"Natural Titanium","condition":"Excellent"}`,
		userID,
	).Scan(&listingID)
	if err != nil {
		t.Fatalf("Failed to insert test listing: %v", err)
	}

	// Generate and store the embedding.
	embedding, embModel, err := embSvc.GenerateListingEmbeddingFromFieldsWithModel(
		ctx,
		title,
		description,
		"cat_phones",
		map[string]interface{}{
			"brand":         "Apple",
			"make":          "Apple",
			"model":         "iPhone 15 Pro",
			"storage":       "256GB",
			"batteryHealth": 98,
			"color":         "Natural Titanium",
			"condition":     "Excellent",
		},
	)
	if err != nil {
		cleanupListing(t, ctx, pool, listingID)
		t.Fatalf("Failed to generate listing embedding: %v", err)
	}

	if err := vectorRepo.UpdateEmbedding(ctx, listingID, embedding, embModel); err != nil {
		cleanupListing(t, ctx, pool, listingID)
		t.Fatalf("Failed to store listing embedding: %v", err)
	}

	t.Logf("Seeded listing id=%d model=%s", listingID, embModel)
	return listingID
}

func cleanupListing(t *testing.T, ctx context.Context, pool *pgxpool.Pool, listingID int) {
	t.Helper()
	_, err := pool.Exec(ctx, "DELETE FROM listings WHERE id = $1", listingID)
	if err != nil {
		t.Logf("Warning: failed to clean up listing %d: %v", listingID, err)
	} else {
		t.Logf("Cleaned up listing id=%d", listingID)
	}
}

func TestSemanticSearchNLVariations_Summary(t *testing.T) {
	t.Log(`Run integration test: cd backend && DATABASE_URL="postgres://..." GEMINI_API_KEY="..." go test -tags integration -v -run TestSemanticSearchNLVariations ./internal/service/`)
}

// TestNaturalLanguageLocationTermsRemainSearchable verifies that natural-language
// location terms (for example "in Auckland") do not accidentally eliminate valid
// matches when the listing text itself already matches the intent.
//
// Run: go test -tags integration -v -run TestNaturalLanguageLocationTermsRemainSearchable ./internal/service/
//
// Requires:
//   - DATABASE_URL – PostgreSQL with current migrations applied
func TestNaturalLanguageLocationTermsRemainSearchable(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("Skipping: DATABASE_URL required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	vectorRepo := repository.NewVectorRepository(pool)
	imageRepo := repository.NewImageRepository(pool)
	searchSvc := service.NewSearchService(vectorRepo, imageRepo, nil)

	userID := seedTestUser(t, ctx, pool)
	defer cleanupUser(t, ctx, pool, userID)

	aucklandID := seedCoffeeMachineListing(t, ctx, pool, userID, "Breville Coffee Machine with Grinder", "Excellent espresso machine for home baristas.", "Auckland")
	defer cleanupListing(t, ctx, pool, aucklandID)

	napierID := seedCoffeeMachineListing(t, ctx, pool, userID, "Nespresso Coffee Machine", "Compact capsule coffee machine in very good condition.", "Napier")
	defer cleanupListing(t, ctx, pool, napierID)

	plainQueryResults, err := searchSvc.Search(ctx, "find me a coffee machine", models.Filters{}, 20)
	if err != nil {
		t.Fatalf("plain Search failed: %v", err)
	}
	if !containsListingID(plainQueryResults, aucklandID) {
		t.Fatalf("expected plain query results to include Auckland listing id=%d, got %+v", aucklandID, plainQueryResults)
	}

	locationQueryResults, err := searchSvc.Search(ctx, "find me a coffee machine in Auckland", models.Filters{}, 20)
	if err != nil {
		t.Fatalf("location Search failed: %v", err)
	}
	if !containsListingID(locationQueryResults, aucklandID) {
		t.Fatalf(
			`expected natural-language location query to include Auckland listing id=%d for query %q; got %+v`,
			aucklandID,
			"find me a coffee machine in Auckland",
			locationQueryResults,
		)
	}
}

// TestVisionStyleModifierQueryStillMatches verifies that long vision-style queries
// containing non-essential modifier words still retrieve the intended listing.
//
// Run: go test -tags integration -v -run TestVisionStyleModifierQueryStillMatches ./internal/service/
//
// Requires:
//   - DATABASE_URL – PostgreSQL with current migrations applied
func TestVisionStyleModifierQueryStillMatches(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("Skipping: DATABASE_URL required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	vectorRepo := repository.NewVectorRepository(pool)
	imageRepo := repository.NewImageRepository(pool)
	searchSvc := service.NewSearchService(vectorRepo, imageRepo, nil)

	userID := seedTestUser(t, ctx, pool)
	defer cleanupUser(t, ctx, pool, userID)

	listingID := seedCoffeeMachineListing(
		t,
		ctx,
		pool,
		userID,
		"Breville Barista Espresso Machine Grinder",
		"Stainless espresso machine with built-in grinder and milk frother.",
		"Auckland",
	)
	defer cleanupListing(t, ctx, pool, listingID)

	query := "Breville Barista Espresso Machine with Integrated Grinder"
	results, err := searchSvc.Search(ctx, query, models.Filters{}, 20)
	if err != nil {
		t.Fatalf("Search(%q) failed: %v", query, err)
	}

	if !containsListingID(results, listingID) {
		t.Fatalf("expected results for %q to include listing id=%d, got %+v", query, listingID, results)
	}
}

// TestLocationFilterRemainsStrict verifies that explicit location filters are
// never relaxed away during multi-pass search expansion.
//
// Run: go test -tags integration -v -run TestLocationFilterRemainsStrict ./internal/service/
//
// Requires:
//   - DATABASE_URL – PostgreSQL with current migrations applied
func TestLocationFilterRemainsStrict(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("Skipping: DATABASE_URL required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	vectorRepo := repository.NewVectorRepository(pool)
	imageRepo := repository.NewImageRepository(pool)
	searchSvc := service.NewSearchService(vectorRepo, imageRepo, nil)

	userID := seedTestUser(t, ctx, pool)
	defer cleanupUser(t, ctx, pool, userID)

	aucklandID := seedCoffeeMachineListing(t, ctx, pool, userID, "Breville Coffee Machine Auckland", "Coffee machine with milk frother.", "Auckland")
	defer cleanupListing(t, ctx, pool, aucklandID)

	napierID := seedCoffeeMachineListing(t, ctx, pool, userID, "Breville Coffee Machine Napier", "Coffee machine same model different city.", "Napier")
	defer cleanupListing(t, ctx, pool, napierID)

	results, err := searchSvc.Search(
		ctx,
		"coffee machine",
		models.Filters{Location: "Auckland"},
		20,
	)
	if err != nil {
		t.Fatalf("Search failed: %v", err)
	}

	if !containsListingID(results, aucklandID) {
		t.Fatalf("expected results to include Auckland listing id=%d, got %+v", aucklandID, results)
	}
	if containsListingID(results, napierID) {
		t.Fatalf("expected results to exclude Napier listing id=%d when location filter is Auckland; got %+v", napierID, results)
	}
}

// TestVehicleSearchRelaxationFindsStaleModelListing verifies that strict make+model filters
// can miss a listing with stale structured metadata, and that SearchService relaxation
// recovers the expected result.
//
// Run: go test -tags integration -v -run TestVehicleSearchRelaxationFindsStaleModelListing ./internal/service/
//
// Requires:
//   - DATABASE_URL – PostgreSQL with current migrations applied
func TestVehicleSearchRelaxationFindsStaleModelListing(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("Skipping: DATABASE_URL required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	vectorRepo := repository.NewVectorRepository(pool)
	imageRepo := repository.NewImageRepository(pool)
	searchSvc := service.NewSearchService(vectorRepo, imageRepo, nil)

	userID := seedTestUser(t, ctx, pool)
	defer cleanupUser(t, ctx, pool, userID)

	exactListingID := seedLexusListingWithExactModel(t, ctx, pool, userID)
	defer cleanupListing(t, ctx, pool, exactListingID)

	staleListingID := seedLexusListingWithStaleModel(t, ctx, pool, userID)
	defer cleanupListing(t, ctx, pool, staleListingID)

	query := "Find me a lexus CT200h"
	strictFilters := models.Filters{
		Query: query,
		Make:  "Lexus",
		Model: "ct200h",
	}

	// Baseline: strict make+model keyword filter should include the exact-model listing
	// and miss the stale-model listing ("CT").
	strictResults, err := vectorRepo.KeywordSearch(ctx, strictFilters, 20)
	if err != nil {
		t.Fatalf("KeywordSearch strict failed: %v", err)
	}
	strictHasExact := false
	strictHasStale := false
	for _, l := range strictResults {
		if l.ID == exactListingID {
			strictHasExact = true
		}
		if l.ID == staleListingID {
			strictHasStale = true
		}
	}
	if !strictHasExact {
		t.Fatalf("Expected strict keyword search to include exact listing id=%d", exactListingID)
	}
	if strictHasStale {
		t.Fatalf("Expected strict keyword search to exclude stale listing id=%d", staleListingID)
	}

	// Service-level search should recover stale listing via relaxed pass while retaining strict hit.
	results, err := searchSvc.Search(ctx, query, strictFilters, 20)
	if err != nil {
		t.Fatalf("Search failed: %v", err)
	}

	foundExact := false
	foundStale := false
	for _, l := range results {
		if l.ID == exactListingID {
			foundExact = true
		}
		if l.ID == staleListingID {
			foundStale = true
		}
	}
	if !foundExact || !foundStale {
		t.Fatalf(
			"Expected service search to include both exact id=%d and stale id=%d; got %+v",
			exactListingID,
			staleListingID,
			results,
		)
	}
}

func seedLexusListingWithExactModel(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string) int {
	t.Helper()

	title := "2014 Lexus CT200h Hybrid - Silver"
	description := "Lexus CT200h with accurate metadata model."

	var listingID int
	err := pool.QueryRow(ctx, `
		INSERT INTO listings (title, description, price, category, location, status, category_fields, user_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
		RETURNING id
	`,
		title,
		description,
		12990,
		"cat_vehicles",
		"Auckland",
		"active",
		`{"make":"Lexus","model":"CT200h","year":2014,"fuel_type":"Hybrid"}`,
		userID,
	).Scan(&listingID)
	if err != nil {
		t.Fatalf("Failed to insert exact-model vehicle listing: %v", err)
	}

	t.Logf("Seeded exact-model listing id=%d", listingID)
	return listingID
}

func seedLexusListingWithStaleModel(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string) int {
	t.Helper()

	title := "2013 Lexus CT200h Hybrid - Low kms"
	description := "Well-maintained Lexus CT200h, hybrid hatchback, clean interior."

	var listingID int
	err := pool.QueryRow(ctx, `
		INSERT INTO listings (title, description, price, category, location, status, category_fields, user_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
		RETURNING id
	`,
		title,
		description,
		11990,
		"cat_vehicles",
		"Auckland",
		"active",
		`{"make":"Lexus","model":"CT","year":2013,"fuel_type":"Hybrid"}`,
		userID,
	).Scan(&listingID)
	if err != nil {
		t.Fatalf("Failed to insert stale-model vehicle listing: %v", err)
	}

	t.Logf("Seeded stale-model listing id=%d", listingID)
	return listingID
}

func seedCoffeeMachineListing(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID, title, description, location string) int {
	t.Helper()

	var listingID int
	err := pool.QueryRow(ctx, `
		INSERT INTO listings (title, description, price, category, location, status, category_fields, user_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
		RETURNING id
	`,
		title,
		description,
		950,
		"cat_home",
		location,
		"active",
		`{"make":"Breville","model":"Barista Express","condition":"Good"}`,
		userID,
	).Scan(&listingID)
	if err != nil {
		t.Fatalf("Failed to insert coffee machine listing (%s): %v", location, err)
	}

	t.Logf("Seeded coffee listing id=%d location=%s", listingID, location)
	return listingID
}

func containsListingID(listings []models.Listing, id int) bool {
	for _, listing := range listings {
		if listing.ID == id {
			return true
		}
	}
	return false
}
