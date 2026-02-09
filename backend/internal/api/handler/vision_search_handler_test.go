package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"testing"

	"github.com/yourusername/justsell/backend/internal/service"
)

type mockVisionService struct {
	searchResult      *service.VisionSearchResult
	searchErr         error
	lastSearchMime    string
	lastSearchPayload string
	searchCallCount   int
}

func (m *mockVisionService) AnalyzeImages(_ context.Context, _ service.AnalyzeImagesInput) (*service.AnalysisResult, error) {
	return nil, nil
}

func (m *mockVisionService) AnalyzeImageForSearch(_ context.Context, image service.ImageData) (*service.VisionSearchResult, error) {
	m.searchCallCount++
	m.lastSearchMime = image.MimeType
	m.lastSearchPayload = image.Data
	if m.searchErr != nil {
		return nil, m.searchErr
	}
	return m.searchResult, nil
}

func TestVisionSearch_MethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/search/vision", nil)
	w := httptest.NewRecorder()

	VisionSearch(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusMethodNotAllowed)
	}
}

func TestVisionSearch_ServiceUnavailable(t *testing.T) {
	original := visionService
	visionService = nil
	defer func() { visionService = original }()

	req := httptest.NewRequest(http.MethodPost, "/api/search/vision", nil)
	w := httptest.NewRecorder()

	VisionSearch(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}
}

func TestVisionSearch_MissingImage(t *testing.T) {
	original := visionService
	visionService = &mockVisionService{}
	defer func() { visionService = original }()

	req := buildMultipartRequest(t, nil, "")
	w := httptest.NewRecorder()

	VisionSearch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestVisionSearch_RejectsNonImageContentType(t *testing.T) {
	original := visionService
	visionService = &mockVisionService{}
	defer func() { visionService = original }()

	req := buildMultipartRequest(t, []byte("not-an-image"), "text/plain")
	w := httptest.NewRecorder()

	VisionSearch(w, req)

	if w.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusUnsupportedMediaType)
	}
}

func TestVisionSearch_Success(t *testing.T) {
	mockSvc := &mockVisionService{
		searchResult: &service.VisionSearchResult{
			Query:      "iphone 15 pro",
			Confidence: 0.88,
			Keywords:   []string{"iphone", "smartphone"},
		},
	}
	original := visionService
	visionService = mockSvc
	defer func() { visionService = original }()

	// Minimal JPEG payload using magic bytes so GetMimeType resolves image/jpeg.
	jpeg := []byte{0xFF, 0xD8, 0xFF, 0xDB, 0x00, 0x43, 0x00}
	req := buildMultipartRequest(t, jpeg, "image/jpeg")
	w := httptest.NewRecorder()

	VisionSearch(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if mockSvc.searchCallCount != 1 {
		t.Fatalf("AnalyzeImageForSearch call count = %d, want 1", mockSvc.searchCallCount)
	}
	if mockSvc.lastSearchMime != "image/jpeg" {
		t.Fatalf("mime = %q, want %q", mockSvc.lastSearchMime, "image/jpeg")
	}
	if mockSvc.lastSearchPayload != service.ReadImageAsBase64(jpeg) {
		t.Fatalf("payload did not match expected base64 conversion")
	}

	var response VisionSearchResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.Success {
		t.Fatal("expected success=true")
	}
	if response.Data == nil || response.Data.Query != "iphone 15 pro" {
		t.Fatalf("unexpected response data: %+v", response.Data)
	}
}

func TestVisionSearch_PropagatesServiceError(t *testing.T) {
	mockSvc := &mockVisionService{
		searchErr: io.EOF,
	}
	original := visionService
	visionService = mockSvc
	defer func() { visionService = original }()

	jpeg := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10}
	req := buildMultipartRequest(t, jpeg, "image/jpeg")
	w := httptest.NewRecorder()

	VisionSearch(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

func buildMultipartRequest(t *testing.T, fileBytes []byte, contentType string) *http.Request {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if len(fileBytes) > 0 {
		part, err := writer.CreateFormFile("image", "upload.jpg")
		if err != nil {
			t.Fatalf("create form file: %v", err)
		}
		if contentType != "" {
			// CreateFormFile does not let us set custom content type, so replace with explicit part.
			_ = part
			_ = writer.Close()
			return buildMultipartRequestWithContentType(t, fileBytes, contentType)
		}
		if _, err := part.Write(fileBytes); err != nil {
			t.Fatalf("write file bytes: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/search/vision", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func buildMultipartRequestWithContentType(t *testing.T, fileBytes []byte, contentType string) *http.Request {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	header := make(textproto.MIMEHeader)
	header.Set("Content-Disposition", `form-data; name="image"; filename="upload.jpg"`)
	header.Set("Content-Type", contentType)
	part, err := writer.CreatePart(header)
	if err != nil {
		t.Fatalf("create custom part: %v", err)
	}
	if _, err := part.Write(fileBytes); err != nil {
		t.Fatalf("write custom part: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/search/vision", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}
