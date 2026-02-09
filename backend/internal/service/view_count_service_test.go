package service

import (
	"context"
	"net/http/httptest"
	"testing"
	"time"
)

// ============================================================================
// Tests for getClientIP
// ============================================================================

func TestGetClientIP_XForwardedFor_SingleIP(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.195")

	ip := svc.getClientIP(req)

	if ip != "203.0.113.195" {
		t.Errorf("Expected '203.0.113.195', got %q", ip)
	}
}

func TestGetClientIP_XForwardedFor_MultipleIPs(t *testing.T) {
	svc := NewViewCountService(nil)

	// X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.195, 70.41.3.18, 150.172.238.178")

	ip := svc.getClientIP(req)

	// Should return the first (client) IP
	if ip != "203.0.113.195" {
		t.Errorf("Expected first IP '203.0.113.195', got %q", ip)
	}
}

func TestGetClientIP_XRealIP(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Real-IP", "198.51.100.178")

	ip := svc.getClientIP(req)

	if ip != "198.51.100.178" {
		t.Errorf("Expected '198.51.100.178', got %q", ip)
	}
}

func TestGetClientIP_XForwardedFor_TakesPrecedence(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.195")
	req.Header.Set("X-Real-IP", "198.51.100.178")

	ip := svc.getClientIP(req)

	// X-Forwarded-For should take precedence
	if ip != "203.0.113.195" {
		t.Errorf("Expected X-Forwarded-For IP '203.0.113.195', got %q", ip)
	}
}

func TestGetClientIP_RemoteAddr_Fallback(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:12345"

	ip := svc.getClientIP(req)

	// Should extract just the IP, not the port
	if ip != "192.0.2.1" {
		t.Errorf("Expected '192.0.2.1' (without port), got %q", ip)
	}
}

func TestGetClientIP_IPv6(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Forwarded-For", "2001:db8::1")

	ip := svc.getClientIP(req)

	if ip != "2001:db8::1" {
		t.Errorf("Expected IPv6 '2001:db8::1', got %q", ip)
	}
}

func TestGetClientIP_EmptyHeaders(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	// Headers are empty, RemoteAddr should be used
	req.RemoteAddr = "10.0.0.1:8080"

	ip := svc.getClientIP(req)

	if ip != "10.0.0.1" {
		t.Errorf("Expected '10.0.0.1', got %q", ip)
	}
}

func TestGetClientIP_WhitespaceInXFF(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Forwarded-For", "  203.0.113.195  ,  70.41.3.18  ")

	ip := svc.getClientIP(req)

	// Should trim whitespace
	if ip != "203.0.113.195" {
		t.Errorf("Expected trimmed IP '203.0.113.195', got %q", ip)
	}
}

// ============================================================================
// Tests for getVisitorKey
// ============================================================================

func TestGetVisitorKey_WithUserID(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	ctx := context.WithValue(req.Context(), "userID", "user-12345")
	req = req.WithContext(ctx)
	req.RemoteAddr = "192.0.2.1:12345"

	key := svc.getVisitorKey(req)

	// Should use userID, not IP
	if key != "user-12345" {
		t.Errorf("Expected 'user-12345', got %q", key)
	}
}

func TestGetVisitorKey_WithoutUserID(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:12345"

	key := svc.getVisitorKey(req)

	// Should fall back to IP
	if key != "192.0.2.1" {
		t.Errorf("Expected '192.0.2.1', got %q", key)
	}
}

func TestGetVisitorKey_EmptyUserID(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	ctx := context.WithValue(req.Context(), "userID", "")
	req = req.WithContext(ctx)
	req.RemoteAddr = "192.0.2.1:12345"

	key := svc.getVisitorKey(req)

	// Empty userID should fall back to IP
	if key != "192.0.2.1" {
		t.Errorf("Expected IP fallback '192.0.2.1', got %q", key)
	}
}

// ============================================================================
// Tests for RecordView
// ============================================================================

func TestRecordView_FirstView_Counted(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:12345"

	counted := svc.RecordView(1, req, "")

	if !counted {
		t.Error("Expected first view to be counted")
	}

	if svc.GetBufferedCount(1) != 1 {
		t.Errorf("Expected buffered count of 1, got %d", svc.GetBufferedCount(1))
	}
}

func TestRecordView_MultipleListings(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:12345"

	svc.RecordView(1, req, "")
	svc.RecordView(2, req, "")
	svc.RecordView(3, req, "")

	if svc.GetBufferedCount(1) != 1 {
		t.Errorf("Listing 1: expected 1, got %d", svc.GetBufferedCount(1))
	}
	if svc.GetBufferedCount(2) != 1 {
		t.Errorf("Listing 2: expected 1, got %d", svc.GetBufferedCount(2))
	}
	if svc.GetBufferedCount(3) != 1 {
		t.Errorf("Listing 3: expected 1, got %d", svc.GetBufferedCount(3))
	}
}

func TestRecordView_SellerViewsOwnListing_NotCounted(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	ctx := context.WithValue(req.Context(), "userID", "seller-123")
	req = req.WithContext(ctx)

	// Seller viewing their own listing
	counted := svc.RecordView(1, req, "seller-123")

	if counted {
		t.Error("Seller viewing own listing should NOT be counted")
	}

	if svc.GetBufferedCount(1) != 0 {
		t.Errorf("Expected 0 views for seller's own listing, got %d", svc.GetBufferedCount(1))
	}
}

func TestRecordView_OtherUserViewsListing_Counted(t *testing.T) {
	svc := NewViewCountService(nil)

	req := httptest.NewRequest("GET", "/", nil)
	ctx := context.WithValue(req.Context(), "userID", "buyer-456")
	req = req.WithContext(ctx)

	// Different user viewing listing
	counted := svc.RecordView(1, req, "seller-123")

	if !counted {
		t.Error("Other user viewing listing should be counted")
	}
}

func TestRecordView_DifferentVisitors_AllCounted(t *testing.T) {
	svc := NewViewCountService(nil)

	// Three different visitors view the same listing
	visitors := []string{"192.0.2.1", "192.0.2.2", "192.0.2.3"}

	for _, ip := range visitors {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = ip + ":12345"
		svc.RecordView(1, req, "")
	}

	if svc.GetBufferedCount(1) != 3 {
		t.Errorf("Expected 3 views from different visitors, got %d", svc.GetBufferedCount(1))
	}
}

// ============================================================================
// Tests for GetBufferedCount
// ============================================================================

func TestGetBufferedCount_NoViews(t *testing.T) {
	svc := NewViewCountService(nil)

	count := svc.GetBufferedCount(999)

	if count != 0 {
		t.Errorf("Expected 0 for unseen listing, got %d", count)
	}
}

func TestGetBufferedCount_MultipleViews(t *testing.T) {
	svc := NewViewCountService(nil)

	// Manually set buffer
	svc.bufMu.Lock()
	svc.buffer[1] = 5
	svc.buffer[2] = 10
	svc.bufMu.Unlock()

	if svc.GetBufferedCount(1) != 5 {
		t.Errorf("Expected 5, got %d", svc.GetBufferedCount(1))
	}
	if svc.GetBufferedCount(2) != 10 {
		t.Errorf("Expected 10, got %d", svc.GetBufferedCount(2))
	}
}

// ============================================================================
// Tests for cleanupOldSeen
// ============================================================================

func TestCleanupOldSeen_RemovesExpiredEntries(t *testing.T) {
	svc := NewViewCountService(nil)
	svc.debounceWindow = 1 * time.Hour

	// Add entries with different ages
	svc.seenMu.Lock()
	svc.seen["recent:1"] = time.Now().Add(-30 * time.Minute) // 30 min ago - should stay
	svc.seen["old:2"] = time.Now().Add(-2 * time.Hour)       // 2 hours ago - should be removed
	svc.seen["veryold:3"] = time.Now().Add(-24 * time.Hour)  // 24 hours ago - should be removed
	svc.seenMu.Unlock()

	svc.cleanupOldSeen()

	svc.seenMu.RLock()
	defer svc.seenMu.RUnlock()

	if _, exists := svc.seen["recent:1"]; !exists {
		t.Error("Recent entry should NOT be removed")
	}
	if _, exists := svc.seen["old:2"]; exists {
		t.Error("Old entry should be removed")
	}
	if _, exists := svc.seen["veryold:3"]; exists {
		t.Error("Very old entry should be removed")
	}
}

// ============================================================================
// Tests for debouncing behavior
// ============================================================================

func TestRecordView_Debouncing_WithinWindow(t *testing.T) {
	svc := NewViewCountService(nil)
	svc.debounceWindow = 1 * time.Hour

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:12345"

	// First view - should count
	first := svc.RecordView(1, req, "")
	if !first {
		t.Error("First view should be counted")
	}

	// Second view immediately after - should be debounced
	second := svc.RecordView(1, req, "")
	if second {
		t.Error("Second immediate view should be debounced")
	}

	// Should only have 1 view counted
	if svc.GetBufferedCount(1) != 1 {
		t.Errorf("Expected 1 view (debounced), got %d", svc.GetBufferedCount(1))
	}
}

func TestRecordView_DifferentListings_NotDebounced(t *testing.T) {
	svc := NewViewCountService(nil)
	svc.debounceWindow = 1 * time.Hour

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:12345"

	// Same visitor, different listings - all should count
	svc.RecordView(1, req, "")
	svc.RecordView(2, req, "")
	svc.RecordView(3, req, "")

	if svc.GetBufferedCount(1) != 1 {
		t.Errorf("Listing 1: expected 1, got %d", svc.GetBufferedCount(1))
	}
	if svc.GetBufferedCount(2) != 1 {
		t.Errorf("Listing 2: expected 1, got %d", svc.GetBufferedCount(2))
	}
	if svc.GetBufferedCount(3) != 1 {
		t.Errorf("Listing 3: expected 1, got %d", svc.GetBufferedCount(3))
	}
}
