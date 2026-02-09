package service

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestPublishGuardAllow_UserLimit(t *testing.T) {
	guard := NewPublishGuard(2, 10, time.Minute)
	userID := "user-1"
	ip := "127.0.0.1"

	if !guard.Allow(userID, ip) {
		t.Fatal("first request should be allowed")
	}
	if !guard.Allow(userID, ip) {
		t.Fatal("second request should be allowed")
	}
	if guard.Allow(userID, ip) {
		t.Fatal("third request should be blocked by user limit")
	}
}

func TestPublishGuardAllow_IPLimit(t *testing.T) {
	guard := NewPublishGuard(10, 1, time.Minute)
	ip := "10.0.0.1"

	if !guard.Allow("user-1", ip) {
		t.Fatal("first request should be allowed")
	}
	if guard.Allow("user-2", ip) {
		t.Fatal("second request should be blocked by shared IP limit")
	}
}

func TestExtractClientIP(t *testing.T) {
	req := httptest.NewRequest("GET", "http://localhost", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.10, 203.0.113.11")

	ip := ExtractClientIP(req)
	if ip != "203.0.113.10" {
		t.Fatalf("expected forwarded IP, got %q", ip)
	}
}
