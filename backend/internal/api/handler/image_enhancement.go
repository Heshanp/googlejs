package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/yourusername/justsell/backend/internal/api/middleware"
	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/service"
)

const (
	defaultImageEnhancementBurst  = 5
	defaultImageEnhancementRefill = 10 * time.Second
	maxEnhancementUploadBytes     = 8 * 1024 * 1024
)

type imageTransformProcessor interface {
	GenerateProBackdrop(ctx context.Context, input service.ImageTransformInput) (*service.ImageTransformResult, error)
	DownloadSourceImage(ctx context.Context, imageURL string) ([]byte, string, error)
}

var imageTransformSvc imageTransformProcessor
var imageEnhancementLimiter = middleware.NewRateLimiter(defaultImageEnhancementBurst, defaultImageEnhancementRefill)

var resolveEnhancementListing = func(ctx context.Context, listingPublicID string) (*models.Listing, int, error) {
	if listingRepo == nil {
		return nil, 0, errors.New("listing service not initialized")
	}

	listingID, err := listingRepo.ResolveID(ctx, strings.TrimSpace(listingPublicID))
	if err != nil {
		if errors.Is(err, repository.ErrListingNotFound) {
			return nil, 0, repository.ErrListingNotFound
		}
		return nil, 0, fmt.Errorf("invalid listing id")
	}

	listing, err := listingRepo.GetByID(ctx, listingID)
	if err != nil {
		return nil, 0, repository.ErrListingNotFound
	}
	return listing, listingID, nil
}

var getEnhancementImageByID = func(ctx context.Context, imageID int) (*models.ListingImage, error) {
	if imageRepo == nil {
		return nil, errors.New("image service not initialized")
	}
	return imageRepo.GetByID(ctx, imageID)
}

// SetImageTransformService wires the image transform service dependency.
func SetImageTransformService(svc *service.ImageTransformService) {
	imageTransformSvc = svc
}

// ConfigureImageEnhancementRateLimiter updates endpoint-level rate limit settings.
func ConfigureImageEnhancementRateLimiter(maxTokens int, refillRate time.Duration) {
	if maxTokens <= 0 {
		maxTokens = defaultImageEnhancementBurst
	}
	if refillRate <= 0 {
		refillRate = defaultImageEnhancementRefill
	}
	imageEnhancementLimiter = middleware.NewRateLimiter(maxTokens, refillRate)
}

type generateProBackdropRequest struct {
	ListingPublicID string `json:"listingPublicId"`
	ImageID         int    `json:"imageId"`
	Style           string `json:"style,omitempty"`
}

type generateProBackdropResponse struct {
	Success bool                             `json:"success"`
	Data    *generateProBackdropResponseData `json:"data,omitempty"`
	Error   string                           `json:"error,omitempty"`
}

type generateProBackdropResponseData struct {
	ImageBase64 string                  `json:"imageBase64"`
	MimeType    string                  `json:"mimeType"`
	Filename    string                  `json:"filename"`
	Meta        generateProBackdropMeta `json:"meta"`
}

type generateProBackdropMeta struct {
	Model         string `json:"model"`
	PromptVersion string `json:"promptVersion"`
}

// GenerateProBackdrop handles authenticated image enhancement requests.
func GenerateProBackdrop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if imageTransformSvc == nil {
		sendProBackdropError(w, "Image enhancement service not configured", http.StatusServiceUnavailable)
		return
	}

	userID := getRequestUserID(r)
	if userID == "" {
		sendProBackdropError(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	if !imageEnhancementLimiter.Allow(userID) {
		sendProBackdropError(w, "Rate limit exceeded. Please try again later.", http.StatusTooManyRequests)
		return
	}

	var (
		inputImage []byte
		inputMime  string
		style      = service.ProBackdropDefaultStyle
	)

	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(r.Header.Get("Content-Type"))), "multipart/form-data") {
		file, header, err := parseMultipartImage(r)
		if err != nil {
			sendProBackdropError(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer file.Close()

		data, mimeType, err := readUploadedImage(file, header)
		if err != nil {
			sendProBackdropError(w, err.Error(), http.StatusBadRequest)
			return
		}
		inputImage = data
		inputMime = mimeType
		if submittedStyle := strings.TrimSpace(r.FormValue("style")); submittedStyle != "" {
			style = submittedStyle
		}
	} else {
		var req generateProBackdropRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendProBackdropError(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if req.ImageID <= 0 || strings.TrimSpace(req.ListingPublicID) == "" {
			sendProBackdropError(w, "listingPublicId and imageId are required", http.StatusBadRequest)
			return
		}
		if submittedStyle := strings.TrimSpace(req.Style); submittedStyle != "" {
			style = submittedStyle
		}

		listing, listingID, err := resolveEnhancementListing(r.Context(), req.ListingPublicID)
		if err != nil {
			if errors.Is(err, repository.ErrListingNotFound) {
				sendProBackdropError(w, "Listing not found", http.StatusNotFound)
				return
			}
			sendProBackdropError(w, "Invalid listing ID", http.StatusBadRequest)
			return
		}
		if listing.UserID == nil || *listing.UserID != userID {
			sendProBackdropError(w, "You can only enhance your own listing images", http.StatusForbidden)
			return
		}

		image, err := getEnhancementImageByID(r.Context(), req.ImageID)
		if err != nil || image == nil {
			sendProBackdropError(w, "Image not found", http.StatusNotFound)
			return
		}
		if image.ListingID != listingID {
			sendProBackdropError(w, "Image does not belong to the listing", http.StatusBadRequest)
			return
		}

		data, mimeType, err := imageTransformSvc.DownloadSourceImage(r.Context(), image.URL)
		if err != nil {
			sendProBackdropError(w, "Failed to fetch source image", http.StatusBadRequest)
			return
		}
		inputImage = data
		inputMime = mimeType
	}

	result, err := imageTransformSvc.GenerateProBackdrop(r.Context(), service.ImageTransformInput{
		ImageData: inputImage,
		MimeType:  inputMime,
		Style:     style,
	})
	if err != nil {
		sendProBackdropError(w, "Failed to generate professional backdrop", http.StatusInternalServerError)
		return
	}

	encoded := base64.StdEncoding.EncodeToString(result.ImageData)
	response := generateProBackdropResponse{
		Success: true,
		Data: &generateProBackdropResponseData{
			ImageBase64: encoded,
			MimeType:    result.MimeType,
			Filename:    buildGeneratedFilename(result.MimeType),
			Meta: generateProBackdropMeta{
				Model:         result.Model,
				PromptVersion: result.PromptVersion,
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(response)
}

func parseMultipartImage(r *http.Request) (multipart.File, *multipart.FileHeader, error) {
	if err := r.ParseMultipartForm(int64(maxEnhancementUploadBytes + (1 << 20))); err != nil {
		return nil, nil, fmt.Errorf("failed to parse form data")
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		return nil, nil, fmt.Errorf("image is required")
	}
	return file, header, nil
}

func readUploadedImage(file multipart.File, header *multipart.FileHeader) ([]byte, string, error) {
	data, err := io.ReadAll(io.LimitReader(file, int64(maxEnhancementUploadBytes+1)))
	if err != nil {
		return nil, "", fmt.Errorf("failed to read uploaded image")
	}
	if len(data) == 0 {
		return nil, "", fmt.Errorf("uploaded image is empty")
	}
	if len(data) > maxEnhancementUploadBytes {
		return nil, "", fmt.Errorf("uploaded image exceeds max size")
	}

	mimeType := strings.TrimSpace(header.Header.Get("Content-Type"))
	if !strings.HasPrefix(mimeType, "image/") {
		mimeType = service.GetMimeType(data)
	}
	if !strings.HasPrefix(mimeType, "image/") {
		return nil, "", fmt.Errorf("only image files are supported")
	}

	return data, mimeType, nil
}

func sendProBackdropError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(generateProBackdropResponse{
		Success: false,
		Error:   message,
	})
}

func buildGeneratedFilename(mimeType string) string {
	ext := ".jpg"
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	case "image/jpeg", "image/jpg":
		ext = ".jpg"
	}
	return fmt.Sprintf("pro_backdrop_%d%s", time.Now().UnixNano(), ext)
}
