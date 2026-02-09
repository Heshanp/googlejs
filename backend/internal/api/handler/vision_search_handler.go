package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/yourusername/justsell/backend/internal/service"
)

const (
	visionSearchMaxRequestBytes = 12 << 20 // 12 MB total multipart payload
	visionSearchMaxFileBytes    = 10 << 20 // 10 MB image limit
)

// VisionSearchResponse is returned by the image-to-search endpoint.
type VisionSearchResponse struct {
	Success bool                        `json:"success"`
	Data    *service.VisionSearchResult `json:"data,omitempty"`
	Error   string                      `json:"error,omitempty"`
}

// VisionSearch handles POST /api/search/vision and returns a Gemini-derived query.
func VisionSearch(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		sendVisionSearchError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if visionService == nil {
		sendVisionSearchError(w, "Vision service not configured", http.StatusServiceUnavailable)
		return
	}

	// Hard cap request body size before parsing multipart payloads.
	r.Body = http.MaxBytesReader(w, r.Body, visionSearchMaxRequestBytes)
	if err := r.ParseMultipartForm(visionSearchMaxRequestBytes); err != nil {
		sendVisionSearchError(w, "Invalid multipart request", http.StatusBadRequest)
		return
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		sendVisionSearchError(w, "Image file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	if header.Size > visionSearchMaxFileBytes {
		sendVisionSearchError(w, "Image exceeds 10MB limit", http.StatusRequestEntityTooLarge)
		return
	}
	if contentType := header.Header.Get("Content-Type"); !strings.HasPrefix(contentType, "image/") {
		sendVisionSearchError(w, "Unsupported image format. Use JPEG, PNG, or WEBP.", http.StatusUnsupportedMediaType)
		return
	}

	data, err := io.ReadAll(file)
	if err != nil {
		sendVisionSearchError(w, "Failed to read image file", http.StatusBadRequest)
		return
	}
	if len(data) == 0 {
		sendVisionSearchError(w, "Uploaded image is empty", http.StatusBadRequest)
		return
	}
	if len(data) > visionSearchMaxFileBytes {
		sendVisionSearchError(w, "Image exceeds 10MB limit", http.StatusRequestEntityTooLarge)
		return
	}

	mimeType := service.GetMimeType(data)
	if !isSupportedVisionSearchMime(mimeType) {
		sendVisionSearchError(w, "Unsupported image format. Use JPEG, PNG, or WEBP.", http.StatusUnsupportedMediaType)
		return
	}

	result, err := visionService.AnalyzeImageForSearch(r.Context(), service.ImageData{
		Data:     service.ReadImageAsBase64(data),
		MimeType: mimeType,
	})
	if err != nil {
		log.Printf("vision search failed: %v", err)
		message := "Image understanding failed"
		// In development, expose sanitized root cause to speed up debugging.
		env := strings.ToLower(strings.TrimSpace(os.Getenv("ENV")))
		if env == "" || env == "development" {
			message = fmt.Sprintf("%s: %s", message, truncateForClient(err.Error(), 600))
		}
		sendVisionSearchError(w, message, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(VisionSearchResponse{
		Success: true,
		Data:    result,
	})
}

func isSupportedVisionSearchMime(mimeType string) bool {
	switch mimeType {
	case "image/jpeg", "image/png", "image/webp":
		return true
	default:
		return false
	}
}

func sendVisionSearchError(w http.ResponseWriter, message string, status int) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(VisionSearchResponse{
		Success: false,
		Error:   message,
	})
}

func truncateForClient(message string, maxLen int) string {
	if maxLen <= 0 || len(message) <= maxLen {
		return message
	}
	return strings.TrimSpace(message[:maxLen]) + "..."
}
