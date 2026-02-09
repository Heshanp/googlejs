package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/yourusername/justsell/backend/internal/api/middleware"
	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/service"
)

type mockImageTransformService struct {
	downloadFn func(ctx context.Context, imageURL string) ([]byte, string, error)
	generateFn func(ctx context.Context, input service.ImageTransformInput) (*service.ImageTransformResult, error)
}

func (m *mockImageTransformService) DownloadSourceImage(ctx context.Context, imageURL string) ([]byte, string, error) {
	return m.downloadFn(ctx, imageURL)
}

func (m *mockImageTransformService) GenerateProBackdrop(ctx context.Context, input service.ImageTransformInput) (*service.ImageTransformResult, error) {
	return m.generateFn(ctx, input)
}

func TestGenerateProBackdropRequiresAuth(t *testing.T) {
	originalSvc := imageTransformSvc
	defer func() { imageTransformSvc = originalSvc }()
	imageTransformSvc = &mockImageTransformService{}

	req := httptest.NewRequest(http.MethodPost, "/api/images/pro-backdrop", strings.NewReader(`{"listingPublicId":"x","imageId":1}`))
	w := httptest.NewRecorder()

	GenerateProBackdrop(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestGenerateProBackdropRejectsNonOwner(t *testing.T) {
	originalSvc := imageTransformSvc
	originalResolve := resolveEnhancementListing
	originalLimiter := imageEnhancementLimiter
	defer func() {
		imageTransformSvc = originalSvc
		resolveEnhancementListing = originalResolve
		imageEnhancementLimiter = originalLimiter
	}()

	imageEnhancementLimiter = middleware.NewRateLimiter(10, time.Second)
	imageTransformSvc = &mockImageTransformService{}

	ownerID := "owner-1"
	resolveEnhancementListing = func(ctx context.Context, listingPublicID string) (*models.Listing, int, error) {
		return &models.Listing{ID: 55, UserID: &ownerID}, 55, nil
	}

	body := `{"listingPublicId":"abc","imageId":12}`
	req := httptest.NewRequest(http.MethodPost, "/api/images/pro-backdrop", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), "userID", "different-user"))
	w := httptest.NewRecorder()

	GenerateProBackdrop(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestGenerateProBackdropJSONSuccess(t *testing.T) {
	originalSvc := imageTransformSvc
	originalResolve := resolveEnhancementListing
	originalGetImage := getEnhancementImageByID
	originalLimiter := imageEnhancementLimiter
	defer func() {
		imageTransformSvc = originalSvc
		resolveEnhancementListing = originalResolve
		getEnhancementImageByID = originalGetImage
		imageEnhancementLimiter = originalLimiter
	}()

	imageEnhancementLimiter = middleware.NewRateLimiter(10, time.Second)

	ownerID := "owner-1"
	resolveEnhancementListing = func(ctx context.Context, listingPublicID string) (*models.Listing, int, error) {
		return &models.Listing{ID: 99, UserID: &ownerID}, 99, nil
	}
	getEnhancementImageByID = func(ctx context.Context, imageID int) (*models.ListingImage, error) {
		return &models.ListingImage{ID: 12, ListingID: 99, URL: "https://example.com/source.jpg", IsActive: true}, nil
	}

	imageTransformSvc = &mockImageTransformService{
		downloadFn: func(ctx context.Context, imageURL string) ([]byte, string, error) {
			return []byte("source-bytes"), "image/jpeg", nil
		},
		generateFn: func(ctx context.Context, input service.ImageTransformInput) (*service.ImageTransformResult, error) {
			if string(input.ImageData) != "source-bytes" {
				t.Fatalf("expected downloaded source image bytes")
			}
			return &service.ImageTransformResult{
				ImageData:     []byte("generated-image"),
				MimeType:      "image/jpeg",
				Model:         "gemini-test",
				PromptVersion: service.ProBackdropPromptVersion,
			}, nil
		},
	}

	body := `{"listingPublicId":"abc","imageId":12}`
	req := httptest.NewRequest(http.MethodPost, "/api/images/pro-backdrop", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), "userID", ownerID))
	w := httptest.NewRecorder()

	GenerateProBackdrop(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}

	var resp generateProBackdropResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !resp.Success || resp.Data == nil {
		t.Fatalf("expected success response")
	}
	decoded, err := base64.StdEncoding.DecodeString(resp.Data.ImageBase64)
	if err != nil {
		t.Fatalf("failed to decode image base64: %v", err)
	}
	if string(decoded) != "generated-image" {
		t.Fatalf("unexpected generated image payload")
	}
	if resp.Data.Meta.Model != "gemini-test" {
		t.Fatalf("expected model metadata")
	}
}

func TestGenerateProBackdropRateLimited(t *testing.T) {
	originalSvc := imageTransformSvc
	originalResolve := resolveEnhancementListing
	originalGetImage := getEnhancementImageByID
	originalLimiter := imageEnhancementLimiter
	defer func() {
		imageTransformSvc = originalSvc
		resolveEnhancementListing = originalResolve
		getEnhancementImageByID = originalGetImage
		imageEnhancementLimiter = originalLimiter
	}()

	imageEnhancementLimiter = middleware.NewRateLimiter(1, time.Hour)

	ownerID := "owner-1"
	resolveEnhancementListing = func(ctx context.Context, listingPublicID string) (*models.Listing, int, error) {
		return &models.Listing{ID: 99, UserID: &ownerID}, 99, nil
	}
	getEnhancementImageByID = func(ctx context.Context, imageID int) (*models.ListingImage, error) {
		return &models.ListingImage{ID: 12, ListingID: 99, URL: "https://example.com/source.jpg", IsActive: true}, nil
	}

	imageTransformSvc = &mockImageTransformService{
		downloadFn: func(ctx context.Context, imageURL string) ([]byte, string, error) {
			return []byte("source-bytes"), "image/jpeg", nil
		},
		generateFn: func(ctx context.Context, input service.ImageTransformInput) (*service.ImageTransformResult, error) {
			return &service.ImageTransformResult{ImageData: []byte("x"), MimeType: "image/jpeg", Model: "m", PromptVersion: "p"}, nil
		},
	}

	call := func() int {
		body := `{"listingPublicId":"abc","imageId":12}`
		req := httptest.NewRequest(http.MethodPost, "/api/images/pro-backdrop", strings.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), "userID", ownerID))
		w := httptest.NewRecorder()
		GenerateProBackdrop(w, req)
		return w.Code
	}

	if status := call(); status != http.StatusOK {
		t.Fatalf("expected first call 200, got %d", status)
	}
	if status := call(); status != http.StatusTooManyRequests {
		t.Fatalf("expected second call 429, got %d", status)
	}
}
