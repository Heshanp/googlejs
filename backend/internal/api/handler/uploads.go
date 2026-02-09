package handler

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/yourusername/justsell/backend/internal/service"
)

var s3Service *service.S3Service

// SetS3Service sets the S3 service dependency
func SetS3Service(svc *service.S3Service) {
	s3Service = svc
}

// UploadResponse represents the response after uploading a file
type UploadResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
}

// UploadImage handles single image upload to S3
func UploadImage(w http.ResponseWriter, r *http.Request) {
	// Max 10MB file (images are pre-compressed on frontend)
	r.ParseMultipartForm(10 << 20)

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Failed to read uploaded file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		http.Error(w, "Only image files are allowed", http.StatusBadRequest)
		return
	}

	// Check S3 is configured
	if s3Service == nil || !s3Service.IsConfigured() {
		http.Error(w, "S3 storage not configured", http.StatusServiceUnavailable)
		return
	}

	// Read file data
	data, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read file data", http.StatusInternalServerError)
		return
	}

	// Upload to S3
	result, err := s3Service.Upload(r.Context(), data, header.Filename, contentType)
	if err != nil {
		log.Printf("S3 upload failed: %v", err)
		http.Error(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}

	log.Printf("📷 Image uploaded to S3: %s (%d KB)", result.Key, len(data)/1024)

	// Return the URL
	response := UploadResponse{
		URL:      result.URL,
		Filename: result.Filename,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// UploadMultipleImages handles multiple image uploads to S3
func UploadMultipleImages(w http.ResponseWriter, r *http.Request) {
	// Max 50MB total (images are pre-compressed on frontend)
	r.ParseMultipartForm(50 << 20)

	files := r.MultipartForm.File["images"]
	if len(files) == 0 {
		http.Error(w, "No images uploaded", http.StatusBadRequest)
		return
	}

	// Check S3 is configured
	if s3Service == nil || !s3Service.IsConfigured() {
		http.Error(w, "S3 storage not configured", http.StatusServiceUnavailable)
		return
	}

	var responses []UploadResponse

	for _, header := range files {
		file, err := header.Open()
		if err != nil {
			log.Printf("Failed to open file: %v", err)
			continue
		}

		// Validate file type
		contentType := header.Header.Get("Content-Type")
		if !strings.HasPrefix(contentType, "image/") {
			file.Close()
			continue
		}

		// Read file data
		data, err := io.ReadAll(file)
		file.Close()
		if err != nil {
			log.Printf("Failed to read file: %v", err)
			continue
		}

		// Upload to S3
		result, err := s3Service.Upload(r.Context(), data, header.Filename, contentType)
		if err != nil {
			log.Printf("S3 upload failed for %s: %v", header.Filename, err)
			continue
		}

		log.Printf("📷 Image uploaded to S3: %s (%d KB)", result.Key, len(data)/1024)

		responses = append(responses, UploadResponse{
			URL:      result.URL,
			Filename: result.Filename,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(responses)
}
