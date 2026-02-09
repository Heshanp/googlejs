package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
)

const (
	defaultModerationModel                = "gemini-2.5-flash"
	defaultImageFetchConcurrency          = 3
	defaultImageFetchTimeout              = 5 * time.Second
	moderationImageFetchAttemptCount      = 2
	insufficientImageCoverageReviewReason = "We couldn't analyze enough listing images automatically. Listing sent for manual review."
)

// ModerationService handles AI listing moderation.
type ModerationService struct {
	apiKey                string
	model                 string
	modelURL              string
	httpClient            *http.Client
	maxImages             int
	maxImageMB            int
	imageFetchConcurrency int
	imageFetchTimeout     time.Duration
}

// ModerationInput is the payload sent for listing moderation.
type ModerationInput struct {
	Title       string
	Description string
	ImageURLs   []string
}

// NewModerationService creates a listing moderation service.
func NewModerationService(apiKey, model string) *ModerationService {
	if strings.TrimSpace(model) == "" {
		model = defaultModerationModel
	}

	svc := &ModerationService{
		apiKey:     apiKey,
		model:      model,
		modelURL:   fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", model),
		httpClient: &http.Client{Timeout: 20 * time.Second},
		maxImages:  5,
		maxImageMB: 8,
	}
	svc.ConfigureImageFetch(defaultImageFetchConcurrency, defaultImageFetchTimeout)
	return svc
}

// ConfigureImageFetch updates moderation image fetch settings.
func (s *ModerationService) ConfigureImageFetch(concurrency int, timeout time.Duration) {
	if s == nil {
		return
	}
	if concurrency <= 0 {
		concurrency = defaultImageFetchConcurrency
	}
	if timeout <= 0 {
		timeout = defaultImageFetchTimeout
	}

	s.imageFetchConcurrency = concurrency
	s.imageFetchTimeout = timeout
}

// BuildContentFingerprint creates a deterministic fingerprint from publish content.
func BuildContentFingerprint(title, description string, imageRefs []string) string {
	normalizedTitle := normalizeForFingerprint(title)
	normalizedDesc := normalizeForFingerprint(description)

	hashes := make([]string, 0, len(imageRefs))
	for _, ref := range imageRefs {
		clean := strings.TrimSpace(ref)
		if clean == "" {
			continue
		}
		h := sha256.Sum256([]byte(strings.ToLower(clean)))
		hashes = append(hashes, hex.EncodeToString(h[:]))
	}
	sort.Strings(hashes)

	base := normalizedTitle + "\n" + normalizedDesc + "\n" + strings.Join(hashes, "\n")
	sum := sha256.Sum256([]byte(base))
	return hex.EncodeToString(sum[:])
}

func normalizeForFingerprint(value string) string {
	value = strings.ToLower(value)
	value = strings.TrimSpace(value)
	// Collapse whitespace so small formatting changes do not bypass idempotency/cache.
	parts := strings.Fields(value)
	return strings.Join(parts, " ")
}

// ModerateListing runs AI moderation and returns a normalized moderation result.
func (s *ModerationService) ModerateListing(ctx context.Context, input ModerationInput) (models.ModerationResult, error) {
	if strings.TrimSpace(s.apiKey) == "" {
		return fallbackModerationResult("Moderation service is unavailable. Listing sent for manual review."), nil
	}

	reqBody, fetchStats, err := s.buildGeminiRequest(ctx, input)
	if err != nil {
		return fallbackModerationResult("Moderation request could not be prepared. Listing sent for manual review."), err
	}
	if fetchStats.Considered > 0 {
		log.Printf("[MODERATION] image coverage %d/%d", fetchStats.Successful, fetchStats.Considered)
		if !fetchStats.HasMajority() {
			log.Printf("[MODERATION] forcing manual review due to insufficient image coverage (%d/%d)", fetchStats.Successful, fetchStats.Considered)
			result := fallbackModerationResult(insufficientImageCoverageReviewReason)
			result.Source = "image_coverage_gate"
			return result, nil
		}
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return fallbackModerationResult("Moderation request failed. Listing sent for manual review."), err
	}

	url := fmt.Sprintf("%s?key=%s", s.modelURL, s.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return fallbackModerationResult("Moderation request failed. Listing sent for manual review."), err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fallbackModerationResult("Publishing is taking longer than usual. Listing sent for manual review."), err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fallbackModerationResult("Publishing is taking longer than usual. Listing sent for manual review."), err
	}

	if resp.StatusCode != http.StatusOK {
		return fallbackModerationResult("Publishing is taking longer than usual. Listing sent for manual review."),
			fmt.Errorf("moderation API error: %s", strings.TrimSpace(string(body)))
	}

	var parsed moderationGeminiResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return fallbackModerationResult("Publishing is taking longer than usual. Listing sent for manual review."), err
	}

	text := extractGeminiText(parsed)
	if strings.TrimSpace(text) == "" {
		return fallbackModerationResult("Publishing is taking longer than usual. Listing sent for manual review."),
			fmt.Errorf("empty moderation response")
	}

	result, err := parseModerationResponse(text)
	if err != nil {
		fallback := fallbackModerationResult("Publishing is taking longer than usual. Listing sent for manual review.")
		fallback.RawResponse = text
		fallback.Model = s.model
		return fallback, err
	}

	result.Source = "ai"
	result.Model = s.model
	result.RawResponse = text
	return result, nil
}

func fallbackModerationResult(summary string) models.ModerationResult {
	return models.ModerationResult{
		Decision:    models.ModerationDecisionReviewNeeded,
		Severity:    models.ModerationSeverityHigh,
		FlagProfile: false,
		Violations:  []models.ModerationViolation{},
		Summary:     summary,
		Source:      "fallback_error",
	}
}

type moderationGeminiPart struct {
	Text       string                  `json:"text,omitempty"`
	InlineData *moderationGeminiInline `json:"inline_data,omitempty"`
}

type moderationGeminiInline struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"`
}

type moderationGeminiContent struct {
	Parts []moderationGeminiPart `json:"parts"`
}

type moderationGeminiGenerationConfig struct {
	ResponseMimeType string `json:"responseMimeType,omitempty"`
}

type moderationGeminiRequest struct {
	Contents         []moderationGeminiContent         `json:"contents"`
	GenerationConfig *moderationGeminiGenerationConfig `json:"generationConfig,omitempty"`
}

type moderationGeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

type imageFetchStats struct {
	Considered int
	Successful int
}

func (s imageFetchStats) HasMajority() bool {
	if s.Considered == 0 {
		return true
	}
	return s.Successful*2 > s.Considered
}

type imageDownloadStatusError struct {
	StatusCode int
	Status     string
}

func (e *imageDownloadStatusError) Error() string {
	return fmt.Sprintf("image download failed: %s", e.Status)
}

func (s *ModerationService) buildGeminiRequest(ctx context.Context, input ModerationInput) (*moderationGeminiRequest, imageFetchStats, error) {
	parts := []moderationGeminiPart{
		{Text: buildModerationPrompt(input.Title, input.Description)},
	}

	imageURLs := normalizeModerationImageURLs(input.ImageURLs, s.maxImages)
	stats := imageFetchStats{Considered: len(imageURLs)}
	if len(imageURLs) > 0 {
		concurrency := s.imageFetchConcurrency
		if concurrency <= 0 {
			concurrency = defaultImageFetchConcurrency
		}
		if concurrency > len(imageURLs) {
			concurrency = len(imageURLs)
		}

		results := make([]*moderationGeminiInline, len(imageURLs))
		sem := make(chan struct{}, concurrency)
		var wg sync.WaitGroup

		for i, imageURL := range imageURLs {
			i := i
			imageURL := imageURL
			wg.Add(1)
			go func() {
				defer wg.Done()

				select {
				case sem <- struct{}{}:
				case <-ctx.Done():
					return
				}
				defer func() { <-sem }()

				inline, err := s.downloadImageInlineDataWithRetry(ctx, imageURL)
				if err != nil {
					// Skip unreadable image instead of failing the full moderation request.
					return
				}
				results[i] = inline
			}()
		}
		wg.Wait()

		for _, inline := range results {
			if inline == nil {
				continue
			}
			stats.Successful++
			parts = append(parts, moderationGeminiPart{InlineData: inline})
		}
	}

	return &moderationGeminiRequest{
		Contents: []moderationGeminiContent{{Parts: parts}},
		GenerationConfig: &moderationGeminiGenerationConfig{
			ResponseMimeType: "application/json",
		},
	}, stats, nil
}

func normalizeModerationImageURLs(imageURLs []string, maxImages int) []string {
	if maxImages <= 0 || len(imageURLs) == 0 {
		return nil
	}

	normalized := make([]string, 0, len(imageURLs))
	for _, imageURL := range imageURLs {
		trimmed := strings.TrimSpace(imageURL)
		if trimmed == "" {
			continue
		}
		normalized = append(normalized, trimmed)
		if len(normalized) >= maxImages {
			break
		}
	}
	return normalized
}

func (s *ModerationService) downloadImageInlineDataWithRetry(ctx context.Context, imageURL string) (*moderationGeminiInline, error) {
	var lastErr error
	for attempt := 0; attempt < moderationImageFetchAttemptCount; attempt++ {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}

		attemptCtx := ctx
		cancel := func() {}
		if s.imageFetchTimeout > 0 {
			attemptCtx, cancel = context.WithTimeout(ctx, s.imageFetchTimeout)
		}
		inline, err := s.downloadImageInlineData(attemptCtx, imageURL)
		cancel()
		if err == nil {
			return inline, nil
		}

		lastErr = err
		if !isTransientImageDownloadError(err) || attempt == moderationImageFetchAttemptCount-1 {
			return nil, err
		}
	}
	return nil, lastErr
}

func isTransientImageDownloadError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}

	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}

	var statusErr *imageDownloadStatusError
	if errors.As(err, &statusErr) {
		if statusErr.StatusCode == http.StatusTooManyRequests {
			return true
		}
		return statusErr.StatusCode >= http.StatusInternalServerError
	}

	return false
}

func (s *ModerationService) downloadImageInlineData(ctx context.Context, imageURL string) (*moderationGeminiInline, error) {
	url := strings.TrimSpace(imageURL)
	if url == "" {
		return nil, fmt.Errorf("empty image url")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, &imageDownloadStatusError{
			StatusCode: resp.StatusCode,
			Status:     resp.Status,
		}
	}

	contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
	if !strings.HasPrefix(contentType, "image/") {
		return nil, fmt.Errorf("unsupported content type: %s", contentType)
	}

	maxBytes := s.maxImageMB * 1024 * 1024
	body, err := io.ReadAll(io.LimitReader(resp.Body, int64(maxBytes)+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxBytes {
		return nil, fmt.Errorf("image exceeds max size")
	}

	return &moderationGeminiInline{
		MimeType: contentType,
		Data:     ReadImageAsBase64(body),
	}, nil
}

func buildModerationPrompt(title, description string) string {
	return fmt.Sprintf(`You are a strict trust-and-safety moderator for a marketplace listing.
Analyze this listing using both text and attached images.

Listing title: %q
Listing description: %q

Policy severity levels:
- critical: illegal items/services, sexual explicit content, child exploitation, weapons intended for harm, hard drugs, terror content
- high: regulated goods requiring compliance (alcohol, tobacco, medicine), scams/fraud, hate speech, impersonation
- medium: privacy leaks (personal data), misleading claims, counterfeit suspicion, unsafe transactions

Output ONLY valid JSON with this exact schema:
{
  "decision": "clean" | "flagged",
  "severity": "clean" | "medium" | "high" | "critical",
  "flag_profile": true | false,
  "violations": [
    {
      "code": "short_machine_code",
      "category": "policy_category",
      "severity": "medium" | "high" | "critical",
      "reason": "brief reason"
    }
  ],
  "summary": "short reviewer summary"
}

Rules:
1) If uncertain, choose "flagged" and explain.
2) If decision is "clean", severity must be "clean", violations must be [].
3) Set flag_profile=true only for repeated-risk or severe abuse profile risk (typically critical).
4) Do not output markdown, prose, or extra keys.
`, strings.TrimSpace(title), strings.TrimSpace(description))
}

func extractGeminiText(resp moderationGeminiResponse) string {
	if len(resp.Candidates) == 0 {
		return ""
	}
	parts := resp.Candidates[0].Content.Parts
	if len(parts) == 0 {
		return ""
	}
	var texts []string
	for _, p := range parts {
		if strings.TrimSpace(p.Text) != "" {
			texts = append(texts, p.Text)
		}
	}
	return strings.TrimSpace(strings.Join(texts, "\n"))
}

type moderationResponseJSON struct {
	Decision    string `json:"decision"`
	Severity    string `json:"severity"`
	FlagProfile bool   `json:"flag_profile"`
	Violations  []struct {
		Code     string `json:"code"`
		Category string `json:"category"`
		Severity string `json:"severity"`
		Reason   string `json:"reason"`
	} `json:"violations"`
	Summary string `json:"summary"`
}

func parseModerationResponse(raw string) (models.ModerationResult, error) {
	text := strings.TrimSpace(raw)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var decoded moderationResponseJSON
	if err := json.Unmarshal([]byte(text), &decoded); err != nil {
		return models.ModerationResult{}, fmt.Errorf("invalid moderation JSON: %w", err)
	}

	decision := normalizeDecision(decoded.Decision)
	severity := normalizeSeverity(decoded.Severity)

	if decision == models.ModerationDecisionClean {
		severity = models.ModerationSeverityClean
	}
	if decision == models.ModerationDecisionFlagged && severity == models.ModerationSeverityClean {
		severity = models.ModerationSeverityMedium
	}

	violations := make([]models.ModerationViolation, 0, len(decoded.Violations))
	for _, v := range decoded.Violations {
		itemSeverity := normalizeSeverity(v.Severity)
		if itemSeverity == models.ModerationSeverityClean {
			itemSeverity = severity
		}
		violations = append(violations, models.ModerationViolation{
			Code:     strings.TrimSpace(v.Code),
			Category: strings.TrimSpace(v.Category),
			Severity: itemSeverity,
			Reason:   strings.TrimSpace(v.Reason),
		})
	}

	summary := strings.TrimSpace(decoded.Summary)
	if summary == "" {
		if decision == models.ModerationDecisionClean {
			summary = "No policy violations detected."
		} else {
			summary = "Potential policy violations detected."
		}
	}

	flagProfile := decoded.FlagProfile
	if severity == models.ModerationSeverityCritical {
		flagProfile = true
	}

	if decision == models.ModerationDecisionClean {
		violations = []models.ModerationViolation{}
		flagProfile = false
	}

	return models.ModerationResult{
		Decision:    decision,
		Severity:    severity,
		FlagProfile: flagProfile,
		Violations:  violations,
		Summary:     summary,
	}, nil
}

func normalizeDecision(value string) models.ModerationDecision {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "clean", "allow", "approved":
		return models.ModerationDecisionClean
	case "flagged", "block", "blocked", "reject", "rejected":
		return models.ModerationDecisionFlagged
	default:
		return models.ModerationDecisionFlagged
	}
}

func normalizeSeverity(value string) models.ModerationSeverity {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "clean", "none", "low":
		return models.ModerationSeverityClean
	case "critical", "severe":
		return models.ModerationSeverityCritical
	case "high":
		return models.ModerationSeverityHigh
	case "medium", "med":
		return models.ModerationSeverityMedium
	default:
		return models.ModerationSeverityMedium
	}
}
