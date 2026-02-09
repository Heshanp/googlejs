package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
)

const (
	geminiBaseURL = "https://generativelanguage.googleapis.com/v1beta/models"
)

// VisionService handles image analysis via Google Gemini multimodal API
type VisionService struct {
	apiKey           string
	modelURL         string
	supportsThinking bool
	httpClient       *http.Client
}

// NewVisionService creates a new vision service
func NewVisionService(apiKey, model string) *VisionService {
	return &VisionService{
		apiKey:           apiKey,
		modelURL:         fmt.Sprintf("%s/%s:generateContent", geminiBaseURL, model),
		supportsThinking: strings.Contains(model, "gemini-3"),
		httpClient:       &http.Client{},
	}
}

// ImageData represents base64-encoded image data with its MIME type
type ImageData struct {
	Data     string `json:"data"`     // base64-encoded image
	MimeType string `json:"mimeType"` // e.g., "image/jpeg", "image/png"
}

// AnalysisResult contains extracted listing fields from image analysis
// Two-tier approach: simple flow for general items, extended for special categories
type AnalysisResult struct {
	// Core fields (always present for all items)
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Condition   string  `json:"condition"`  // New, Like New, Good, Fair
	Confidence  float64 `json:"confidence"` // 0-1 overall confidence

	// Category slug for the listing (matches frontend categories)
	// Values: vehicles, phones, computers, gaming, fashion, furniture, jewelry, baby, sports, hobbies, pets, property, jobs, services, free, general
	Category string `json:"category"`

	// Item type classification - determines which form to show
	// Values: "vehicle", "phone", "computer", "general"
	ItemType string `json:"itemType"`

	// Structured fields - only populated for special categories (vehicle, phone, computer)
	// Contains pre-filled values like {"make": "Toyota", "model": "Corolla", "year": "2019"}
	StructuredFields map[string]interface{} `json:"structuredFields,omitempty"`

	// Per-field confidence scores (e.g., {"make": 0.95, "model": 0.88})
	FieldConfidence map[string]float64 `json:"fieldConfidence,omitempty"`

	// AI reasoning explanation for the analysis
	Reasoning string `json:"reasoning,omitempty"`

	// Suggestions (search keywords, related terms)
	Suggestions *AnalysisSuggestions `json:"suggestions,omitempty"`

	// Gemini 3 thinking summary (from model's internal reasoning)
	ThinkingSummary string `json:"thinkingSummary,omitempty"`
}

// CategoryDetection provides hierarchical category identification
type CategoryDetection struct {
	Primary     string   `json:"primary"`     // 'electronics', 'vehicles', etc
	Subcategory string   `json:"subcategory"` // 'phones', 'cars', etc
	Path        []string `json:"path"`        // ['Electronics', 'Phones & Accessories']
	Confidence  float64  `json:"confidence"`  // 0-1 category confidence
}

// AnalysisSuggestions contains optional suggestions for user review
type AnalysisSuggestions struct {
	PriceRange  *PriceRange `json:"priceRange,omitempty"`
	Keywords    []string    `json:"keywords,omitempty"`
	SearchTerms []string    `json:"searchTerms,omitempty"`
}

// PriceRange suggests min/max price based on detected item
type PriceRange struct {
	Min      int    `json:"min"`
	Max      int    `json:"max"`
	Currency string `json:"currency"` // 'NZD'
}

// AnalyzeImagesInput holds the input for AnalyzeImages
type AnalyzeImagesInput struct {
	Images []ImageData
}

// VisionSearchResult contains the normalized search query inferred from an image.
type VisionSearchResult struct {
	Query      string   `json:"query"`
	Confidence float64  `json:"confidence"`
	Keywords   []string `json:"keywords,omitempty"`
	Category   string   `json:"category,omitempty"`
}

// Gemini API request/response structures
type geminiPart struct {
	Text       string        `json:"text,omitempty"`
	InlineData *geminiInline `json:"inline_data,omitempty"`
}

type geminiInline struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiRequest struct {
	Contents         []geminiContent         `json:"contents"`
	GenerationConfig *geminiGenerationConfig `json:"generationConfig,omitempty"`
}

type geminiThinkingConfig struct {
	ThinkingLevel   string `json:"thinkingLevel,omitempty"`
	IncludeThoughts bool   `json:"includeThoughts,omitempty"`
}

type geminiGenerationConfig struct {
	ResponseMimeType string                `json:"responseMimeType,omitempty"`
	ThinkingConfig   *geminiThinkingConfig `json:"thinkingConfig,omitempty"`
	MaxOutputTokens  int                   `json:"maxOutputTokens,omitempty"`
	Temperature      float64               `json:"temperature,omitempty"`
}

type geminiResponsePart struct {
	Text             string `json:"text"`
	Thought          bool   `json:"thought,omitempty"`
	ThoughtSignature string `json:"thoughtSignature,omitempty"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []geminiResponsePart `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// AnalyzeImages analyzes uploaded images and extracts listing details
func (s *VisionService) AnalyzeImages(ctx context.Context, input AnalyzeImagesInput) (*AnalysisResult, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("Gemini API key not configured")
	}

	if len(input.Images) == 0 {
		return nil, fmt.Errorf("at least one image is required")
	}

	// Build parts array: prompt first, then images
	parts := []geminiPart{
		{Text: buildAnalysisPrompt()},
	}

	// Add each image as inline data
	for _, img := range input.Images {
		parts = append(parts, geminiPart{
			InlineData: &geminiInline{
				MimeType: img.MimeType,
				Data:     img.Data,
			},
		})
	}

	// Build request (thinking config only for Gemini 3+)
	genConfig := &geminiGenerationConfig{
		ResponseMimeType: "application/json",
	}
	if s.supportsThinking {
		genConfig.ThinkingConfig = &geminiThinkingConfig{
			ThinkingLevel:   "high",
			IncludeThoughts: true,
		}
	}
	responseText, thinkingSummary, err := s.generateContent(ctx, parts, genConfig)
	if responseText == "" {
		return nil, fmt.Errorf("no text response from Gemini")
	}

	// Parse JSON from response
	result, err := parseAnalysisResponse(responseText)
	if err != nil {
		return nil, fmt.Errorf("failed to parse analysis result: %w", err)
	}

	// Attach Gemini 3 thinking summary for reasoning transparency
	if thinkingSummary != "" {
		result.ThinkingSummary = thinkingSummary
	}

	return result, nil
}

// AnalyzeImageForSearch extracts a concise text query from a single image.
// It uses a low-token prompt and disables thinking to minimize token spend.
func (s *VisionService) AnalyzeImageForSearch(ctx context.Context, image ImageData) (*VisionSearchResult, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("Gemini API key not configured")
	}
	if strings.TrimSpace(image.Data) == "" {
		return nil, fmt.Errorf("image data is required")
	}

	parts := []geminiPart{
		{Text: buildVisionSearchPrompt()},
		{
			InlineData: &geminiInline{
				MimeType: image.MimeType,
				Data:     image.Data,
			},
		},
	}

	responseText, _, err := s.generateContent(ctx, parts, &geminiGenerationConfig{
		ResponseMimeType: "application/json",
		MaxOutputTokens:  96,
		Temperature:      0.1,
	})
	if err != nil {
		return nil, err
	}
	rawModelQuery := extractRawVisionModelQuery(responseText)

	result, err := parseVisionSearchResponse(responseText)
	if err == nil && isVisionQueryUsable(result.Query) {
		log.Printf(
			"[VISION][SEARCH] raw_model_query=%q normalized_query=%q fallback_used=%t",
			rawModelQuery,
			result.Query,
			false,
		)
		return result, nil
	}

	// Fallback to the proven listing-analysis prompt path when lightweight vision-query extraction fails.
	analysisResult, analysisErr := s.AnalyzeImages(ctx, AnalyzeImagesInput{
		Images: []ImageData{image},
	})
	if analysisErr != nil {
		if err != nil {
			return nil, fmt.Errorf("failed to parse vision search result: %w; fallback analysis failed: %v", err, analysisErr)
		}
		return nil, fmt.Errorf("vision search query unusable and fallback analysis failed: %w", analysisErr)
	}

	fallbackQuery := deriveVisionSearchQueryFromAnalysis(analysisResult)
	if !isVisionQueryUsable(fallbackQuery) {
		if err != nil {
			return nil, fmt.Errorf("failed to parse vision search result: %w; fallback analysis returned unusable query", err)
		}
		return nil, fmt.Errorf("fallback analysis returned unusable query")
	}

	confidence := clampUnitInterval(analysisResult.Confidence)
	if confidence == 0 {
		confidence = 0.55
	}

	finalResult := &VisionSearchResult{
		Query:      fallbackQuery,
		Confidence: confidence,
		Keywords:   nil,
		Category:   analysisResult.Category,
	}
	if analysisResult.Suggestions != nil {
		finalResult.Keywords = normalizeVisionSearchKeywords(analysisResult.Suggestions.Keywords)
	}
	log.Printf(
		"[VISION][SEARCH] raw_model_query=%q normalized_query=%q fallback_used=%t",
		rawModelQuery,
		finalResult.Query,
		true,
	)

	return finalResult, nil
}

func (s *VisionService) generateContent(
	ctx context.Context,
	parts []geminiPart,
	genConfig *geminiGenerationConfig,
) (responseText string, thinkingSummary string, err error) {
	reqBody := geminiRequest{
		Contents: []geminiContent{
			{Parts: parts},
		},
		GenerationConfig: genConfig,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s?key=%s", s.modelURL, s.apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to execute request: %s", sanitizeVisionError(err.Error(), s.apiKey))
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("failed to read response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("Gemini API error: %s - %s", resp.Status, sanitizeVisionError(string(body), s.apiKey))
	}

	var geminiResp geminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", "", fmt.Errorf("failed to parse response: %w", err)
	}
	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", "", fmt.Errorf("no response from Gemini")
	}

	for _, part := range geminiResp.Candidates[0].Content.Parts {
		if part.Thought {
			thinkingSummary = part.Text
			continue
		}
		if part.Text != "" {
			responseText = part.Text
		}
	}
	if responseText == "" {
		return "", "", fmt.Errorf("no text response from Gemini")
	}
	return responseText, thinkingSummary, nil
}

func buildVisionSearchPrompt() string {
	return `You are a marketplace visual search assistant.
Look at this single image and return one retrieval-friendly text search query for marketplace search.

Return ONLY valid JSON in this exact shape:
{
  "query": "short product query",
  "confidence": 0.0,
  "keywords": ["optional", "keywords"],
  "category": "optional category slug"
}

Rules:
1. query must be 3-6 tokens and under 60 characters.
2. include brand/model only if clearly visible.
3. avoid filler lead-ins and non-essential modifiers (for example: with, integrated, included, complete).
4. output only core searchable nouns/brand/model terms.
5. if uncertain, use a broad but useful product noun phrase.
6. keywords should be 0-5 short terms.
7. confidence must be between 0 and 1.
8. return JSON only, no markdown.`
}

// buildAnalysisPrompt creates the prompt for image analysis
// Two-tier approach: classify item type, then extract relevant fields
func buildAnalysisPrompt() string {
	return `You are an expert marketplace listing analyzer. Analyze the image(s) and extract information to auto-fill a listing form.

IMPORTANT: Return a JSON object with this EXACT structure:

{
  "title": "Compelling listing title (max 80 chars)",
  "description": "Detailed description of item condition and features (2-4 sentences)",
  "condition": "One of: New, Like New, Good, Fair",
  "confidence": 0.85,
  "category": "vehicles | phones | computers | gaming | fashion | furniture | jewelry | baby | sports | hobbies | pets | property | jobs | services | free | general",
  "itemType": "vehicle OR phone OR computer OR property OR job OR unsupported OR general",
  "structuredFields": {
    // ONLY for vehicle, phone, or computer - see fields below
    // Empty object {} for property, job, unsupported, and general
  },
  "fieldConfidence": {
    // Confidence score (0-1) for each field in structuredFields
    // e.g. {"make": 0.95, "model": 0.88, "year": 0.70}
  },
  "reasoning": "Brief explanation of how you identified the item and its key features from the image(s). Mention specific visual cues you used.",
  "suggestions": {
    "keywords": ["search", "keywords"],
    "searchTerms": ["related", "terms"]
  }
}

STEP 1: CLASSIFY THE CATEGORY
Choose the most appropriate category slug:
- "vehicles" = cars, motorcycles, trucks, boats, caravans, trailers, car parts
- "phones" = smartphones, tablets, mobile devices
- "computers" = laptops, desktops, monitors, cameras, audio equipment, tech accessories
- "gaming" = game consoles (PS5, Xbox, Switch), video games, controllers, gaming accessories
- "fashion" = clothing, shoes, bags, accessories, jewelry (non-luxury)
- "furniture" = home furniture, sofas, tables, garden/outdoor furniture, patio umbrellas, BBQs, appliances, home decor, kitchen items
- "jewelry" = luxury watches (Rolex, Omega), fine jewelry, rings, necklaces, luxury accessories
- "baby" = baby gear, strollers, car seats, kids clothing, toys for children
- "sports" = bicycles, fitness equipment, camping gear, golf clubs, sports equipment
- "hobbies" = musical instruments, collectibles, art, books, board games, toys for adults
- "pets" = pet supplies, animals for rehoming
- "property" = rental listings, flatmates wanted, parking spaces, real estate
- "jobs" = job listings, employment opportunities
- "services" = trades, tutoring, cleaning services
- "free" = free items, giveaways
- "general" = anything that doesn't fit above categories

STEP 2: CLASSIFY THE ITEM TYPE (for form field selection)
- "vehicle" = cars, motorcycles, trucks, boats, caravans, trailers
- "phone" = smartphones, tablets, mobile devices
- "computer" = laptops, desktops, monitors, gaming PCs, cameras
- "property" = houses, apartments, real estate listing photos
- "job" = screenshots of job postings, CVs
- "unsupported" = screenshots, memes, documents, people/selfies, landscapes (not items for sale)
- "general" = everything else that IS a physical item for sale

STEP 3: EXTRACT STRUCTURED FIELDS (only for special item types)

FOR itemType="vehicle", include these in structuredFields:
- make: "Toyota", "Honda", "Ford", "BMW", etc.
- model: "Corolla", "Civic", "F-150"
- year: "2020" (as string)
- body_type: "Sedan", "Hatchback", "SUV", "Wagon", "Ute", "Van", "Coupe"
- transmission: "Automatic", "Manual", "CVT"
- fuel_type: "Petrol", "Diesel", "Hybrid", "Electric"
- mileage: 85000 (number in km, only if visible)
- color: "Silver", "Black", "White", etc.

FOR itemType="phone", include these in structuredFields:
- brand: "Apple", "Samsung", "Google", "OnePlus"
- model: "iPhone 15 Pro", "Galaxy S24 Ultra"
- storage: "128GB", "256GB", "512GB"
- color: "Black", "Silver", etc.
- screen_condition: "Perfect", "Minor Scratches", "Cracked"
- battery_health: "90-100%", "80-89%", "70-79%", "Below 70%", "Unknown"

FOR itemType="computer", include these in structuredFields:
- brand: "Apple", "Dell", "HP", "Lenovo", "ASUS"
- model: "MacBook Pro 14", "XPS 15"
- type: "Laptop", "Desktop", "All-in-One"
- processor: "Intel i7-12700", "M3 Pro", "Ryzen 7"
- ram: "8GB", "16GB", "32GB"
- storage: "256GB", "512GB", "1TB"

FOR all other itemTypes, set structuredFields to empty object: {}

RULES:
1. ALWAYS set category to one of the 16 category slugs above
2. ALWAYS set itemType to one of: vehicle, phone, computer, property, job, unsupported, general
3. Only include structuredFields for vehicle, phone, or computer
4. Only include fields you can confidently determine from the image
5. Title should be compelling: "2019 Toyota Corolla GLX - Low KMs" or "Large Cantilever Patio Umbrella with LED Lights"
6. Description should highlight key visible features
7. Include fieldConfidence with a 0-1 score for each field in structuredFields
8. Include reasoning: explain what visual cues you used
9. Return ONLY valid JSON, no markdown or extra text`
}

// parseAnalysisResponse parses the JSON response from Gemini
func parseAnalysisResponse(responseText string) (*AnalysisResult, error) {
	text := cleanGeminiJSON(responseText)

	var result AnalysisResult
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return nil, fmt.Errorf("invalid JSON response: %w", err)
	}

	return &result, nil
}

func parseVisionSearchResponse(responseText string) (*VisionSearchResult, error) {
	text := cleanGeminiJSON(responseText)

	var result VisionSearchResult
	if err := unmarshalVisionSearchJSON(text, &result); err != nil {
		// Fallback for non-JSON model output: extract a concise query from plain text.
		plainQuery := normalizeVisionSearchQuery(extractVisionQueryFromText(text))
		if isVisionQueryUsable(plainQuery) {
			return &VisionSearchResult{
				Query:      plainQuery,
				Confidence: 0.35,
			}, nil
		}

		// Final fallback: derive useful search tokens from free-form model prose.
		derivedQuery := normalizeVisionSearchQuery(deriveVisionQueryFromLooseText(text))
		if !isVisionQueryUsable(derivedQuery) {
			return nil, fmt.Errorf("invalid JSON response: %w", err)
		}
		return &VisionSearchResult{
			Query:      derivedQuery,
			Confidence: 0.28,
		}, nil
	}

	result.Query = normalizeVisionSearchQuery(result.Query)
	result.Keywords = normalizeVisionSearchKeywords(result.Keywords)
	if !isVisionQueryUsable(result.Query) && len(result.Keywords) > 0 {
		keywordCount := len(result.Keywords)
		if keywordCount > 3 {
			keywordCount = 3
		}
		result.Query = strings.Join(result.Keywords[:keywordCount], " ")
	}
	if !isVisionQueryUsable(result.Query) {
		fallbackQuery := normalizeVisionSearchQuery(extractVisionQueryFromText(text))
		if isVisionQueryUsable(fallbackQuery) {
			result.Query = fallbackQuery
			if result.Confidence == 0 {
				result.Confidence = 0.35
			}
		}
	}
	if !isVisionQueryUsable(result.Query) {
		return nil, fmt.Errorf("missing usable query in response")
	}

	result.Confidence = clampUnitInterval(result.Confidence)
	return &result, nil
}

var visionQueryTextPattern = regexp.MustCompile(`(?i)(?:^|[\s,{])"?query"?\s*[:=-]\s*"?([^"\n,}]+)"?`)
var visionSearchQueryPattern = regexp.MustCompile(`(?i)(?:search\s*query|query)\s*(?:is|:|=|-)\s*["'\x60]?([^"\n\r.]+)`)
var nonAlphaNumericPattern = regexp.MustCompile(`[^a-z0-9]+`)

func extractVisionQueryFromText(text string) string {
	if text == "" {
		return ""
	}

	if matches := visionQueryTextPattern.FindStringSubmatch(text); len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	if matches := visionSearchQueryPattern.FindStringSubmatch(text); len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}

	lines := strings.Split(text, "\n")
	for _, line := range lines {
		candidate := strings.TrimSpace(line)
		candidate = strings.TrimPrefix(candidate, "-")
		candidate = strings.TrimPrefix(candidate, "*")
		candidate = strings.Trim(candidate, "\"'` ")
		candidate = stripVisionLeadIn(candidate)
		if candidate == "" {
			continue
		}
		if isVisionQueryUsable(candidate) {
			return candidate
		}
	}
	return ""
}

func cleanGeminiJSON(responseText string) string {
	text := strings.TrimSpace(responseText)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	return strings.TrimSpace(text)
}

var visionSearchTokenPattern = regexp.MustCompile(`[a-z0-9]+`)

var visionDropQueryTokens = map[string]struct{}{
	"a": {}, "an": {}, "and": {}, "for": {}, "in": {}, "of": {}, "on": {}, "the": {}, "to": {}, "with": {},
	"image": {}, "item": {}, "object": {}, "photo": {}, "picture": {}, "query": {}, "search": {},
	"integrated": {}, "builtin": {}, "built": {}, "included": {}, "complete": {}, "combo": {},
}

func normalizeVisionSearchQuery(raw string) string {
	normalized := strings.Join(strings.Fields(raw), " ")
	normalized = stripVisionLeadIn(normalized)
	normalized = strings.Trim(normalized, "\"'`.,:;!?()[]{} ")
	normalized = strings.TrimSpace(normalized)
	if normalized == "" {
		return ""
	}

	const maxQueryTokens = 6
	tokens := visionSearchTokenPattern.FindAllString(strings.ToLower(normalized), -1)
	if len(tokens) == 0 {
		return ""
	}

	seen := make(map[string]struct{}, len(tokens))
	filtered := make([]string, 0, maxQueryTokens)
	for _, token := range tokens {
		if len(token) < 2 {
			continue
		}
		if _, blocked := visionDropQueryTokens[token]; blocked {
			continue
		}
		if _, exists := seen[token]; exists {
			continue
		}
		seen[token] = struct{}{}
		filtered = append(filtered, token)
		if len(filtered) == maxQueryTokens {
			break
		}
	}

	return strings.Join(filtered, " ")
}

func stripVisionLeadIn(candidate string) string {
	trimmed := strings.TrimSpace(candidate)
	lower := strings.ToLower(trimmed)

	leadIns := []string{
		"here is the search query:",
		"here is a search query:",
		"here is the query:",
		"here's the search query:",
		"here's the query:",
		"search query:",
		"query:",
		"here is:",
		"here's:",
		"here is",
		"here's",
		"a good search query would be",
		"a suitable search query is",
		"you can search for",
		"try searching for",
		"you should search for",
		"this image shows",
		"the image shows",
		"it looks like",
		"it appears to be",
		"an image of",
		"a photo of",
	}

	for _, lead := range leadIns {
		if strings.HasPrefix(lower, lead) {
			trimmed = strings.TrimSpace(trimmed[len(lead):])
			trimmed = strings.TrimLeft(trimmed, "-: ")
			break
		}
	}
	return strings.TrimSpace(trimmed)
}

func isVisionQueryUsable(query string) bool {
	normalized := strings.ToLower(strings.TrimSpace(query))
	if normalized == "" {
		return false
	}
	if strings.Contains(normalized, "search query") {
		return false
	}
	if strings.Contains(normalized, "based on the image") {
		return false
	}
	if strings.HasPrefix(normalized, "here is") || strings.HasPrefix(normalized, "here's") {
		return false
	}

	generic := map[string]struct{}{
		"here":         {},
		"here is":      {},
		"here's":       {},
		"there":        {},
		"this":         {},
		"that":         {},
		"it":           {},
		"this is":      {},
		"query":        {},
		"search query": {},
		"item":         {},
		"product":      {},
		"object":       {},
		"image":        {},
		"photo":        {},
		"picture":      {},
	}
	if _, isGeneric := generic[normalized]; isGeneric {
		return false
	}

	words := strings.Fields(normalized)
	if len(words) == 1 {
		oneWordBlocked := map[string]struct{}{
			"here":    {},
			"there":   {},
			"this":    {},
			"that":    {},
			"it":      {},
			"item":    {},
			"product": {},
			"image":   {},
			"photo":   {},
			"picture": {},
			"query":   {},
			"search":  {},
		}
		if _, blocked := oneWordBlocked[words[0]]; blocked {
			return false
		}
	}

	return true
}

func deriveVisionSearchQueryFromAnalysis(analysis *AnalysisResult) string {
	if analysis == nil {
		return ""
	}

	if analysis.Suggestions != nil {
		keywords := normalizeVisionSearchKeywords(analysis.Suggestions.Keywords)
		if len(keywords) > 0 {
			candidate := compactVisionQuery(strings.Join(keywords, " "), 6)
			if isVisionQueryUsable(candidate) {
				return candidate
			}
		}

		for _, searchTerm := range analysis.Suggestions.SearchTerms {
			candidate := compactVisionQuery(searchTerm, 6)
			if isVisionQueryUsable(candidate) {
				return candidate
			}
		}
	}

	// Title remains the final fallback when suggestion tokens are weak or missing.
	title := compactVisionQuery(analysis.Title, 6)
	if isVisionQueryUsable(title) {
		return title
	}

	return ""
}

func compactVisionQuery(raw string, maxWords int) string {
	normalized := normalizeVisionSearchQuery(raw)
	if normalized == "" || maxWords <= 0 {
		return normalized
	}

	words := strings.Fields(normalized)
	if len(words) <= maxWords {
		return normalized
	}

	return strings.Join(words[:maxWords], " ")
}

func deriveVisionQueryFromLooseText(text string) string {
	if text == "" {
		return ""
	}

	lowered := strings.ToLower(text)
	normalized := nonAlphaNumericPattern.ReplaceAllString(lowered, " ")
	words := strings.Fields(normalized)
	if len(words) == 0 {
		return ""
	}

	stopwords := map[string]struct{}{
		"a": {}, "an": {}, "and": {}, "are": {}, "as": {}, "at": {}, "be": {}, "based": {}, "by": {}, "can": {},
		"for": {}, "from": {}, "good": {}, "here": {}, "i": {}, "image": {}, "in": {}, "is": {}, "it": {}, "its": {},
		"looks": {}, "like": {}, "of": {}, "on": {}, "or": {}, "photo": {}, "picture": {}, "query": {}, "search": {},
		"shows": {}, "showing": {}, "suitable": {}, "that": {}, "the": {}, "this": {}, "to": {}, "try": {}, "use": {},
		"with": {}, "would": {}, "you": {}, "your": {}, "item": {}, "product": {}, "object": {}, "appears": {}, "seems": {},
		"could": {}, "should": {}, "there": {}, "likely": {},
	}

	collected := make([]string, 0, 5)
	seen := make(map[string]struct{}, 8)
	for _, word := range words {
		if len(word) < 2 {
			continue
		}
		if _, blocked := stopwords[word]; blocked {
			continue
		}
		if _, exists := seen[word]; exists {
			continue
		}
		seen[word] = struct{}{}
		collected = append(collected, word)
		if len(collected) == 5 {
			break
		}
	}

	return strings.Join(collected, " ")
}

func extractRawVisionModelQuery(responseText string) string {
	text := cleanGeminiJSON(responseText)

	var payload struct {
		Query string `json:"query"`
	}
	if err := json.Unmarshal([]byte(text), &payload); err == nil {
		return strings.TrimSpace(payload.Query)
	}

	return strings.TrimSpace(extractVisionQueryFromText(text))
}

func unmarshalVisionSearchJSON(text string, out *VisionSearchResult) error {
	if err := json.Unmarshal([]byte(text), out); err == nil {
		return nil
	}

	jsonCandidate := extractFirstJSONObject(text)
	if jsonCandidate == "" {
		return fmt.Errorf("no JSON object found")
	}
	if err := json.Unmarshal([]byte(jsonCandidate), out); err != nil {
		return err
	}
	return nil
}

func extractFirstJSONObject(text string) string {
	start := strings.Index(text, "{")
	if start == -1 {
		return ""
	}

	inString := false
	escaped := false
	depth := 0

	for i := start; i < len(text); i++ {
		ch := text[i]
		if inString {
			if escaped {
				escaped = false
				continue
			}
			if ch == '\\' {
				escaped = true
				continue
			}
			if ch == '"' {
				inString = false
			}
			continue
		}

		switch ch {
		case '"':
			inString = true
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return text[start : i+1]
			}
		}
	}
	return ""
}

func normalizeVisionSearchKeywords(raw []string) []string {
	if len(raw) == 0 {
		return nil
	}

	const maxKeywords = 5
	seen := make(map[string]struct{}, len(raw))
	normalized := make([]string, 0, len(raw))
	for _, candidate := range raw {
		keyword := normalizeVisionSearchQuery(candidate)
		if keyword == "" {
			continue
		}
		key := strings.ToLower(keyword)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		normalized = append(normalized, keyword)
		if len(normalized) == maxKeywords {
			break
		}
	}
	if len(normalized) == 0 {
		return nil
	}
	return normalized
}

func clampUnitInterval(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > 1 {
		return 1
	}
	return value
}

func sanitizeVisionError(message, apiKey string) string {
	if apiKey == "" {
		return message
	}
	return strings.ReplaceAll(message, apiKey, "[REDACTED]")
}

// ReadImageAsBase64 reads an image file and returns base64-encoded data
func ReadImageAsBase64(data []byte) string {
	return base64.StdEncoding.EncodeToString(data)
}

// GetMimeType returns the MIME type based on image bytes (magic number detection)
func GetMimeType(data []byte) string {
	if len(data) < 4 {
		return "application/octet-stream"
	}

	// Check magic numbers
	switch {
	case data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF:
		return "image/jpeg"
	case data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47:
		return "image/png"
	case data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46:
		return "image/webp"
	case data[0] == 0x00 && data[1] == 0x00 && data[2] == 0x00:
		// Could be HEIC/HEIF
		if len(data) > 11 && string(data[4:12]) == "ftypheic" {
			return "image/heic"
		}
		return "image/heif"
	default:
		return "image/jpeg" // Default to JPEG
	}
}
