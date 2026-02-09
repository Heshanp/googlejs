package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"regexp"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pgvector/pgvector-go"
	"github.com/yourusername/justsell/backend/internal/models"
)

// VectorRepository handles vector search operations
type VectorRepository struct {
	db               *pgxpool.Pool
	anchorMatchRatio float64
}

// NewVectorRepository creates a new vector repository
func NewVectorRepository(db *pgxpool.Pool) *VectorRepository {
	return &VectorRepository{
		db:               db,
		anchorMatchRatio: defaultSearchAnchorMatchRatio,
	}
}

const defaultSearchAnchorMatchRatio = 0.60

// SimilarListingsStats contains aggregate statistics about similar listings
type SimilarListingsStats struct {
	TotalCount    int    `json:"totalCount"`
	AvgPrice      int    `json:"avgPrice"`
	MedianPrice   int    `json:"medianPrice"`
	MinPrice      int    `json:"minPrice"`
	MaxPrice      int    `json:"maxPrice"`
	Percentile    int    `json:"percentile"`    // Current listing is cheaper than X% of similar
	PricePosition string `json:"pricePosition"` // "great_deal", "below_average", "average", "above_average", "overpriced"
}

// CompactSimilarListing contains minimal listing fields for comparison
type CompactSimilarListing struct {
	Title     string `json:"title"`
	Price     int    `json:"price"`
	Condition string `json:"condition"`
	Year      int    `json:"year,omitempty"`
	Mileage   int    `json:"mileage,omitempty"`
}

// ListingComparisonContext combines stats with top comparables for AI context
type ListingComparisonContext struct {
	Stats       SimilarListingsStats    `json:"stats"`
	Comparables []CompactSimilarListing `json:"comparables"`
}

type keywordPlan struct {
	StrictQueryText    string
	RelaxedOrQueryText string
	LikeTokens         []string
	AnchorTokens       []string
	AnchorMinMatch     int
	RequiredAllTokens  []string
	SpecificIntent     bool
}

// SetAnchorMatchRatio configures how many anchor tokens must match in search retrieval.
// Valid values are in the range (0, 1], otherwise the default ratio is used.
func (r *VectorRepository) SetAnchorMatchRatio(ratio float64) {
	r.anchorMatchRatio = normalizeAnchorMatchRatio(ratio)
}

// HybridSearch combines semantic vector search with keyword search using weighted RRF.
// This prevents low-quality semantic-only matches from crowding out clearly relevant keyword hits.
func (r *VectorRepository) HybridSearch(ctx context.Context, embedding []float32, embeddingModel string, filters models.Filters, limit int) ([]models.Listing, error) {
	if limit <= 0 {
		limit = 20
	}

	const (
		minSemanticSimilarity  = 0.40
		specificSemanticFloor  = 0.72
		genericSemanticFloor   = 0.58
		maxVectorCandidates    = 120
		maxKeywordCandidates   = 120
		rrfK                   = 60.0
		semanticRRFWeight      = 0.55
		keywordRRFWeight       = 0.35
		relaxedKeywordDiscount = 0.75
		ilikeKeywordBoost      = 0.12
	)

	plan := buildKeywordPlanWithRatio(filters.Query, r.anchorMatchRatio)
	if plan.StrictQueryText == "" {
		return []models.Listing{}, nil
	}
	logKeywordPlan("hybrid", plan)

	semanticFloor := genericSemanticFloor
	if plan.SpecificIntent {
		semanticFloor = specificSemanticFloor
	}

	vec := pgvector.NewVector(embedding)
	args := []interface{}{vec, strings.TrimSpace(embeddingModel)}
	argIndex := 3

	filterClauses, args, argIndex := buildListingFilterClauses(filters, "l", args, argIndex)
	whereClause := strings.Join(filterClauses, " AND ")

	strictQueryArgIndex := argIndex
	args = append(args, plan.StrictQueryText)
	argIndex++

	relaxedQueryArgIndex := argIndex
	args = append(args, plan.RelaxedOrQueryText)
	argIndex++

	likeTokensArgIndex := argIndex
	args = append(args, plan.LikeTokens)
	argIndex++
	anchorTokensArgIndex := argIndex
	args = append(args, plan.AnchorTokens)
	argIndex++
	anchorMinMatchArgIndex := argIndex
	args = append(args, plan.AnchorMinMatch)
	argIndex++
	requiredAllTokensArgIndex := argIndex
	args = append(args, plan.RequiredAllTokens)

	query := fmt.Sprintf(`
		WITH vector_matches AS (
			SELECT
				l.id,
				1 - (l.embedding <=> $1::vector) AS semantic_score,
				ROW_NUMBER() OVER (ORDER BY l.embedding <=> $1::vector) AS semantic_rank
			FROM listings l
			WHERE %s
			  AND l.embedding IS NOT NULL
			  AND l.embedding_model = $2
			  AND (
				cardinality($%d::text[]) = 0
				OR (
					SELECT COUNT(*)::int
					FROM unnest($%d::text[]) AS tok
					WHERE (
						l.title ILIKE '%%' || tok || '%%'
						OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
					)
				) >= $%d
			  )
			  AND (
				cardinality($%d::text[]) = 0
				OR NOT EXISTS (
					SELECT 1
					FROM unnest($%d::text[]) AS tok
					WHERE NOT (
						l.title ILIKE '%%' || tok || '%%'
						OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
					)
				)
			  )
			  AND 1 - (l.embedding <=> $1::vector) >= %.2f
			ORDER BY l.embedding <=> $1::vector
			LIMIT %d
		),
		keyword_matches AS (
			SELECT
				l.id,
				GREATEST(
					COALESCE(ts_rank_cd(l.search_vector, websearch_to_tsquery('english', $%d)), 0),
					COALESCE(ts_rank_cd(l.search_vector, websearch_to_tsquery('english', $%d)) * %.2f, 0),
					COALESCE((
						SELECT CASE
							WHEN cardinality($%d::text[]) = 0 THEN 0
							ELSE (COUNT(*)::float / cardinality($%d::text[])) * %.2f
						END
						FROM unnest($%d::text[]) AS tok
						WHERE l.title ILIKE '%%' || tok || '%%'
						   OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
						   OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
						   OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
						   OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
					), 0)
				) AS keyword_score,
				ROW_NUMBER() OVER (
					ORDER BY
						GREATEST(
							COALESCE(ts_rank_cd(l.search_vector, websearch_to_tsquery('english', $%d)), 0),
							COALESCE(ts_rank_cd(l.search_vector, websearch_to_tsquery('english', $%d)) * %.2f, 0),
							COALESCE((
								SELECT CASE
									WHEN cardinality($%d::text[]) = 0 THEN 0
									ELSE (COUNT(*)::float / cardinality($%d::text[])) * %.2f
								END
								FROM unnest($%d::text[]) AS tok
								WHERE l.title ILIKE '%%' || tok || '%%'
								   OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
								   OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
								   OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
								   OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
							), 0)
						) DESC,
						l.created_at DESC
				) AS keyword_rank
			FROM listings l
				WHERE %s
				  AND (
				l.search_vector @@ websearch_to_tsquery('english', $%d)
				OR l.search_vector @@ websearch_to_tsquery('english', $%d)
				OR EXISTS (
					SELECT 1
					FROM unnest($%d::text[]) AS tok
					WHERE l.title ILIKE '%%' || tok || '%%'
					   OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
					   OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
					   OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
					   OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
				)
			  )
			  AND (
				cardinality($%d::text[]) = 0
				OR (
					SELECT COUNT(*)::int
					FROM unnest($%d::text[]) AS tok
					WHERE (
						l.title ILIKE '%%' || tok || '%%'
						OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
					)
				) >= $%d
			  )
			  AND (
				cardinality($%d::text[]) = 0
				OR NOT EXISTS (
					SELECT 1
					FROM unnest($%d::text[]) AS tok
					WHERE NOT (
						l.title ILIKE '%%' || tok || '%%'
						OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
						OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
					)
				)
			  )
			ORDER BY keyword_score DESC, l.created_at DESC
			LIMIT %d
		),
		keyword_stats AS (
			SELECT COUNT(*)::int AS hit_count
			FROM keyword_matches
		),
		combined AS (
			SELECT
				COALESCE(v.id, k.id) AS id,
				COALESCE(v.semantic_score, 0) AS semantic_score,
				COALESCE(k.keyword_score, 0) AS keyword_score,
				(
					%.4f * COALESCE(1.0 / (%.1f + v.semantic_rank), 0) +
					%.4f * COALESCE(1.0 / (%.1f + k.keyword_rank), 0)
				) AS combined_score
			FROM vector_matches v
			FULL OUTER JOIN keyword_matches k ON k.id = v.id
		),
		ranked AS (
			SELECT c.*
			FROM combined c
			CROSS JOIN keyword_stats ks
			WHERE c.keyword_score > 0
			   OR (ks.hit_count = 0 AND c.semantic_score >= %.2f)
		)
		SELECT
			l.id, l.public_id, l.title, l.description, l.price, l.category, l.location,
			l.created_at, l.updated_at,
			r.semantic_score, r.keyword_score, r.combined_score
		FROM ranked r
		JOIN listings l ON l.id = r.id
		ORDER BY r.combined_score DESC, r.semantic_score DESC, r.keyword_score DESC, l.created_at DESC
		LIMIT %d
		`,
		whereClause,
		anchorTokensArgIndex,
		anchorTokensArgIndex,
		anchorMinMatchArgIndex,
		requiredAllTokensArgIndex,
		requiredAllTokensArgIndex,
		minSemanticSimilarity,
		maxVectorCandidates,
		strictQueryArgIndex,
		relaxedQueryArgIndex,
		relaxedKeywordDiscount,
		likeTokensArgIndex,
		likeTokensArgIndex,
		ilikeKeywordBoost,
		likeTokensArgIndex,
		strictQueryArgIndex,
		relaxedQueryArgIndex,
		relaxedKeywordDiscount,
		likeTokensArgIndex,
		likeTokensArgIndex,
		ilikeKeywordBoost,
		likeTokensArgIndex,
		whereClause,
		strictQueryArgIndex,
		relaxedQueryArgIndex,
		likeTokensArgIndex,
		anchorTokensArgIndex,
		anchorTokensArgIndex,
		anchorMinMatchArgIndex,
		requiredAllTokensArgIndex,
		requiredAllTokensArgIndex,
		maxKeywordCandidates,
		semanticRRFWeight,
		rrfK,
		keywordRRFWeight,
		rrfK,
		semanticFloor,
		limit,
	)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute hybrid search: %w", err)
	}
	defer rows.Close()

	results := make([]models.Listing, 0, limit)
	for rows.Next() {
		var l models.Listing
		var semanticScore float64
		var keywordScore float64
		var combinedScore float64

		if err := rows.Scan(
			&l.ID, &l.PublicID, &l.Title, &l.Description, &l.Price, &l.Category, &l.Location,
			&l.CreatedAt, &l.UpdatedAt,
			&semanticScore, &keywordScore, &combinedScore,
		); err != nil {
			return nil, fmt.Errorf("failed to scan hybrid search result: %w", err)
		}

		results = append(results, l)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating hybrid search results: %w", err)
	}

	return results, nil
}

// KeywordSearch performs a pure lexical fallback using PostgreSQL full-text search.
// This is used when embedding generation fails or vector search is unavailable.
func (r *VectorRepository) KeywordSearch(ctx context.Context, filters models.Filters, limit int) ([]models.Listing, error) {
	if limit <= 0 {
		limit = 20
	}

	const (
		relaxedKeywordDiscount = 0.75
		ilikeKeywordBoost      = 0.12
	)

	plan := buildKeywordPlanWithRatio(filters.Query, r.anchorMatchRatio)
	if plan.StrictQueryText == "" {
		return []models.Listing{}, nil
	}
	logKeywordPlan("keyword", plan)

	args := []interface{}{plan.StrictQueryText, plan.RelaxedOrQueryText, plan.LikeTokens, plan.AnchorTokens, plan.AnchorMinMatch, plan.RequiredAllTokens}
	argIndex := 7
	filterClauses, args, _ := buildListingFilterClauses(filters, "l", args, argIndex)
	whereClause := strings.Join(filterClauses, " AND ")

	query := fmt.Sprintf(`
		SELECT
			l.id, l.public_id, l.title, l.description, l.price, l.category, l.location,
			l.created_at, l.updated_at,
			GREATEST(
				COALESCE(ts_rank_cd(l.search_vector, websearch_to_tsquery('english', $1)), 0),
				COALESCE(ts_rank_cd(l.search_vector, websearch_to_tsquery('english', $2)) * %.2f, 0),
				COALESCE((
					SELECT CASE
						WHEN cardinality($3::text[]) = 0 THEN 0
						ELSE (COUNT(*)::float / cardinality($3::text[])) * %.2f
					END
					FROM unnest($3::text[]) AS tok
					WHERE l.title ILIKE '%%' || tok || '%%'
					   OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
					   OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
					   OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
					   OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
				), 0)
			) AS keyword_score
		FROM listings l
		WHERE %s
		  AND (
			l.search_vector @@ websearch_to_tsquery('english', $1)
			OR l.search_vector @@ websearch_to_tsquery('english', $2)
			OR EXISTS (
				SELECT 1
				FROM unnest($3::text[]) AS tok
				WHERE l.title ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
			)
		  )
		  AND (
			cardinality($4::text[]) = 0
			OR (
				SELECT COUNT(*)::int
				FROM unnest($4::text[]) AS tok
				WHERE (
					l.title ILIKE '%%' || tok || '%%'
					OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
				)
			) >= $5
		  )
		  AND (
			cardinality($6::text[]) = 0
			OR NOT EXISTS (
				SELECT 1
				FROM unnest($6::text[]) AS tok
				WHERE NOT (
					l.title ILIKE '%%' || tok || '%%'
					OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
				)
			)
		  )
		ORDER BY
			COALESCE((
				SELECT COUNT(*)::int
				FROM unnest($3::text[]) AS tok
				WHERE l.title ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
			), 0) DESC,
			keyword_score DESC,
			l.created_at DESC
		LIMIT %d
	`, relaxedKeywordDiscount, ilikeKeywordBoost, whereClause, limit)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		if isTSQuerySyntaxError(err) {
			return r.keywordILIKEFallback(ctx, filters, limit)
		}
		return nil, fmt.Errorf("failed to execute keyword search: %w", err)
	}
	defer rows.Close()

	results := make([]models.Listing, 0, limit)
	for rows.Next() {
		var l models.Listing
		var keywordScore float64
		if err := rows.Scan(
			&l.ID, &l.PublicID, &l.Title, &l.Description, &l.Price, &l.Category, &l.Location,
			&l.CreatedAt, &l.UpdatedAt,
			&keywordScore,
		); err != nil {
			return nil, fmt.Errorf("failed to scan keyword search result: %w", err)
		}
		results = append(results, l)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating keyword search results: %w", err)
	}

	return results, nil
}

func (r *VectorRepository) keywordILIKEFallback(ctx context.Context, filters models.Filters, limit int) ([]models.Listing, error) {
	plan := buildKeywordPlanWithRatio(filters.Query, r.anchorMatchRatio)
	if len(plan.LikeTokens) == 0 {
		return []models.Listing{}, nil
	}
	logKeywordPlan("keyword_ilike_fallback", plan)

	args := []interface{}{plan.LikeTokens, plan.AnchorTokens, plan.AnchorMinMatch, plan.RequiredAllTokens}
	argIndex := 5
	filterClauses, args, _ := buildListingFilterClauses(filters, "l", args, argIndex)
	whereClause := strings.Join(filterClauses, " AND ")

	query := fmt.Sprintf(`
		SELECT
			l.id, l.public_id, l.title, l.description, l.price, l.category, l.location,
			l.created_at, l.updated_at
		FROM listings l
		WHERE %s
		  AND EXISTS (
			SELECT 1
			FROM unnest($1::text[]) AS tok
			WHERE l.title ILIKE '%%' || tok || '%%'
			   OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
			   OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
			   OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
			   OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
		  )
		  AND (
			cardinality($2::text[]) = 0
			OR (
				SELECT COUNT(*)::int
				FROM unnest($2::text[]) AS tok
				WHERE (
					l.title ILIKE '%%' || tok || '%%'
					OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
				)
			) >= $3
		  )
		  AND (
			cardinality($4::text[]) = 0
			OR NOT EXISTS (
				SELECT 1
				FROM unnest($4::text[]) AS tok
				WHERE NOT (
					l.title ILIKE '%%' || tok || '%%'
					OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
					OR COALESCE(l.category_fields::text, '') ILIKE '%%' || tok || '%%'
				)
			)
		  )
		ORDER BY
			COALESCE((
				SELECT COUNT(*)::int
				FROM unnest($1::text[]) AS tok
				WHERE l.title ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.description, '') ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.category, '') ILIKE '%%' || tok || '%%'
				   OR COALESCE(l.location, '') ILIKE '%%' || tok || '%%'
			), 0) DESC,
			l.created_at DESC
		LIMIT %d
	`, whereClause, limit)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute ilike fallback search: %w", err)
	}
	defer rows.Close()

	results := make([]models.Listing, 0, limit)
	for rows.Next() {
		var l models.Listing
		if err := rows.Scan(
			&l.ID, &l.PublicID, &l.Title, &l.Description, &l.Price, &l.Category, &l.Location,
			&l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan ilike fallback search result: %w", err)
		}
		results = append(results, l)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating ilike fallback search results: %w", err)
	}

	return results, nil
}

func isTSQuerySyntaxError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "syntax error in tsquery") ||
		(strings.Contains(msg, "tsquery") && strings.Contains(msg, "syntax error"))
}

var keywordTokenRE = regexp.MustCompile(`[a-z0-9]+`)

var stopQueryTokens = map[string]struct{}{
	"a": {}, "an": {}, "and": {}, "any": {}, "around": {}, "at": {}, "buy": {}, "find": {}, "for": {}, "from": {}, "get": {},
	"i": {}, "in": {}, "is": {}, "looking": {}, "me": {}, "my": {}, "near": {}, "need": {}, "of": {}, "on": {},
	"please": {}, "search": {}, "show": {}, "the": {}, "to": {}, "want": {}, "with": {},
}

var softModifierTokens = map[string]struct{}{
	"available": {}, "cheap": {}, "condition": {}, "excellent": {}, "sale": {}, "secondhand": {}, "used": {},
	"integrated": {}, "builtin": {}, "built": {}, "included": {}, "complete": {}, "combo": {},
}

var modelQualifierTokens = map[string]struct{}{
	"max": {}, "mini": {}, "plus": {}, "pro": {}, "se": {}, "ultra": {},
}

var relaxedSynonymTokens = map[string][]string{
	"cell":       {"phone"},
	"cellphone":  {"phone"},
	"device":     {"phone"},
	"ios":        {"iphone", "apple"},
	"mobile":     {"phone"},
	"secondhand": {"used"},
	"smartphone": {"phone"},
}

var genericIntentTokens = map[string]struct{}{
	"cell": {}, "cellphone": {}, "device": {}, "mobile": {}, "phone": {}, "phones": {}, "smartphone": {},
}

var modelSpecificTokens = map[string]struct{}{
	"max": {}, "mini": {}, "plus": {}, "pro": {}, "se": {}, "ultra": {},
}

func buildKeywordQuery(raw string) string {
	return buildKeywordPlan(raw).StrictQueryText
}

func buildKeywordPlan(raw string) keywordPlan {
	return buildKeywordPlanWithRatio(raw, defaultSearchAnchorMatchRatio)
}

func buildKeywordPlanWithRatio(raw string, anchorMatchRatio float64) keywordPlan {
	anchorMatchRatio = normalizeAnchorMatchRatio(anchorMatchRatio)

	raw = strings.TrimSpace(strings.ToLower(raw))
	if raw == "" {
		return keywordPlan{}
	}

	matches := keywordTokenRE.FindAllString(raw, -1)
	if len(matches) == 0 {
		return keywordPlan{
			StrictQueryText:    raw,
			RelaxedOrQueryText: raw,
			LikeTokens:         []string{},
			AnchorMinMatch:     0,
		}
	}

	strictTokens := make([]string, 0, len(matches))
	relaxedTokens := make([]string, 0, len(matches)*2)
	specificIntent := false

	for _, token := range matches {
		if len(token) < 2 {
			continue
		}
		if _, isStop := stopQueryTokens[token]; isStop {
			continue
		}
		if _, isModelQualifier := modelQualifierTokens[token]; isModelQualifier {
			specificIntent = true
		}
		if strings.IndexFunc(token, isDigit) >= 0 {
			specificIntent = true
		}

		relaxedTokens = appendUnique(relaxedTokens, token)
		if expansions, ok := relaxedSynonymTokens[token]; ok {
			for _, expansion := range expansions {
				relaxedTokens = appendUnique(relaxedTokens, expansion)
			}
		}

		if _, isSoftModifier := softModifierTokens[token]; isSoftModifier {
			continue
		}
		strictTokens = appendUnique(strictTokens, token)
	}

	if len(strictTokens) == 0 {
		strictTokens = appendUnique(strictTokens, matches...)
	}

	if len(relaxedTokens) == 0 {
		relaxedTokens = appendUnique(relaxedTokens, strictTokens...)
	}

	likeTokens := make([]string, 0, len(relaxedTokens)*2)
	for _, token := range relaxedTokens {
		likeTokens = appendUnique(likeTokens, token)
		for _, variant := range singularVariants(token) {
			likeTokens = appendUnique(likeTokens, variant)
		}
	}

	anchorTokens := make([]string, 0, len(strictTokens)*2)
	requiredAllTokens := make([]string, 0, len(strictTokens))
	hasFamilyToken := false
	for _, token := range strictTokens {
		if _, isGeneric := genericIntentTokens[token]; isGeneric {
			continue
		}
		if strings.IndexFunc(token, isDigit) >= 0 {
			requiredAllTokens = appendUnique(requiredAllTokens, token)
			continue
		}
		if _, isModelSpecific := modelSpecificTokens[token]; isModelSpecific {
			requiredAllTokens = appendUnique(requiredAllTokens, token)
			continue
		}
		if expansions, ok := relaxedSynonymTokens[token]; ok && len(expansions) > 0 {
			anchorTokens = appendUnique(anchorTokens, expansions...)
		} else {
			anchorTokens = appendUnique(anchorTokens, token)
		}
		if token == "iphone" || token == "ipad" || token == "macbook" || token == "airpods" || token == "imac" || token == "watch" {
			hasFamilyToken = true
		}
	}
	if hasFamilyToken {
		for _, token := range strictTokens {
			if _, isModelSpecific := modelSpecificTokens[token]; isModelSpecific {
				requiredAllTokens = appendUnique(requiredAllTokens, token)
			}
		}
	}
	anchorMinMatch := computeAnchorMinMatch(len(anchorTokens), anchorMatchRatio)

	return keywordPlan{
		StrictQueryText:    strings.Join(strictTokens, " "),
		RelaxedOrQueryText: strings.Join(relaxedTokens, " OR "),
		LikeTokens:         likeTokens,
		AnchorTokens:       anchorTokens,
		AnchorMinMatch:     anchorMinMatch,
		RequiredAllTokens:  requiredAllTokens,
		SpecificIntent:     specificIntent,
	}
}

func normalizeAnchorMatchRatio(ratio float64) float64 {
	if ratio <= 0 || ratio > 1 {
		return defaultSearchAnchorMatchRatio
	}
	return ratio
}

func computeAnchorMinMatch(anchorCount int, ratio float64) int {
	if anchorCount <= 0 {
		return 0
	}
	minMatch := int(math.Ceil(float64(anchorCount) * normalizeAnchorMatchRatio(ratio)))
	if minMatch < 1 {
		return 1
	}
	if minMatch > anchorCount {
		return anchorCount
	}
	return minMatch
}

func logKeywordPlan(path string, plan keywordPlan) {
	log.Printf(
		"[SEARCH][PLAN] path=%s strict=%q anchors=%v required_all=%v anchor_min_match=%d",
		path,
		plan.StrictQueryText,
		plan.AnchorTokens,
		plan.RequiredAllTokens,
		plan.AnchorMinMatch,
	)
}

func appendUnique(tokens []string, values ...string) []string {
	for _, value := range values {
		value = strings.TrimSpace(strings.ToLower(value))
		if value == "" {
			continue
		}
		if len(value) < 2 {
			continue
		}
		if slices.Contains(tokens, value) {
			continue
		}
		tokens = append(tokens, value)
	}
	return tokens
}

func singularVariants(token string) []string {
	var variants []string
	switch {
	case strings.HasSuffix(token, "ies") && len(token) > 4:
		variants = append(variants, strings.TrimSuffix(token, "ies")+"y")
	case (strings.HasSuffix(token, "ches") ||
		strings.HasSuffix(token, "shes") ||
		strings.HasSuffix(token, "xes") ||
		strings.HasSuffix(token, "zes") ||
		strings.HasSuffix(token, "ses")) && len(token) > 4:
		variants = append(variants, strings.TrimSuffix(token, "es"))
	case strings.HasSuffix(token, "s") && len(token) > 3:
		variants = append(variants, strings.TrimSuffix(token, "s"))
	}
	return variants
}

func isDigit(r rune) bool {
	return r >= '0' && r <= '9'
}

func buildListingFilterClauses(
	filters models.Filters,
	alias string,
	args []interface{},
	argIndex int,
) ([]string, []interface{}, int) {
	clauses := []string{fmt.Sprintf("%s.status = 'active'", alias)}

	if filters.Category != "" {
		clauses = append(clauses, fmt.Sprintf("%s.category = $%d", alias, argIndex))
		args = append(args, filters.Category)
		argIndex++
	}

	if filters.Make != "" {
		clauses = append(clauses, fmt.Sprintf("%s.category_fields->>'make' ILIKE $%d", alias, argIndex))
		args = append(args, "%"+filters.Make+"%")
		argIndex++
	}

	if filters.Model != "" {
		clauses = append(clauses, fmt.Sprintf("%s.category_fields->>'model' ILIKE $%d", alias, argIndex))
		args = append(args, "%"+filters.Model+"%")
		argIndex++
	}

	if filters.Subcategory != "" {
		clauses = append(clauses, fmt.Sprintf("%s.category_fields->>'subcategory' ILIKE $%d", alias, argIndex))
		args = append(args, filters.Subcategory)
		argIndex++
	}

	if filters.BodyStyle != "" {
		clauses = append(clauses, fmt.Sprintf(`
			LOWER(COALESCE(
				NULLIF(%s.category_fields->>'body_style', ''),
				NULLIF(%s.category_fields->>'bodyStyle', ''),
				NULLIF(%s.category_fields->>'body_type', '')
			)) = LOWER($%d)
		`, alias, alias, alias, argIndex))
		args = append(args, filters.BodyStyle)
		argIndex++
	}

	if filters.Style != "" {
		clauses = append(clauses, fmt.Sprintf(`
			LOWER(COALESCE(
				NULLIF(%s.category_fields->>'style', ''),
				NULLIF(%s.category_fields->>'motorcycle_type', '')
			)) = LOWER($%d)
		`, alias, alias, argIndex))
		args = append(args, filters.Style)
		argIndex++
	}

	if filters.Layout != "" {
		clauses = append(clauses, fmt.Sprintf("LOWER(COALESCE(%s.category_fields->>'layout', '')) = LOWER($%d)", alias, argIndex))
		args = append(args, filters.Layout)
		argIndex++
	}

	if filters.HullType != "" {
		clauses = append(clauses, fmt.Sprintf(`
			LOWER(COALESCE(
				NULLIF(%s.category_fields->>'hull_type', ''),
				NULLIF(%s.category_fields->>'hullType', ''),
				NULLIF(%s.category_fields->>'hull_material', '')
			)) = LOWER($%d)
		`, alias, alias, alias, argIndex))
		args = append(args, filters.HullType)
		argIndex++
	}

	if filters.EngineType != "" {
		clauses = append(clauses, fmt.Sprintf(`
			LOWER(COALESCE(
				NULLIF(%s.category_fields->>'engine_type', ''),
				NULLIF(%s.category_fields->>'engineType', '')
			)) = LOWER($%d)
		`, alias, alias, argIndex))
		args = append(args, filters.EngineType)
		argIndex++
	}

	if filters.FuelType != "" {
		clauses = append(clauses, fmt.Sprintf(`
			LOWER(COALESCE(
				NULLIF(%s.category_fields->>'fuel_type', ''),
				NULLIF(%s.category_fields->>'fuelType', '')
			)) = LOWER($%d)
		`, alias, alias, argIndex))
		args = append(args, filters.FuelType)
		argIndex++
	}

	if filters.Transmission != "" {
		clauses = append(clauses, fmt.Sprintf("LOWER(COALESCE(%s.category_fields->>'transmission', '')) = LOWER($%d)", alias, argIndex))
		args = append(args, filters.Transmission)
		argIndex++
	}

	if filters.EngineSizeMin != nil {
		clauses = append(clauses, fmt.Sprintf(`
			COALESCE(NULLIF(regexp_replace(COALESCE(%s.category_fields->>'engine_size', ''), '[^0-9]', '', 'g'), ''), '0')::int >= $%d
		`, alias, argIndex))
		args = append(args, *filters.EngineSizeMin)
		argIndex++
	}

	if filters.EngineSizeMax != nil {
		clauses = append(clauses, fmt.Sprintf(`
			COALESCE(NULLIF(regexp_replace(COALESCE(%s.category_fields->>'engine_size', ''), '[^0-9]', '', 'g'), ''), '0')::int <= $%d
		`, alias, argIndex))
		args = append(args, *filters.EngineSizeMax)
		argIndex++
	}

	if filters.SelfContained != nil && *filters.SelfContained {
		clauses = append(clauses, fmt.Sprintf(`
			LOWER(COALESCE(
				NULLIF(%s.category_fields->>'self_contained', ''),
				NULLIF(%s.category_fields->>'selfContained', '')
			)) IN ('true', '1', 'yes')
		`, alias, alias))
	}

	if filters.YearMin != nil {
		clauses = append(clauses, fmt.Sprintf("(%s.category_fields->>'year')::int >= $%d", alias, argIndex))
		args = append(args, *filters.YearMin)
		argIndex++
	}

	if filters.YearMax != nil {
		clauses = append(clauses, fmt.Sprintf("(%s.category_fields->>'year')::int <= $%d", alias, argIndex))
		args = append(args, *filters.YearMax)
		argIndex++
	}

	if filters.PriceMin != nil {
		clauses = append(clauses, fmt.Sprintf("%s.price >= $%d", alias, argIndex))
		args = append(args, *filters.PriceMin)
		argIndex++
	}

	if filters.PriceMax != nil {
		clauses = append(clauses, fmt.Sprintf("%s.price <= $%d", alias, argIndex))
		args = append(args, *filters.PriceMax)
		argIndex++
	}

	if filters.OdometerMin != nil {
		clauses = append(clauses, fmt.Sprintf("(%s.category_fields->>'mileage')::int >= $%d", alias, argIndex))
		args = append(args, *filters.OdometerMin)
		argIndex++
	}

	if filters.OdometerMax != nil {
		clauses = append(clauses, fmt.Sprintf("(%s.category_fields->>'mileage')::int <= $%d", alias, argIndex))
		args = append(args, *filters.OdometerMax)
		argIndex++
	}

	if filters.Location != "" {
		clauses = append(clauses, fmt.Sprintf("%s.location ILIKE $%d", alias, argIndex))
		args = append(args, "%"+filters.Location+"%")
		argIndex++
	}

	if filters.Condition != "" {
		clauses = append(clauses, fmt.Sprintf(`
			LOWER(COALESCE(
				NULLIF(TRIM(%s.category_fields->>'condition'), ''),
				NULLIF(TRIM(%s.condition), '')
			)) = LOWER($%d)
		`, alias, alias, argIndex))
		args = append(args, filters.Condition)
		argIndex++
	}

	if filters.Color != "" {
		clauses = append(clauses, fmt.Sprintf("LOWER(COALESCE(%s.category_fields->>'color', '')) = LOWER($%d)", alias, argIndex))
		args = append(args, filters.Color)
		argIndex++
	}

	return clauses, args, argIndex
}

// UpdateEmbedding updates the embedding for a listing
func (r *VectorRepository) UpdateEmbedding(ctx context.Context, listingID int, embedding []float32, embeddingModel string) error {
	query := `UPDATE listings SET embedding = $1, embedding_model = $2 WHERE id = $3`
	vec := pgvector.NewVector(embedding)
	embeddingModel = strings.TrimSpace(embeddingModel)

	_, err := r.db.Exec(ctx, query, vec, embeddingModel, listingID)
	if err != nil {
		return fmt.Errorf("failed to update embedding: %w", err)
	}

	return nil
}

// ClearEmbedding removes stale embedding data for a listing so the next refresh writes a clean vector/model pair.
func (r *VectorRepository) ClearEmbedding(ctx context.Context, listingID int) error {
	query := `UPDATE listings SET embedding = NULL, embedding_model = NULL WHERE id = $1`
	_, err := r.db.Exec(ctx, query, listingID)
	if err != nil {
		return fmt.Errorf("failed to clear embedding: %w", err)
	}

	return nil
}

// GetSimilarListingsContext returns comparison stats and top 3 similar listings for AI context
// This is optimized for minimal token usage (~140 tokens) while providing rich comparison data
func (r *VectorRepository) GetSimilarListingsContext(ctx context.Context, listingID int) (*ListingComparisonContext, error) {
	query := `
		WITH current_listing AS (
			SELECT id, embedding, embedding_model, price, category
			FROM listings 
			WHERE id = $1
		),
		similar_listings AS (
			SELECT 
				l.id,
				l.title,
				l.price,
				l.condition,
				COALESCE((l.category_fields->>'mileage')::int, 0) AS mileage,
				COALESCE((l.category_fields->>'year')::int, 0) AS year,
				1 - (l.embedding <=> cl.embedding) AS similarity
			FROM listings l
			CROSS JOIN current_listing cl
			WHERE l.id != cl.id
			  AND l.status = 'active'
			  AND l.category = cl.category
			  AND l.embedding IS NOT NULL
			  AND l.embedding_model = cl.embedding_model
			  AND 1 - (l.embedding <=> cl.embedding) > 0.60
			ORDER BY l.embedding <=> cl.embedding
			LIMIT 50
		),
		stats AS (
			SELECT 
				COUNT(*) AS total_count,
				COALESCE(AVG(price)::int, 0) AS avg_price,
				COALESCE((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price))::int, 0) AS median_price,
				COALESCE(MIN(price), 0) AS min_price,
				COALESCE(MAX(price), 0) AS max_price
			FROM similar_listings
		),
		percentile_rank AS (
			SELECT 
				CASE 
					WHEN (SELECT COUNT(*) FROM similar_listings) = 0 THEN 50
					ELSE (COUNT(*) FILTER (WHERE sl.price > cl.price) * 100.0 / (SELECT COUNT(*) FROM similar_listings))::int
				END AS percentile
			FROM similar_listings sl
			CROSS JOIN current_listing cl
			GROUP BY cl.price
		)
		SELECT 
			stats.total_count,
			stats.avg_price,
			stats.median_price,
			stats.min_price,
			stats.max_price,
			COALESCE(percentile_rank.percentile, 50) as percentile,
			CASE 
				WHEN COALESCE(percentile_rank.percentile, 50) >= 80 THEN 'great_deal'
				WHEN COALESCE(percentile_rank.percentile, 50) >= 60 THEN 'below_average'
				WHEN COALESCE(percentile_rank.percentile, 50) >= 40 THEN 'average'
				WHEN COALESCE(percentile_rank.percentile, 50) >= 20 THEN 'above_average'
				ELSE 'overpriced'
			END AS price_position,
			(
				SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
				FROM (
					SELECT title, price, condition, mileage, year
					FROM similar_listings
					ORDER BY similarity DESC
					LIMIT 3
				) t
			) AS comparables
		FROM stats
		LEFT JOIN percentile_rank ON true
	`

	var stats SimilarListingsStats
	var comparablesJSON []byte

	err := r.db.QueryRow(ctx, query, listingID).Scan(
		&stats.TotalCount,
		&stats.AvgPrice,
		&stats.MedianPrice,
		&stats.MinPrice,
		&stats.MaxPrice,
		&stats.Percentile,
		&stats.PricePosition,
		&comparablesJSON,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			// Return empty context if listing not found
			return &ListingComparisonContext{
				Stats:       SimilarListingsStats{PricePosition: "unknown"},
				Comparables: []CompactSimilarListing{},
			}, nil
		}
		return nil, fmt.Errorf("failed to get similar listings context: %w", err)
	}

	// Parse comparables JSON
	var comparables []CompactSimilarListing
	if err := json.Unmarshal(comparablesJSON, &comparables); err != nil {
		comparables = []CompactSimilarListing{}
	}

	return &ListingComparisonContext{
		Stats:       stats,
		Comparables: comparables,
	}, nil
}

// SimilarListingResult contains a listing with its similarity scores
type SimilarListingResult struct {
	Listing       models.Listing `json:"listing"`
	SemanticScore float64        `json:"semanticScore"`
	LocationScore float64        `json:"locationScore"`
	CombinedScore float64        `json:"combinedScore"`
	LocationMatch string         `json:"locationMatch"` // "same_location", "same_city", "different"
}

// GetSimilarListingsWithLocation finds similar listings considering both
// semantic similarity and location proximity
func (r *VectorRepository) GetSimilarListingsWithLocation(
	ctx context.Context,
	listingID int,
	nearbyLocations []string,
	limit int,
) ([]SimilarListingResult, error) {
	// Configuration
	const (
		semanticWeight        = 0.6  // Weight for semantic similarity
		locationWeight        = 0.4  // Weight for location proximity
		minSemanticSimilarity = 0.50 // Minimum semantic similarity threshold
		sameCityScore         = 0.8  // Score for being in the same city
		maxCandidates         = 50   // Max candidates to consider
	)

	// Build the nearby locations array for PostgreSQL
	// We'll use it to check if a listing's location matches any nearby location
	query := `
		WITH current_listing AS (
			SELECT id, embedding, embedding_model, category, location
			FROM listings
			WHERE id = $1
		),
		similar_listings AS (
			SELECT
				l.id,
				l.public_id,
				l.title,
				l.description,
				l.price,
				l.category,
				l.location,
				l.condition,
				l.created_at,
				l.updated_at,
				1 - (l.embedding <=> cl.embedding) AS semantic_score,
				CASE
					WHEN LOWER(l.location) = LOWER(cl.location) THEN 1.0
					WHEN LOWER(l.location) = ANY($2::text[]) THEN $3::float
					ELSE 0.0
				END AS location_score,
				CASE
					WHEN LOWER(l.location) = LOWER(cl.location) THEN 'same_location'
					WHEN LOWER(l.location) = ANY($2::text[]) THEN 'same_city'
					ELSE 'different'
				END AS location_match
			FROM listings l
			CROSS JOIN current_listing cl
			WHERE l.id != cl.id
			  AND l.status = 'active'
			  AND l.category = cl.category
			  AND l.embedding IS NOT NULL
			  AND l.embedding_model = cl.embedding_model
			  AND 1 - (l.embedding <=> cl.embedding) > $4
			ORDER BY (
				$5::float * (1 - (l.embedding <=> cl.embedding)) +
				$6::float * CASE
					WHEN LOWER(l.location) = LOWER(cl.location) THEN 1.0
					WHEN LOWER(l.location) = ANY($2::text[]) THEN $3::float
					ELSE 0.0
				END
			) DESC
			LIMIT $7
		)
		SELECT
			id, public_id, title, description, price, category, location, condition, created_at, updated_at,
			semantic_score, location_score,
			($5::float * semantic_score + $6::float * location_score) AS combined_score,
			location_match
		FROM similar_listings
	`

	// Convert nearby locations to lowercase for case-insensitive matching
	nearbyLower := make([]string, len(nearbyLocations))
	for i, loc := range nearbyLocations {
		nearbyLower[i] = strings.ToLower(loc)
	}

	rows, err := r.db.Query(ctx, query,
		listingID,             // $1
		nearbyLower,           // $2 - nearby locations array
		sameCityScore,         // $3 - score for same city
		minSemanticSimilarity, // $4 - minimum semantic threshold
		semanticWeight,        // $5 - semantic weight
		locationWeight,        // $6 - location weight
		maxCandidates,         // $7 - limit
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get similar listings with location: %w", err)
	}
	defer rows.Close()

	var results []SimilarListingResult
	for rows.Next() {
		var r SimilarListingResult
		var condition sql.NullString
		err := rows.Scan(
			&r.Listing.ID,
			&r.Listing.PublicID,
			&r.Listing.Title,
			&r.Listing.Description,
			&r.Listing.Price,
			&r.Listing.Category,
			&r.Listing.Location,
			&condition,
			&r.Listing.CreatedAt,
			&r.Listing.UpdatedAt,
			&r.SemanticScore,
			&r.LocationScore,
			&r.CombinedScore,
			&r.LocationMatch,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan similar listing: %w", err)
		}
		if condition.Valid {
			r.Listing.Condition = condition.String
		}
		results = append(results, r)
	}

	// Apply the requested limit
	if len(results) > limit {
		results = results[:limit]
	}

	return results, nil
}
