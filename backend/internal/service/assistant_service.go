package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

// AssistantService handles AI shopping assistant interactions via Gemini with Google Search Grounding
type AssistantService struct {
	apiKey           string
	modelURL         string
	supportsThinking bool
	httpClient       *http.Client
}

// NewAssistantService creates a new assistant service
func NewAssistantService(apiKey, model string) *AssistantService {
	return &AssistantService{
		apiKey:           apiKey,
		modelURL:         fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", model),
		supportsThinking: strings.Contains(model, "gemini-3"),
		httpClient:       &http.Client{},
	}
}

// ListingContext provides listing data for the assistant to reason about
type ListingContext struct {
	Title          string                 `json:"title"`
	Description    string                 `json:"description"`
	Price          int                    `json:"price"`
	Condition      string                 `json:"condition"`
	Category       string                 `json:"category"`
	Location       string                 `json:"location"`
	CategoryFields map[string]interface{} `json:"categoryFields,omitempty"`
}

// CompactComparable contains minimal fields for a comparable listing
type CompactComparable struct {
	Title     string `json:"title"`
	Price     int    `json:"price"`
	Condition string `json:"condition"`
	Year      int    `json:"year,omitempty"`
	Mileage   int    `json:"mileage,omitempty"`
}

// ComparisonContext provides market data for price analysis
type ComparisonContext struct {
	TotalCount    int                 `json:"totalCount"`
	AvgPrice      int                 `json:"avgPrice"`
	MedianPrice   int                 `json:"medianPrice"`
	MinPrice      int                 `json:"minPrice"`
	MaxPrice      int                 `json:"maxPrice"`
	Percentile    int                 `json:"percentile"`    // Current listing is cheaper than X% of similar items
	PricePosition string              `json:"pricePosition"` // "great_deal", "below_average", "average", "above_average", "overpriced"
	Comparables   []CompactComparable `json:"comparables"`
}

// ConversationMessage represents a single message in the conversation history
type ConversationMessage struct {
	Role             string `json:"role"` // "user" or "model"
	Text             string `json:"text"`
	ThoughtSignature string `json:"thoughtSignature,omitempty"`
}

// AssistantChatInput holds the input for a chat turn
type AssistantChatInput struct {
	ListingContext    *ListingContext       `json:"listingContext"`
	ComparisonContext *ComparisonContext    `json:"comparisonContext,omitempty"`
	History           []ConversationMessage `json:"history"`
	Query             string                `json:"query"`
}

// GroundingSource represents a source from Google Search grounding
type GroundingSource struct {
	Title string `json:"title"`
	URL   string `json:"url"`
}

// AssistantChatResult contains the assistant's response
type AssistantChatResult struct {
	Response         string            `json:"response"`
	Sources          []GroundingSource `json:"sources,omitempty"`
	ThoughtSignature string            `json:"thoughtSignature,omitempty"`
	ThinkingSummary  string            `json:"thinkingSummary,omitempty"`
}

// Gemini request structures for the assistant (extends the base structures with tools + grounding)
type assistantGeminiRequest struct {
	Contents          []assistantContent      `json:"contents"`
	Tools             []assistantTool         `json:"tools,omitempty"`
	GenerationConfig  *geminiGenerationConfig `json:"generationConfig,omitempty"`
	SystemInstruction *assistantContent       `json:"systemInstruction,omitempty"`
}

type assistantContent struct {
	Role  string                `json:"role,omitempty"`
	Parts []assistantGeminiPart `json:"parts"`
}

type assistantGeminiPart struct {
	Text             string `json:"text,omitempty"`
	Thought          bool   `json:"thought,omitempty"`
	ThoughtSignature string `json:"thoughtSignature,omitempty"`
}

type assistantTool struct {
	GoogleSearch *struct{} `json:"googleSearch,omitempty"`
}

// Gemini response structures for grounding
type assistantGeminiResponse struct {
	Candidates []struct {
		Content struct {
			Role  string `json:"role"`
			Parts []struct {
				Text             string `json:"text"`
				Thought          bool   `json:"thought,omitempty"`
				ThoughtSignature string `json:"thoughtSignature,omitempty"`
			} `json:"parts"`
		} `json:"content"`
		GroundingMetadata *groundingMetadata `json:"groundingMetadata,omitempty"`
	} `json:"candidates"`
}

type groundingMetadata struct {
	SearchEntryPoint *struct {
		RenderedContent string `json:"renderedContent,omitempty"`
	} `json:"searchEntryPoint,omitempty"`
	GroundingChunks   []groundingChunk `json:"groundingChunks,omitempty"`
	GroundingSupports []struct {
		Segment struct {
			StartIndex int    `json:"startIndex"`
			EndIndex   int    `json:"endIndex"`
			Text       string `json:"text"`
		} `json:"segment"`
		GroundingChunkIndices []int     `json:"groundingChunkIndices"`
		ConfidenceScores      []float64 `json:"confidenceScores"`
	} `json:"groundingSupports,omitempty"`
	WebSearchQueries []string `json:"webSearchQueries,omitempty"`
}

type groundingChunk struct {
	Web *groundingWeb `json:"web,omitempty"`
}

type groundingWeb struct {
	URI   string `json:"uri"`
	Title string `json:"title"`
}

var nzTokenPattern = regexp.MustCompile(`(?i)\b(new[\s_-]*zealand|aotearoa|nz)\b`)

// Chat handles a single conversation turn with the AI shopping assistant
func (s *AssistantService) Chat(ctx context.Context, input AssistantChatInput) (*AssistantChatResult, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("Gemini API key not configured")
	}

	if input.Query == "" {
		return nil, fmt.Errorf("query is required")
	}

	// Build system instruction with listing context and market comparison data
	systemPrompt := buildAssistantSystemPrompt(input.ListingContext, input.ComparisonContext)

	// Build conversation contents
	contents := []assistantContent{}

	// Add conversation history
	for _, msg := range input.History {
		parts := []assistantGeminiPart{{Text: msg.Text}}
		// Preserve thought signatures for multi-turn context
		if msg.ThoughtSignature != "" && msg.Role == "model" {
			parts[0].ThoughtSignature = msg.ThoughtSignature
		}
		contents = append(contents, assistantContent{
			Role:  msg.Role,
			Parts: parts,
		})
	}

	// Add the current user query
	contents = append(contents, assistantContent{
		Role:  "user",
		Parts: []assistantGeminiPart{{Text: input.Query}},
	})

	// Build request with Google Search grounding (thinking config only for Gemini 3+)
	var genConfig *geminiGenerationConfig
	if s.supportsThinking {
		genConfig = &geminiGenerationConfig{
			ThinkingConfig: &geminiThinkingConfig{
				ThinkingLevel:   "high",
				IncludeThoughts: true,
			},
		}
	}
	reqBody := assistantGeminiRequest{
		SystemInstruction: &assistantContent{
			Parts: []assistantGeminiPart{{Text: systemPrompt}},
		},
		Contents: contents,
		Tools: []assistantTool{
			{GoogleSearch: &struct{}{}},
		},
		GenerationConfig: genConfig,
	}

	geminiResp, err := s.executeAssistantRequest(ctx, reqBody)
	if err != nil {
		return nil, err
	}
	if len(geminiResp.Candidates) == 0 {
		return nil, fmt.Errorf("no response from Gemini")
	}

	candidate := geminiResp.Candidates[0]

	// Extract response text, thinking summary, and thought signature
	var responseText string
	var thinkingSummary string
	var thoughtSignature string

	for _, part := range candidate.Content.Parts {
		if part.Thought {
			thinkingSummary = part.Text
		} else if part.Text != "" {
			responseText = part.Text
		}
		if part.ThoughtSignature != "" {
			thoughtSignature = part.ThoughtSignature
		}
	}

	if responseText == "" {
		return nil, fmt.Errorf("no text response from Gemini")
	}

	// Enforce NZ-only grounded web data.
	sources, foundNonNZSources := filterNZGroundingSources(candidate.GroundingMetadata)
	if foundNonNZSources {
		nzFallbackPrompt := systemPrompt + `

STRICT NZ ENFORCEMENT (MANDATORY):
- Some grounded web sources were rejected because they were not NZ-specific.
- Do NOT use any non-NZ market data, prices, regulations, or retailers.
- Answer using only listing details and Justsell marketplace data already provided.
- If NZ-specific external evidence is unavailable, say that clearly.`

		fallbackResp, fallbackErr := s.executeAssistantRequest(ctx, assistantGeminiRequest{
			SystemInstruction: &assistantContent{
				Parts: []assistantGeminiPart{{Text: nzFallbackPrompt}},
			},
			Contents:         contents,
			GenerationConfig: genConfig,
		})
		if fallbackErr == nil && len(fallbackResp.Candidates) > 0 {
			fallbackCandidate := fallbackResp.Candidates[0]
			responseText = ""
			thinkingSummary = ""
			thoughtSignature = ""

			for _, part := range fallbackCandidate.Content.Parts {
				if part.Thought {
					thinkingSummary = part.Text
				} else if part.Text != "" {
					responseText = part.Text
				}
				if part.ThoughtSignature != "" {
					thoughtSignature = part.ThoughtSignature
				}
			}
		}

		if responseText == "" {
			responseText = "I can only use New Zealand market data. I could not verify NZ-specific web sources for that request, so I can only rely on this listing and Justsell marketplace context."
		}
		sources = nil
	}

	return &AssistantChatResult{
		Response:         responseText,
		Sources:          sources,
		ThoughtSignature: thoughtSignature,
		ThinkingSummary:  thinkingSummary,
	}, nil
}

// buildAssistantSystemPrompt creates the system prompt with listing and market comparison context
func buildAssistantSystemPrompt(listing *ListingContext, comparison *ComparisonContext) string {
	var sb strings.Builder

	sb.WriteString(`You are an AI shopping assistant on Justsell, a modern marketplace. You help buyers make informed purchasing decisions about the specific listing they are viewing.

STRICT SCOPE — YOU MUST FOLLOW THESE RULES:
- You ONLY answer questions related to:
  1. The current listing being viewed (price, condition, specs, value, comparisons)
  2. The product category or type (e.g., if it's a car, you can discuss cars in general)
  3. Purchasing decisions (is this a good deal, what to look for, negotiation tips)
  4. JustSell platform features (how to buy, how messaging works, payment, shipping)
- You MUST politely decline ANY off-topic questions that are unrelated to shopping or the listing.
- If someone asks about general knowledge, trivia, politics, celebrities, or anything unrelated to the listing or shopping, respond with: "I'm here to help you with this listing and your shopping decisions on JustSell. Is there anything about this [PRODUCT] I can help you with?"

GUIDELINES:
- Be concise and helpful. Keep answers focused and practical.
- When asked about pricing or value, USE THE MARKET DATA PROVIDED BELOW FIRST before searching. Our data is from real listings on JustSell.
- When asked about product quality or known issues, search for reviews and common problems.
- Always cite your sources when using information from Google Search.
- Google Search data MUST be New Zealand specific only.
- Never use or cite non-NZ market data (US, AU, UK, etc.).
- Prefer NZ sources (.nz domains) or pages explicitly about New Zealand.
- If NZ web sources are unavailable, say that clearly and rely on listing + Justsell marketplace data.
- Treat all prices as NZD unless the user explicitly asks for currency conversion.
- If you don't know something, say so rather than guessing.
- Be honest about both pros and cons to build trust.
- Never make up prices or statistics — always ground them in real data when possible.
`)

	if listing != nil {
		sb.WriteString("\nCURRENT LISTING CONTEXT:\n")
		sb.WriteString(fmt.Sprintf("Title: %s\n", listing.Title))
		sb.WriteString(fmt.Sprintf("Price: $%d\n", listing.Price))
		sb.WriteString(fmt.Sprintf("Condition: %s\n", listing.Condition))
		sb.WriteString(fmt.Sprintf("Category: %s\n", listing.Category))
		sb.WriteString(fmt.Sprintf("Location: %s\n", listing.Location))

		if listing.Description != "" {
			sb.WriteString(fmt.Sprintf("Description: %s\n", listing.Description))
		}

		if len(listing.CategoryFields) > 0 {
			sb.WriteString("Specifications:\n")
			for key, val := range listing.CategoryFields {
				sb.WriteString(fmt.Sprintf("  %s: %v\n", key, val))
			}
		}
	}

	// Add market comparison data if available
	if comparison != nil && comparison.TotalCount > 0 {
		sb.WriteString("\nMARKET COMPARISON DATA (from similar Justsell listings):\n")
		sb.WriteString(fmt.Sprintf("Similar Listings Found: %d\n", comparison.TotalCount))
		sb.WriteString(fmt.Sprintf("Price Range: $%d - $%d\n", comparison.MinPrice, comparison.MaxPrice))
		sb.WriteString(fmt.Sprintf("Average Price: $%d\n", comparison.AvgPrice))
		sb.WriteString(fmt.Sprintf("Median Price: $%d\n", comparison.MedianPrice))
		sb.WriteString(fmt.Sprintf("This listing's price is cheaper than %d%% of similar items\n", comparison.Percentile))
		sb.WriteString(fmt.Sprintf("Price Assessment: %s\n", formatPricePosition(comparison.PricePosition)))

		if len(comparison.Comparables) > 0 {
			sb.WriteString("Top Comparable Listings:\n")
			for i, comp := range comparison.Comparables {
				sb.WriteString(fmt.Sprintf("  %d. %s - $%d (%s)", i+1, comp.Title, comp.Price, comp.Condition))
				if comp.Year > 0 {
					sb.WriteString(fmt.Sprintf(", %d", comp.Year))
				}
				if comp.Mileage > 0 {
					sb.WriteString(fmt.Sprintf(", %dk mi", comp.Mileage/1000))
				}
				sb.WriteString("\n")
			}
		}

		sb.WriteString("\nIMPORTANT INSTRUCTIONS FOR PRICE QUESTIONS:\n")
		sb.WriteString("- When users ask about price, value, or whether this is a good deal, USE THIS MARKETPLACE DATA FIRST.\n")
		sb.WriteString("- You MUST explicitly say 'Based on Justsell marketplace data' and include the EXACT statistics above (avg price, percentile, etc.).\n")
		sb.WriteString("- Example: 'Based on Justsell marketplace data from X similar listings, this is priced at $Y which is cheaper than Z% of comparable items.'\n")
		sb.WriteString("- Only use Google Search if you need additional context beyond what our marketplace data provides.\n")
	}

	if listing != nil {
		sb.WriteString("\nUse the listing details above to provide context-aware answers. When the user asks about this item, reference specific details from the listing.\n")
	}

	return sb.String()
}

// formatPricePosition converts the price position code to a human-readable string
func formatPricePosition(position string) string {
	switch position {
	case "great_deal":
		return "Great Deal - significantly below market"
	case "below_average":
		return "Good Price - below average"
	case "average":
		return "Fair Price - around market average"
	case "above_average":
		return "Above Average - slightly higher than typical"
	case "overpriced":
		return "Overpriced - significantly above market"
	default:
		return "Unknown"
	}
}

func (s *AssistantService) executeAssistantRequest(ctx context.Context, reqBody assistantGeminiRequest) (*assistantGeminiResponse, error) {
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s?key=%s", s.modelURL, s.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
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

	var geminiResp assistantGeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return &geminiResp, nil
}

func filterNZGroundingSources(metadata *groundingMetadata) ([]GroundingSource, bool) {
	if metadata == nil {
		return nil, false
	}

	sources := make([]GroundingSource, 0, len(metadata.GroundingChunks))
	seen := make(map[string]struct{}, len(metadata.GroundingChunks))
	foundNonNZSource := false

	for _, chunk := range metadata.GroundingChunks {
		if chunk.Web == nil {
			continue
		}

		source := GroundingSource{
			Title: strings.TrimSpace(chunk.Web.Title),
			URL:   strings.TrimSpace(chunk.Web.URI),
		}
		if source.Title == "" && source.URL == "" {
			continue
		}

		if !isNZGroundingSource(source) {
			foundNonNZSource = true
			continue
		}

		dedupeKey := strings.ToLower(source.Title + "|" + source.URL)
		if _, exists := seen[dedupeKey]; exists {
			continue
		}
		seen[dedupeKey] = struct{}{}
		sources = append(sources, source)
	}

	return sources, foundNonNZSource
}

func isNZGroundingSource(source GroundingSource) bool {
	if containsNZToken(source.Title) {
		return true
	}
	if source.URL == "" {
		return false
	}

	parsedURL, err := url.Parse(source.URL)
	if err != nil {
		return containsNZToken(source.URL)
	}

	host := strings.ToLower(parsedURL.Hostname())
	host = strings.TrimPrefix(host, "www.")
	if strings.HasSuffix(host, ".nz") {
		return true
	}

	joinedURLParts := strings.Join([]string{
		parsedURL.Path,
		parsedURL.RawQuery,
		parsedURL.Fragment,
	}, " ")
	return containsNZToken(joinedURLParts)
}

func containsNZToken(value string) bool {
	return nzTokenPattern.MatchString(strings.ToLower(value))
}
