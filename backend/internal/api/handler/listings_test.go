package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
)

// ============================================================================
// Expiration Validation Tests
// ============================================================================

func TestValidateExpiresAt_NilIsValid(t *testing.T) {
	// nil expiration should be valid (uses default)
	err := ValidateExpiresAt(nil)
	if err != nil {
		t.Errorf("Expected nil to be valid, got error: %v", err)
	}
}

func TestValidateExpiresAt_WithinRange(t *testing.T) {
	// Test various valid dates within range (1 day to 1 month)
	tests := []struct {
		name     string
		duration time.Duration
	}{
		{"1 day from now", 25 * time.Hour}, // Just over 1 day
		{"3 days from now", 3 * 24 * time.Hour},
		{"1 week from now", 7 * 24 * time.Hour},
		{"2 weeks from now", 14 * 24 * time.Hour},
		{"20 days from now", 20 * 24 * time.Hour},
		{"29 days from now", 29 * 24 * time.Hour}, // Just under 1 month
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expiry := time.Now().Add(tt.duration)
			err := ValidateExpiresAt(&expiry)
			if err != nil {
				t.Errorf("Expected %s to be valid, got error: %v", tt.name, err)
			}
		})
	}
}

func TestValidateExpiresAt_TooSoon(t *testing.T) {
	// Test dates that are too soon (less than 1 day)
	tests := []struct {
		name     string
		duration time.Duration
	}{
		{"now", 0},
		{"1 hour from now", 1 * time.Hour},
		{"12 hours from now", 12 * time.Hour},
		{"23 hours from now", 23 * time.Hour},
		{"in the past", -1 * time.Hour},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expiry := time.Now().Add(tt.duration)
			err := ValidateExpiresAt(&expiry)
			if err == nil {
				t.Errorf("Expected %s to be invalid (too soon), but got no error", tt.name)
			}
		})
	}
}

func TestValidateExpiresAt_TooFar(t *testing.T) {
	// Test dates that are too far in the future (more than 1 month / 30 days)
	tests := []struct {
		name     string
		duration time.Duration
	}{
		{"31 days from now", 31 * 24 * time.Hour},
		{"2 months from now", 60 * 24 * time.Hour},
		{"1 year from now", 365 * 24 * time.Hour},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expiry := time.Now().Add(tt.duration)
			err := ValidateExpiresAt(&expiry)
			if err == nil {
				t.Errorf("Expected %s to be invalid (too far), but got no error", tt.name)
			}
		})
	}
}

func TestValidateExpiresAt_ExactBoundaries(t *testing.T) {
	now := time.Now()

	// Just over 1 day should be valid
	t.Run("just over 1 day", func(t *testing.T) {
		expiry := now.Add(24*time.Hour + time.Second)
		err := ValidateExpiresAt(&expiry)
		if err != nil {
			t.Errorf("Expected just over 1 day to be valid, got error: %v", err)
		}
	})

	// Just under 1 day should be invalid
	t.Run("just under 1 day", func(t *testing.T) {
		expiry := now.Add(24*time.Hour - time.Minute)
		err := ValidateExpiresAt(&expiry)
		if err == nil {
			t.Error("Expected just under 1 day to be invalid")
		}
	})

	// Just under 30 days should be valid
	t.Run("just under 30 days", func(t *testing.T) {
		expiry := now.Add(30*24*time.Hour - time.Minute)
		err := ValidateExpiresAt(&expiry)
		if err != nil {
			t.Errorf("Expected just under 30 days to be valid, got error: %v", err)
		}
	})

	// Just over 30 days should be invalid
	t.Run("just over 30 days", func(t *testing.T) {
		expiry := now.Add(30*24*time.Hour + time.Minute)
		err := ValidateExpiresAt(&expiry)
		if err == nil {
			t.Error("Expected just over 30 days to be invalid")
		}
	})
}

func TestDefaultExpiresAt(t *testing.T) {
	// Default should be approximately 7 days from now
	before := time.Now().Add(7 * 24 * time.Hour)
	defaultExpiry := DefaultExpiresAt()
	after := time.Now().Add(7 * 24 * time.Hour)

	// Should be between before and after (allowing for execution time)
	if defaultExpiry.Before(before.Add(-time.Second)) {
		t.Error("Default expiry is too early")
	}
	if defaultExpiry.After(after.Add(time.Second)) {
		t.Error("Default expiry is too late")
	}
}

func TestDefaultExpiresAt_IsWithinValidRange(t *testing.T) {
	// The default expiration should always pass validation
	defaultExpiry := DefaultExpiresAt()
	err := ValidateExpiresAt(&defaultExpiry)
	if err != nil {
		t.Errorf("Default expiry should be valid, got error: %v", err)
	}
}

// ============================================================================
// Update Expiration Validation Tests (max 1 month from original creation)
// ============================================================================

func TestValidateExpiresAtForUpdate_NilIsValid(t *testing.T) {
	createdAt := time.Now().Add(-7 * 24 * time.Hour) // Created 1 week ago
	err := ValidateExpiresAtForUpdate(nil, createdAt)
	if err != nil {
		t.Errorf("Expected nil to be valid, got error: %v", err)
	}
}

func TestValidateExpiresAtForUpdate_WithinOriginalMonth(t *testing.T) {
	// Listing created 10 days ago - max expiry is 30 days from creation = 20 days from now
	createdAt := time.Now().Add(-10 * 24 * time.Hour)

	tests := []struct {
		name     string
		duration time.Duration // from now
	}{
		{"1 day from now", 25 * time.Hour},
		{"10 days from now", 10 * 24 * time.Hour},
		{"19 days from now", 19 * 24 * time.Hour}, // Just within limit
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expiry := time.Now().Add(tt.duration)
			err := ValidateExpiresAtForUpdate(&expiry, createdAt)
			if err != nil {
				t.Errorf("Expected %s to be valid, got error: %v", tt.name, err)
			}
		})
	}
}

func TestValidateExpiresAtForUpdate_ExceedsOriginalMonth(t *testing.T) {
	// Listing created 25 days ago - max expiry is 30 days from creation = 5 days from now
	createdAt := time.Now().Add(-25 * 24 * time.Hour)

	// 10 days from now would exceed 30 days from original creation
	expiry := time.Now().Add(10 * 24 * time.Hour)
	err := ValidateExpiresAtForUpdate(&expiry, createdAt)
	if err == nil {
		t.Error("Expected expiry exceeding 1 month from creation to be invalid")
	}
}

func TestValidateExpiresAtForUpdate_TooSoon(t *testing.T) {
	createdAt := time.Now().Add(-5 * 24 * time.Hour) // Created 5 days ago

	// Even though within 1 month from creation, less than 1 day from now should fail
	expiry := time.Now().Add(12 * time.Hour)
	err := ValidateExpiresAtForUpdate(&expiry, createdAt)
	if err == nil {
		t.Error("Expected less than 1 day from now to be invalid")
	}
}

func TestValidateExpiresAtForUpdate_OldListing(t *testing.T) {
	// Listing created 28 days ago - 2 days left to extend (30 - 28 = 2)
	createdAt := time.Now().Add(-28 * 24 * time.Hour)

	// Can still extend to near the 30-day mark from creation
	t.Run("can extend within 30 day limit", func(t *testing.T) {
		// 25 hours from now = ~1.04 days, which is 28 + 1.04 = ~29 days from creation (valid)
		expiry := time.Now().Add(25 * time.Hour)
		err := ValidateExpiresAtForUpdate(&expiry, createdAt)
		if err != nil {
			t.Errorf("Expected to be able to extend within 30-day limit, got error: %v", err)
		}
	})

	// Cannot extend beyond 30 days from creation
	t.Run("cannot exceed 30 day limit", func(t *testing.T) {
		// 3 days from now = 28 + 3 = 31 days from creation (invalid)
		expiry := time.Now().Add(3 * 24 * time.Hour)
		err := ValidateExpiresAtForUpdate(&expiry, createdAt)
		if err == nil {
			t.Error("Expected exceeding 30-day limit to be invalid")
		}
	})
}

func TestDeleteListing_ServiceNotInitialized(t *testing.T) {
	// Ensure repo is nil
	originalRepo := listingRepo
	listingRepo = nil
	defer func() { listingRepo = originalRepo }()

	req := httptest.NewRequest(http.MethodDelete, "/api/listings/00000000-0000-0000-0000-000000000000", nil)
	w := httptest.NewRecorder()

	DeleteListing(w, req, "00000000-0000-0000-0000-000000000000")

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got %d", w.Code)
	}
}

func TestDeleteListing_InvalidID(t *testing.T) {
	// Set dummy repo to pass the nil check
	originalRepo := listingRepo
	// We pass nil as db pool, hoping NewListingRepository handles it or we manually construct struct if allowed
	// repository reference is needed.
	// Since we are in handler package, we import repository.
	// We can try to use repository.NewListingRepository(nil) which might panic if it uses db immediately, but it likely just assigns struct fields.
	listingRepo = repository.NewListingRepository(nil)
	defer func() { listingRepo = originalRepo }()

	req := httptest.NewRequest(http.MethodDelete, "/api/listings/abc", nil)
	w := httptest.NewRecorder()

	DeleteListing(w, req, "abc")

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 for invalid ID, got %d", w.Code)
	}
}

func TestDeleteListing_NoAuth(t *testing.T) {
	originalRepo := listingRepo
	listingRepo = repository.NewListingRepository(nil)
	defer func() { listingRepo = originalRepo }()

	// Numeric IDs are no longer accepted for API routes.
	req := httptest.NewRequest(http.MethodDelete, "/api/listings/123", nil)
	// No auth context set

	w := httptest.NewRecorder()

	DeleteListing(w, req, "123")

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 BadRequest, got %d", w.Code)
	}
}

func TestDeleteListing_WithAuth_RepoFails(t *testing.T) {
	// Numeric IDs are rejected before auth/repo checks.
	originalRepo := listingRepo
	listingRepo = repository.NewListingRepository(nil)
	defer func() { listingRepo = originalRepo }()

	req := httptest.NewRequest(http.MethodDelete, "/api/listings/123", nil)
	// Add user ID to context
	ctx := context.WithValue(req.Context(), "userID", "user123")
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()

	DeleteListing(w, req, "123")

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 BadRequest, got %d", w.Code)
	}
}

func TestCanViewListing_PublicStatus(t *testing.T) {
	listing := &models.Listing{
		Status: string(models.ListingStatusActive),
	}
	if !canViewListing(listing, "", false) {
		t.Fatal("public active listing should be visible")
	}
}

func TestCanViewListing_PendingOwnerOnly(t *testing.T) {
	ownerID := "user-1"
	listing := &models.Listing{
		Status: string(models.ListingStatusPendingReview),
		UserID: &ownerID,
	}

	if !canViewListing(listing, ownerID, false) {
		t.Fatal("owner should be able to view pending listing")
	}
	if canViewListing(listing, "user-2", false) {
		t.Fatal("non-owner should not view pending listing")
	}
	if !canViewListing(listing, "admin-user", true) {
		t.Fatal("admin should be able to view pending listing")
	}
}

func TestMapListingImagesForResponse_PublicStatusUnchanged(t *testing.T) {
	images := []models.ListingImage{
		{ID: 1, URL: "https://example.com/a.jpg"},
	}

	mapped := mapListingImagesForResponse(string(models.ListingStatusActive), images)
	if len(mapped) != 1 {
		t.Fatalf("expected 1 image, got %d", len(mapped))
	}
	if mapped[0].URL != images[0].URL {
		t.Fatalf("expected public listing image URL to remain unchanged, got %q", mapped[0].URL)
	}
}

func TestMapListingImagesForResponse_NonPublicUsesProtectedPath(t *testing.T) {
	images := []models.ListingImage{
		{ID: 42, URL: "https://example.com/private.jpg"},
	}

	mapped := mapListingImagesForResponse(string(models.ListingStatusPendingReview), images)
	if len(mapped) != 1 {
		t.Fatalf("expected 1 image, got %d", len(mapped))
	}
	expected := "/api/listing-images/42/view"
	if mapped[0].URL != expected {
		t.Fatalf("expected protected path %q, got %q", expected, mapped[0].URL)
	}
	if images[0].URL == mapped[0].URL {
		t.Fatal("expected mapping to avoid mutating original URL and return protected URL copy")
	}
}

func TestShouldUseProtectedImagePaths_PublicStatusFalse(t *testing.T) {
	ownerID := "user-1"
	if shouldUseProtectedImagePaths(string(models.ListingStatusActive), &ownerID, "", false) {
		t.Fatal("public listings should not require protected image paths")
	}
}

func TestShouldUseProtectedImagePaths_NonPublicOwnerFalse(t *testing.T) {
	ownerID := "user-1"
	if shouldUseProtectedImagePaths(string(models.ListingStatusPendingReview), &ownerID, ownerID, false) {
		t.Fatal("owner should receive direct image URLs for non-public listings")
	}
}

func TestShouldUseProtectedImagePaths_NonPublicAdminFalse(t *testing.T) {
	ownerID := "user-1"
	if shouldUseProtectedImagePaths(string(models.ListingStatusPendingReview), &ownerID, "admin-user", true) {
		t.Fatal("admin should receive direct image URLs for non-public listings")
	}
}

func TestShouldUseProtectedImagePaths_NonPublicAnonymousTrue(t *testing.T) {
	ownerID := "user-1"
	if !shouldUseProtectedImagePaths(string(models.ListingStatusPendingReview), &ownerID, "", false) {
		t.Fatal("anonymous/non-owner requests should use protected image paths for non-public listings")
	}
}

func TestPersistPendingUploadedImages_ResolvesOutOfOrderDependencies(t *testing.T) {
	clientIDToImageID := map[string]int{
		"root-source": 101,
	}
	pending := []pendingUploadedImage{
		{
			upload: uploadedImagePayload{
				ClientID:       "variant-child",
				SourceClientID: "variant-parent",
			},
			fallbackOrder: 0,
		},
		{
			upload: uploadedImagePayload{
				ClientID:       "variant-parent",
				SourceClientID: "root-source",
			},
			fallbackOrder: 1,
		},
	}

	nextID := 500
	persisted := make([]string, 0, 2)
	err := persistPendingUploadedImages(pending, clientIDToImageID, func(upload uploadedImagePayload, fallbackOrder int, sourceImageID *int) error {
		if strings.TrimSpace(upload.SourceClientID) != "" && (sourceImageID == nil || *sourceImageID <= 0) {
			t.Fatalf("expected resolved sourceImageID for %q", upload.ClientID)
		}
		persisted = append(persisted, upload.ClientID)
		clientIDToImageID[upload.ClientID] = nextID
		nextID++
		return nil
	})
	if err != nil {
		t.Fatalf("expected no error resolving pending uploads, got %v", err)
	}

	if len(persisted) != 2 {
		t.Fatalf("expected 2 persisted uploads, got %d", len(persisted))
	}
	if persisted[0] != "variant-parent" || persisted[1] != "variant-child" {
		t.Fatalf("unexpected persist order %v", persisted)
	}
}

func TestPersistPendingUploadedImages_ReturnsUnresolvedSourceClientIDs(t *testing.T) {
	clientIDToImageID := map[string]int{}
	pending := []pendingUploadedImage{
		{
			upload: uploadedImagePayload{
				ClientID:       "variant-1",
				SourceClientID: "missing-b",
			},
			fallbackOrder: 0,
		},
		{
			upload: uploadedImagePayload{
				ClientID:       "variant-2",
				SourceClientID: "missing-a",
			},
			fallbackOrder: 1,
		},
	}

	persistCalls := 0
	err := persistPendingUploadedImages(pending, clientIDToImageID, func(upload uploadedImagePayload, fallbackOrder int, sourceImageID *int) error {
		persistCalls++
		return nil
	})
	if err == nil {
		t.Fatal("expected unresolved sourceClientId error")
	}
	if persistCalls != 0 {
		t.Fatalf("expected no persist calls when dependencies are unresolved, got %d", persistCalls)
	}

	msg := err.Error()
	if !strings.Contains(msg, "missing-a") || !strings.Contains(msg, "missing-b") {
		t.Fatalf("expected unresolved source client IDs in error, got %q", msg)
	}
}
