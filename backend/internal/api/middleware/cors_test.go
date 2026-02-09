package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCORSPreflightAllowsIdempotencyKeyHeader(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "http://localhost:3000")

	h := CORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("preflight should return before next handler")
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/listings", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("Access-Control-Request-Method", http.MethodPost)
	req.Header.Set("Access-Control-Request-Headers", "content-type,authorization,idempotency-key")

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected %d, got %d", http.StatusOK, rr.Code)
	}

	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Fatalf("expected allowed origin to be set, got %q", got)
	}

	allowedHeaders := strings.ToLower(rr.Header().Get("Access-Control-Allow-Headers"))
	if !strings.Contains(allowedHeaders, "idempotency-key") {
		t.Fatalf("expected idempotency-key in Access-Control-Allow-Headers, got %q", allowedHeaders)
	}
}
