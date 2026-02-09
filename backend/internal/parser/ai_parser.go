package parser

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/yourusername/justsell/backend/internal/models"
)

// AIParser uses Gemini Flash to parse natural language queries into structured filters
type AIParser struct {
	apiKey           string
	modelURL         string
	supportsThinking bool
	httpClient       *http.Client
}

// AIParseResult contains the parsed filters plus a human-readable interpretation
type AIParseResult struct {
	Filters        models.Filters `json:"filters"`
	Interpretation string         `json:"interpretation"`
}

// NewAIParser creates a new AI parser
func NewAIParser(apiKey, model string) *AIParser {
	return &AIParser{
		apiKey:           apiKey,
		modelURL:         fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", model),
		supportsThinking: strings.Contains(model, "gemini-3"),
		httpClient:       &http.Client{},
	}
}

// geminiParserRequest/response structures (minimal for fast parsing)
type parserGeminiRequest struct {
	Contents         []parserContent         `json:"contents"`
	GenerationConfig *parserGenerationConfig `json:"generationConfig,omitempty"`
}

type parserContent struct {
	Parts []parserPart `json:"parts"`
}

type parserPart struct {
	Text string `json:"text"`
}

type parserGenerationConfig struct {
	ResponseMimeType string               `json:"responseMimeType,omitempty"`
	ThinkingConfig   *parserThinkingConfig `json:"thinkingConfig,omitempty"`
}

type parserThinkingConfig struct {
	ThinkingLevel string `json:"thinkingLevel,omitempty"`
}

type parserGeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text    string `json:"text"`
				Thought bool   `json:"thought,omitempty"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// aiFilterResponse is the JSON structure Gemini returns
type aiFilterResponse struct {
	Query          string  `json:"query"`
	Category       string  `json:"category,omitempty"`
	Make           string  `json:"make,omitempty"`
	Model          string  `json:"model,omitempty"`
	YearMin        *int    `json:"yearMin,omitempty"`
	YearMax        *int    `json:"yearMax,omitempty"`
	PriceMin       *int    `json:"priceMin,omitempty"`
	PriceMax       *int    `json:"priceMax,omitempty"`
	OdometerMin    *int    `json:"odometerMin,omitempty"`
	OdometerMax    *int    `json:"odometerMax,omitempty"`
	Location       string  `json:"location,omitempty"`
	Color          string  `json:"color,omitempty"`
	Condition      string  `json:"condition,omitempty"`
	Interpretation string  `json:"interpretation"`
}

// ParseQuery parses a natural language query using Gemini 3 Flash
func (p *AIParser) ParseQuery(ctx context.Context, query string) (*AIParseResult, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("Gemini API key not configured")
	}

	prompt := buildParserPrompt(query)

	genConfig := &parserGenerationConfig{
		ResponseMimeType: "application/json",
	}
	if p.supportsThinking {
		genConfig.ThinkingConfig = &parserThinkingConfig{
			ThinkingLevel: "low",
		}
	}
	reqBody := parserGeminiRequest{
		Contents: []parserContent{
			{Parts: []parserPart{{Text: prompt}}},
		},
		GenerationConfig: genConfig,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s?key=%s", p.modelURL, p.apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Gemini API error: %s - %s", resp.Status, string(body))
	}

	// Parse Gemini response
	var geminiResp parserGeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response: %w", err)
	}

	// Extract text (skip thought parts)
	var responseText string
	if len(geminiResp.Candidates) > 0 {
		for _, part := range geminiResp.Candidates[0].Content.Parts {
			if !part.Thought && part.Text != "" {
				responseText = part.Text
			}
		}
	}

	if responseText == "" {
		return nil, fmt.Errorf("no text response from Gemini")
	}

	// Parse the structured JSON response
	var parsed aiFilterResponse
	if err := json.Unmarshal([]byte(responseText), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse filter JSON: %w", err)
	}

	// Normalize category to match database format (e.g., "furniture" -> "cat_furniture")
	category := parsed.Category
	if category != "" && !strings.HasPrefix(category, "cat_") {
		category = "cat_" + category
	}

	// Convert to models.Filters
	filters := models.Filters{
		Query:       parsed.Query,
		Category:    category,
		Make:        parsed.Make,
		Model:       parsed.Model,
		YearMin:     parsed.YearMin,
		YearMax:     parsed.YearMax,
		PriceMin:    parsed.PriceMin,
		PriceMax:    parsed.PriceMax,
		OdometerMin: parsed.OdometerMin,
		OdometerMax: parsed.OdometerMax,
		Location:    parsed.Location,
		Color:       parsed.Color,
		Condition:   parsed.Condition,
	}

	return &AIParseResult{
		Filters:        filters,
		Interpretation: parsed.Interpretation,
	}, nil
}

func buildParserPrompt(query string) string {
	return fmt.Sprintf(`You are a search query parser for a New Zealand marketplace called JustSell. Parse the user's natural language query into structured search filters.

USER QUERY: "%s"

Return a JSON object with these fields (only include fields that are explicitly or implicitly mentioned):

{
  "query": "cleaned search terms (remove filter-like phrases, keep item description)",
  "category": "vehicles | phones | computers | gaming | fashion | furniture | jewelry | baby | sports | hobbies | pets | property | jobs | services | free | general",
  "make": "vehicle/device manufacturer (Toyota, Samsung, Apple, etc.)",
  "model": "specific model name",
  "yearMin": 2015,
  "yearMax": 2020,
  "priceMin": 5000,
  "priceMax": 50000,
  "odometerMin": 0,
  "odometerMax": 100000,
  "location": "city or region in New Zealand (Auckland, Wellington, Canterbury, etc.)",
  "color": "color if mentioned",
  "condition": "New | Like New | Good | Fair",
  "interpretation": "Human-readable summary of what was understood, e.g. 'Toyota Corolla, 2015-2020, under $50k, in Auckland'"
}

CATEGORY GUIDELINES:
- vehicles = cars, motorcycles, boats, caravans, car parts
- phones = smartphones, tablets, mobile devices
- computers = laptops, desktops, cameras, audio equipment, tech accessories
- gaming = consoles, video games, controllers, gaming accessories
- fashion = clothing, shoes, bags, accessories
- furniture = home furniture, garden/outdoor furniture, appliances, home decor, kitchen items, patio umbrellas
- jewelry = watches, rings, necklaces, luxury accessories
- baby = baby gear, kids clothing, toys for children
- sports = bicycles, fitness equipment, camping gear, sports equipment
- hobbies = musical instruments, collectibles, art, books, toys for adults, board games
- pets = pet supplies, animals for rehoming
- property = rentals, flatmates wanted, parking spaces
- jobs = job listings, employment
- services = trades, tutoring, cleaning services
- free = free items, giveaways
- general = anything that doesn't fit above categories

RULES:
1. "query" should contain the core search terms with filter phrases removed
2. NZ price context: prices are in NZD. "cheap" = under $500, "affordable" = under $5000, "under 50k" = priceMax: 50000
3. NZ location context: recognize NZ cities/regions (Auckland, Wellington, Christchurch, Hamilton, Tauranga, Dunedin, Queenstown, Canterbury, Waikato, Bay of Plenty, etc.)
4. "low kms" or "low mileage" = odometerMax: 100000
5. Year ranges: "2015-2020" = yearMin:2015, yearMax:2020. "newer than 2018" = yearMin:2018
6. Only include fields you can confidently extract. Leave others out entirely.
7. The "interpretation" must be a concise, readable summary like a search engine would show
8. Return ONLY valid JSON`, query)
}
