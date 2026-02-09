package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"time"
)

const (
	defaultImageTransformModel   = "gemini-2.5-flash-image"
	imageTransformBaseURL        = "https://generativelanguage.googleapis.com/v1beta/models"
	ProBackdropPromptVersion     = "pro_backdrop_v1"
	ProBackdropDefaultStyle      = "professional_studio_neutral"
	maxImageTransformInputBytes  = 8 * 1024 * 1024
	maxImageTransformOutputBytes = 8 * 1024 * 1024
	defaultImageTransformTimeout = 30 * time.Second
)

// ImageTransformInput describes one image transformation request.
type ImageTransformInput struct {
	ImageData []byte
	MimeType  string
	Style     string
}

// ImageTransformResult contains transformed image output.
type ImageTransformResult struct {
	ImageData     []byte
	MimeType      string
	Model         string
	PromptVersion string
}

// ImageTransformService handles listing image transformation via Gemini image generation.
type ImageTransformService struct {
	apiKey     string
	model      string
	modelURL   string
	httpClient *http.Client
}

// NewImageTransformService creates a new image transform service.
func NewImageTransformService(apiKey, model string) *ImageTransformService {
	trimmedModel := strings.TrimSpace(model)
	if trimmedModel == "" {
		trimmedModel = defaultImageTransformModel
	}

	return &ImageTransformService{
		apiKey:     strings.TrimSpace(apiKey),
		model:      trimmedModel,
		modelURL:   fmt.Sprintf("%s/%s:generateContent", imageTransformBaseURL, trimmedModel),
		httpClient: &http.Client{Timeout: defaultImageTransformTimeout},
	}
}

// Model returns the configured image model identifier.
func (s *ImageTransformService) Model() string {
	if s == nil {
		return ""
	}
	return s.model
}

// DownloadSourceImage downloads an image from an existing listing image URL with SSRF safeguards.
func (s *ImageTransformService) DownloadSourceImage(ctx context.Context, imageURL string) ([]byte, string, error) {
	parsed, err := url.Parse(strings.TrimSpace(imageURL))
	if err != nil {
		return nil, "", fmt.Errorf("invalid image URL: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, "", fmt.Errorf("unsupported image URL scheme")
	}
	if parsed.Hostname() == "" {
		return nil, "", fmt.Errorf("invalid image URL host")
	}

	if err := ensurePublicHost(ctx, parsed.Hostname()); err != nil {
		return nil, "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create source image request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download source image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("failed to download source image: %s", resp.Status)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxImageTransformInputBytes+1))
	if err != nil {
		return nil, "", fmt.Errorf("failed reading source image: %w", err)
	}
	if len(body) == 0 {
		return nil, "", fmt.Errorf("source image is empty")
	}
	if len(body) > maxImageTransformInputBytes {
		return nil, "", fmt.Errorf("source image exceeds max size")
	}

	mimeType := GetMimeType(body)
	if !strings.HasPrefix(mimeType, "image/") {
		return nil, "", fmt.Errorf("source image MIME type is not image")
	}

	return body, mimeType, nil
}

// GenerateProBackdrop transforms one image into a professional backdrop variant while preserving the subject.
func (s *ImageTransformService) GenerateProBackdrop(ctx context.Context, input ImageTransformInput) (*ImageTransformResult, error) {
	if s == nil {
		return nil, fmt.Errorf("image transform service not initialized")
	}
	if s.apiKey == "" {
		return nil, fmt.Errorf("Gemini API key not configured")
	}

	imageBytes := input.ImageData
	if len(imageBytes) == 0 {
		return nil, fmt.Errorf("input image is required")
	}
	if len(imageBytes) > maxImageTransformInputBytes {
		return nil, fmt.Errorf("input image exceeds max size")
	}

	mimeType := strings.TrimSpace(input.MimeType)
	if mimeType == "" || !strings.HasPrefix(mimeType, "image/") {
		mimeType = GetMimeType(imageBytes)
	}
	if !strings.HasPrefix(mimeType, "image/") {
		return nil, fmt.Errorf("unsupported input MIME type")
	}

	style := strings.TrimSpace(input.Style)
	if style == "" {
		style = ProBackdropDefaultStyle
	}

	reqBody := imageTransformRequest{
		SystemInstruction: &imageTransformContent{
			Parts: []imageTransformPart{{Text: buildProBackdropSystemPrompt()}},
		},
		Contents: []imageTransformContent{
			{
				Parts: []imageTransformPart{
					{Text: buildProBackdropUserPrompt(style)},
					{
						InlineData: &imageTransformInlineData{
							MimeType: mimeType,
							Data:     ReadImageAsBase64(imageBytes),
						},
					},
				},
			},
		},
		GenerationConfig: &imageTransformGenerationConfig{
			Temperature:        0.1,
			TopP:               0.8,
			TopK:               16,
			CandidateCount:     1,
			ResponseModalities: []string{"IMAGE"},
		},
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal image transform request: %w", err)
	}

	endpoint := fmt.Sprintf("%s?key=%s", s.modelURL, s.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("failed to build image transform request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("image transform request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed reading image transform response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Gemini image transform API error: %s - %s", resp.Status, strings.TrimSpace(string(respBody)))
	}

	resultImage, resultMimeType, err := parseImageTransformResponse(respBody)
	if err != nil {
		return nil, err
	}

	if len(resultImage) == 0 {
		return nil, fmt.Errorf("Gemini image transform returned empty image")
	}
	if len(resultImage) > maxImageTransformOutputBytes {
		return nil, fmt.Errorf("Gemini image transform output exceeds max size")
	}
	if !strings.HasPrefix(resultMimeType, "image/") {
		resultMimeType = GetMimeType(resultImage)
	}
	if !strings.HasPrefix(resultMimeType, "image/") {
		return nil, fmt.Errorf("Gemini image transform returned unsupported MIME type")
	}

	return &ImageTransformResult{
		ImageData:     resultImage,
		MimeType:      resultMimeType,
		Model:         s.model,
		PromptVersion: ProBackdropPromptVersion,
	}, nil
}

type imageTransformRequest struct {
	SystemInstruction *imageTransformContent          `json:"systemInstruction,omitempty"`
	Contents          []imageTransformContent         `json:"contents"`
	GenerationConfig  *imageTransformGenerationConfig `json:"generationConfig,omitempty"`
}

type imageTransformContent struct {
	Parts []imageTransformPart `json:"parts"`
}

type imageTransformPart struct {
	Text            string                    `json:"text,omitempty"`
	InlineData      *imageTransformInlineData `json:"inline_data,omitempty"`
	InlineDataCamel *imageTransformInlineData `json:"inlineData,omitempty"`
}

type imageTransformInlineData struct {
	MimeType string `json:"mime_type,omitempty"`
	Data     string `json:"data,omitempty"`
}

type imageTransformGenerationConfig struct {
	Temperature        float64  `json:"temperature,omitempty"`
	TopP               float64  `json:"topP,omitempty"`
	TopK               int      `json:"topK,omitempty"`
	CandidateCount     int      `json:"candidateCount,omitempty"`
	ResponseModalities []string `json:"responseModalities,omitempty"`
}

type imageTransformResponse struct {
	Candidates []struct {
		Content struct {
			Parts []imageTransformPart `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func parseImageTransformResponse(body []byte) ([]byte, string, error) {
	var parsed imageTransformResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, "", fmt.Errorf("failed to parse image transform response: %w", err)
	}

	for _, candidate := range parsed.Candidates {
		for _, part := range candidate.Content.Parts {
			inline := part.InlineData
			if inline == nil {
				inline = part.InlineDataCamel
			}
			if inline == nil || strings.TrimSpace(inline.Data) == "" {
				continue
			}

			decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(inline.Data))
			if err != nil {
				return nil, "", fmt.Errorf("failed decoding generated image data: %w", err)
			}

			mimeType := strings.TrimSpace(inline.MimeType)
			if mimeType == "" {
				mimeType = GetMimeType(decoded)
			}
			return decoded, mimeType, nil
		}
	}

	return nil, "", fmt.Errorf("no image output returned by Gemini")
}

func buildProBackdropSystemPrompt() string {
	return `{
  "task": "replace_background_only",
  "prompt_version": "pro_backdrop_v1",
  "hard_constraints": [
    "Do not modify, add, remove, retouch, reshape, repaint, relight, or regenerate the product subject.",
    "Preserve subject geometry, edges, logo text, labels, serial marks, scratches, dents, and defects exactly as in source image.",
    "Keep camera perspective and subject scale unchanged.",
    "Only replace background and cast a natural soft shadow under the subject.",
    "Do not add props, hands, people, reflections, watermarks, or text overlays."
  ],
  "output_requirements": {
    "style": "professional_studio_neutral",
    "background": "clean premium studio backdrop",
    "lighting": "soft neutral commercial lighting",
    "quality": "marketplace ready"
  },
  "failure_rule": "If exact subject preservation cannot be guaranteed, return no image."
}`
}

func buildProBackdropUserPrompt(style string) string {
	return fmt.Sprintf(`Create one transformed image using style "%s".
Replace ONLY the background with a premium professional backdrop.
Do not alter the product subject in any way.`, style)
}

func ensurePublicHost(ctx context.Context, host string) error {
	if ip, err := netip.ParseAddr(host); err == nil {
		if !isPublicIP(ip) {
			return fmt.Errorf("source image host is not publicly routable")
		}
		return nil
	}

	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
	if err != nil {
		return fmt.Errorf("failed resolving source image host")
	}
	if len(ips) == 0 {
		return fmt.Errorf("source image host resolved to no addresses")
	}
	for _, ip := range ips {
		addr, ok := netip.AddrFromSlice(ip)
		if !ok || !isPublicIP(addr) {
			return fmt.Errorf("source image host is not publicly routable")
		}
	}

	return nil
}

func isPublicIP(addr netip.Addr) bool {
	if !addr.IsValid() {
		return false
	}
	return !(addr.IsPrivate() || addr.IsLoopback() || addr.IsLinkLocalUnicast() || addr.IsLinkLocalMulticast() || addr.IsMulticast() || addr.IsUnspecified())
}
