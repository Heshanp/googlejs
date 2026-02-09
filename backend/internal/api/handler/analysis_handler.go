package handler

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/yourusername/justsell/backend/internal/service"
)

type visionServiceAPI interface {
	AnalyzeImages(ctx context.Context, input service.AnalyzeImagesInput) (*service.AnalysisResult, error)
	AnalyzeImageForSearch(ctx context.Context, image service.ImageData) (*service.VisionSearchResult, error)
}

var visionService visionServiceAPI

// SetVisionService sets the vision service dependency
func SetVisionService(svc *service.VisionService) {
	visionService = svc
}

// AnalyzeImagesRequest is the expected JSON request body
type AnalyzeImagesRequest struct {
	Images []struct {
		Data     string `json:"data"`     // base64-encoded image
		MimeType string `json:"mimeType"` // e.g., "image/jpeg"
	} `json:"images"`
}

// AnalyzeImagesResponse is the response structure
type AnalyzeImagesResponse struct {
	Success bool                    `json:"success"`
	Data    *service.AnalysisResult `json:"data,omitempty"`
	Error   string                  `json:"error,omitempty"`
}

// AnalyzeImages handles POST requests to analyze uploaded images using Gemini
func AnalyzeImages(w http.ResponseWriter, r *http.Request) {
	// Only allow POST
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if visionService == nil {
		sendAnalysisError(w, "Vision service not configured", http.StatusServiceUnavailable)
		return
	}

	// Check content type and parse accordingly
	contentType := r.Header.Get("Content-Type")

	var imageDataList []service.ImageData

	if contentType == "application/json" || contentType == "application/json; charset=utf-8" {
		// Handle JSON body with base64 images
		var req AnalyzeImagesRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendAnalysisError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if len(req.Images) == 0 {
			sendAnalysisError(w, "At least one image is required", http.StatusBadRequest)
			return
		}

		for _, img := range req.Images {
			imageDataList = append(imageDataList, service.ImageData{
				Data:     img.Data,
				MimeType: img.MimeType,
			})
		}
	} else {
		// Handle multipart form data
		if err := r.ParseMultipartForm(50 << 20); err != nil { // 50MB max
			sendAnalysisError(w, "Failed to parse form data", http.StatusBadRequest)
			return
		}

		files := r.MultipartForm.File["images"]
		if len(files) == 0 {
			sendAnalysisError(w, "At least one image is required", http.StatusBadRequest)
			return
		}

		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				log.Printf("Failed to open file: %v", err)
				continue
			}
			defer file.Close()

			data, err := io.ReadAll(file)
			if err != nil {
				log.Printf("Failed to read file: %v", err)
				continue
			}

			// Note: Image compression is now done on the frontend before upload
			// This saves bandwidth and improves upload speed

			mimeType := service.GetMimeType(data)
			base64Data := service.ReadImageAsBase64(data)

			imageDataList = append(imageDataList, service.ImageData{
				Data:     base64Data,
				MimeType: mimeType,
			})
		}

		if len(imageDataList) == 0 {
			sendAnalysisError(w, "No valid images found", http.StatusBadRequest)
			return
		}
	}

	// Limit to 5 images for performance
	if len(imageDataList) > 5 {
		imageDataList = imageDataList[:5]
	}

	// Perform analysis
	ctx := r.Context()
	result, err := visionService.AnalyzeImages(ctx, service.AnalyzeImagesInput{
		Images: imageDataList,
	})

	if err != nil {
		log.Printf("Image analysis failed: %v", err)
		sendAnalysisError(w, "Image analysis failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Debug logging
	log.Printf("📷 Analysis complete - ItemType: %s, Title: %s, Condition: %s", result.ItemType, result.Title, result.Condition)
	log.Printf("📷 StructuredFields: %v", result.StructuredFields)

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AnalyzeImagesResponse{
		Success: true,
		Data:    result,
	})
}

// sendAnalysisError sends a JSON error response
func sendAnalysisError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(AnalyzeImagesResponse{
		Success: false,
		Error:   message,
	})
}
