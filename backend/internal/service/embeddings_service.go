package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

const (
	GeminiEmbeddingsAPIBaseURL = "https://generativelanguage.googleapis.com/v1beta"
	DefaultEmbeddingModel      = "models/gemini-embedding-001"
	EmbeddingDimension         = 768

	embeddingTaskRetrievalQuery    = "RETRIEVAL_QUERY"
	embeddingTaskRetrievalDocument = "RETRIEVAL_DOCUMENT"
)

// EmbeddingsService handles generating embeddings via Google Gemini
type EmbeddingsService struct {
	apiKey             string
	httpClient         *http.Client
	model              string
	modelConfigRaw     string
	modelConfigInvalid bool
}

// NewEmbeddingsService creates a new embeddings service
func NewEmbeddingsService(apiKey, preferredModel string) *EmbeddingsService {
	model, modelConfigInvalid := normalizeEmbeddingModel(preferredModel)

	return &EmbeddingsService{
		apiKey:             apiKey,
		httpClient:         &http.Client{},
		model:              model,
		modelConfigRaw:     strings.TrimSpace(preferredModel),
		modelConfigInvalid: modelConfigInvalid,
	}
}

// GeminiPart represents a part of the content in Gemini API request
type GeminiPart struct {
	Text string `json:"text"`
}

// GeminiContent represents content in Gemini API request
type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

// EmbeddingRequest is the request body for Gemini embeddings API
type EmbeddingRequest struct {
	Model                string        `json:"model,omitempty"`
	Content              GeminiContent `json:"content"`
	TaskType             string        `json:"taskType,omitempty"`
	Title                string        `json:"title,omitempty"`
	OutputDimensionality int           `json:"outputDimensionality,omitempty"`
}

// EmbeddingResponse is the response from Gemini embeddings API
type EmbeddingResponse struct {
	Embedding struct {
		Values []float32 `json:"values"`
	} `json:"embedding"`
}

// GenerateEmbedding generates an embedding for the given text
func (s *EmbeddingsService) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	embedding, _, err := s.generateEmbedding(ctx, text, embeddingTaskRetrievalQuery, "")
	return embedding, err
}

// GenerateEmbeddingWithModel returns both the embedding and the model used.
func (s *EmbeddingsService) GenerateEmbeddingWithModel(ctx context.Context, text string) ([]float32, string, error) {
	return s.generateEmbedding(ctx, text, embeddingTaskRetrievalQuery, "")
}

// StartupHealthCheck verifies embeddings are correctly configured by making
// a tiny probe request against the configured embedding model.
func (s *EmbeddingsService) StartupHealthCheck(ctx context.Context) error {
	if s.modelConfigInvalid {
		return fmt.Errorf(
			"invalid GEMINI_EMBEDDING_MODEL=%q (fallback model would be %q)",
			s.modelConfigRaw,
			DefaultEmbeddingModel,
		)
	}

	_, _, err := s.generateEmbedding(ctx, "health check", embeddingTaskRetrievalQuery, "")
	if err != nil {
		return fmt.Errorf("embeddings startup health check failed: %w", err)
	}
	return nil
}

func (s *EmbeddingsService) generateEmbedding(ctx context.Context, text, taskType, title string) ([]float32, string, error) {
	if s.apiKey == "" {
		return nil, "", fmt.Errorf("Gemini API key not configured")
	}

	text = strings.TrimSpace(text)
	if text == "" {
		return nil, "", fmt.Errorf("empty text cannot be embedded")
	}

	// Keep payload bounded to avoid oversized requests.
	if len(text) > 9000 {
		text = text[:9000]
	}

	embedding, err := s.generateEmbeddingWithModel(ctx, s.model, text, taskType, title)
	if err != nil {
		return nil, "", err
	}
	return embedding, s.model, nil
}

func (s *EmbeddingsService) generateEmbeddingWithModel(ctx context.Context, model, text, taskType, title string) ([]float32, error) {
	// Create request body
	reqBody := EmbeddingRequest{
		Model: model,
		Content: GeminiContent{
			Parts: []GeminiPart{
				{Text: text},
			},
		},
		TaskType:             taskType,
		OutputDimensionality: EmbeddingDimension,
	}
	if title != "" && taskType == embeddingTaskRetrievalDocument {
		reqBody.Title = title
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/%s:embedContent?key=%s", GeminiEmbeddingsAPIBaseURL, model, s.apiKey)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Execute request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %s", redactAPIKey(err.Error(), s.apiKey))
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Gemini API error: %s - %s", resp.Status, string(body))
	}

	var embResp EmbeddingResponse
	if err := json.Unmarshal(body, &embResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(embResp.Embedding.Values) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}
	if len(embResp.Embedding.Values) != EmbeddingDimension {
		return nil, fmt.Errorf(
			"unexpected embedding dimension %d for model %q (expected %d)",
			len(embResp.Embedding.Values),
			model,
			EmbeddingDimension,
		)
	}

	return embResp.Embedding.Values, nil
}

// GenerateListingEmbedding creates an embedding for a listing based on its text content
func (s *EmbeddingsService) GenerateListingEmbedding(ctx context.Context, title, description, make, model string) ([]float32, error) {
	embedding, _, err := s.GenerateListingEmbeddingWithModel(ctx, title, description, make, model)
	return embedding, err
}

// GenerateListingEmbeddingWithModel returns the listing embedding and the model used.
func (s *EmbeddingsService) GenerateListingEmbeddingWithModel(ctx context.Context, title, description, make, model string) ([]float32, string, error) {
	categoryFields := map[string]interface{}{}
	if make != "" {
		categoryFields["make"] = make
	}
	if model != "" {
		categoryFields["model"] = model
	}
	return s.GenerateListingEmbeddingFromFieldsWithModel(ctx, title, description, "", categoryFields)
}

// GenerateListingEmbeddingFromFieldsWithModel builds an embedding payload from
// the listing's full category metadata and returns the embedding with model.
func (s *EmbeddingsService) GenerateListingEmbeddingFromFieldsWithModel(
	ctx context.Context,
	title, description, category string,
	categoryFields map[string]interface{},
) ([]float32, string, error) {
	parts := []string{}
	if title != "" {
		parts = append(parts, "Title: "+title)
	}
	if description != "" {
		parts = append(parts, "Description: "+description)
	}

	categoryLabel := normalizedCategoryLabel(category)
	if categoryLabel != "" {
		parts = append(parts, "Category: "+categoryLabel)
	}

	makeStr := categoryFieldString(categoryFields, "make")
	modelStr := categoryFieldString(categoryFields, "model")
	storageStr := categoryFieldString(categoryFields, "storage")
	colorStr := categoryFieldString(categoryFields, "color")
	conditionStr := categoryFieldString(categoryFields, "condition")

	if makeStr != "" {
		parts = append(parts, "Make: "+makeStr)
	}
	if modelStr != "" {
		parts = append(parts, "Model: "+modelStr)
	}
	if storageStr != "" {
		parts = append(parts, "Storage: "+storageStr)
	}
	if colorStr != "" {
		parts = append(parts, "Color: "+colorStr)
	}
	if conditionStr != "" {
		parts = append(parts, "Condition: "+conditionStr)
	}

	if category == "cat_phones" {
		parts = append(parts, "Aliases: phone smartphone mobile cell device")
	}

	makeLower := strings.ToLower(makeStr)
	modelLower := strings.ToLower(modelStr)
	titleLower := strings.ToLower(title)
	if strings.Contains(makeLower, "apple") || strings.Contains(modelLower, "iphone") || strings.Contains(titleLower, "iphone") {
		parts = append(parts, "Ecosystem: Apple iPhone iOS")
	}

	text := strings.Join(parts, ". ")
	return s.generateEmbedding(ctx, text, embeddingTaskRetrievalDocument, title)
}

func categoryFieldString(categoryFields map[string]interface{}, key string) string {
	if categoryFields == nil {
		return ""
	}
	raw, ok := categoryFields[key]
	if !ok || raw == nil {
		return ""
	}
	value, ok := raw.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
}

func normalizedCategoryLabel(category string) string {
	category = strings.TrimSpace(strings.ToLower(category))
	if category == "" {
		return ""
	}
	category = strings.TrimPrefix(category, "cat_")
	category = strings.ReplaceAll(category, "_", " ")
	return category
}

// PreferredModel returns the configured primary model for embeddings.
func (s *EmbeddingsService) PreferredModel() string {
	if strings.TrimSpace(s.model) == "" {
		return DefaultEmbeddingModel
	}
	return s.model
}

func normalizeEmbeddingModel(raw string) (string, bool) {
	model := strings.TrimSpace(strings.ToLower(raw))
	if model == "" {
		return DefaultEmbeddingModel, false
	}
	if !strings.HasPrefix(model, "models/") {
		model = "models/" + model
	}
	if !isSupportedEmbeddingModel(model) {
		log.Printf("[EMBEDDINGS] Unsupported GEMINI_EMBEDDING_MODEL=%q. Falling back to %q.", raw, DefaultEmbeddingModel)
		return DefaultEmbeddingModel, true
	}
	return model, false
}

func isSupportedEmbeddingModel(model string) bool {
	if model == DefaultEmbeddingModel {
		return true
	}
	// Allow future Gemini embedding models while rejecting retired / wrong-family names.
	return strings.HasPrefix(model, "models/gemini-embedding-")
}

func redactAPIKey(value, apiKey string) string {
	if apiKey == "" {
		return value
	}
	return strings.ReplaceAll(value, apiKey, "[REDACTED]")
}
