package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
)

func TestBuildContentFingerprint_OrderInsensitiveImages(t *testing.T) {
	first := BuildContentFingerprint(
		"Used iPhone 15",
		"Great condition with charger.",
		[]string{"https://cdn.example.com/b.jpg", "https://cdn.example.com/a.jpg"},
	)
	second := BuildContentFingerprint(
		"used iphone 15",
		"Great   condition with   charger.",
		[]string{"https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"},
	)

	if first != second {
		t.Fatalf("expected stable fingerprint for same content, got %q and %q", first, second)
	}
}

func TestBuildContentFingerprint_ChangesOnContentChange(t *testing.T) {
	base := BuildContentFingerprint("Item", "desc", []string{"a"})
	changed := BuildContentFingerprint("Item", "desc updated", []string{"a"})
	if base == changed {
		t.Fatal("expected fingerprint to change when content changes")
	}
}

func TestParseModerationResponse_Clean(t *testing.T) {
	raw := `{
	  "decision": "clean",
	  "severity": "clean",
	  "flag_profile": false,
	  "violations": [],
	  "summary": "No policy violations detected."
	}`

	result, err := parseModerationResponse(raw)
	if err != nil {
		t.Fatalf("parseModerationResponse returned error: %v", err)
	}
	if result.Decision != models.ModerationDecisionClean {
		t.Fatalf("expected clean decision, got %s", result.Decision)
	}
	if result.Severity != models.ModerationSeverityClean {
		t.Fatalf("expected clean severity, got %s", result.Severity)
	}
	if len(result.Violations) != 0 {
		t.Fatalf("expected no violations for clean result")
	}
}

func TestParseModerationResponse_FlaggedWithCodeFence(t *testing.T) {
	raw := "```json\n{\n  \"decision\": \"flagged\",\n  \"severity\": \"critical\",\n  \"flag_profile\": false,\n  \"violations\": [{\n    \"code\": \"illegal_weapon\",\n    \"category\": \"weapons\",\n    \"severity\": \"critical\",\n    \"reason\": \"Assault weapon detected\"\n  }],\n  \"summary\": \"Illegal weapon listing\"\n}\n```"

	result, err := parseModerationResponse(raw)
	if err != nil {
		t.Fatalf("parseModerationResponse returned error: %v", err)
	}
	if result.Decision != models.ModerationDecisionFlagged {
		t.Fatalf("expected flagged decision, got %s", result.Decision)
	}
	if result.Severity != models.ModerationSeverityCritical {
		t.Fatalf("expected critical severity, got %s", result.Severity)
	}
	if !result.FlagProfile {
		t.Fatalf("critical severity should force profile flagging")
	}
	if len(result.Violations) != 1 {
		t.Fatalf("expected one violation, got %d", len(result.Violations))
	}
}

func TestParseModerationResponse_InvalidJSON(t *testing.T) {
	if _, err := parseModerationResponse("not-json"); err == nil {
		t.Fatal("expected parseModerationResponse to fail on invalid JSON")
	}
}

func TestFallbackModerationResult(t *testing.T) {
	result := fallbackModerationResult("manual review")
	if result.Decision != models.ModerationDecisionReviewNeeded {
		t.Fatalf("expected review_required decision, got %s", result.Decision)
	}
	if !result.IsBlocking() {
		t.Fatal("review_needed should block publication")
	}
}

func TestBuildGeminiRequest_BoundedParallelImageFetch(t *testing.T) {
	var inFlight atomic.Int64
	var maxInFlight atomic.Int64

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		current := inFlight.Add(1)
		for {
			prev := maxInFlight.Load()
			if current <= prev || maxInFlight.CompareAndSwap(prev, current) {
				break
			}
		}
		defer inFlight.Add(-1)

		time.Sleep(50 * time.Millisecond)
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("image"))
	}))
	defer server.Close()

	service := NewModerationService("key", "gemini")
	service.httpClient = server.Client()
	service.ConfigureImageFetch(2, 2*time.Second)

	urls := []string{
		server.URL + "/1",
		server.URL + "/2",
		server.URL + "/3",
		server.URL + "/4",
		server.URL + "/5",
	}

	req, stats, err := service.buildGeminiRequest(context.Background(), ModerationInput{
		Title:       "title",
		Description: "description",
		ImageURLs:   urls,
	})
	if err != nil {
		t.Fatalf("buildGeminiRequest returned error: %v", err)
	}
	if stats.Considered != len(urls) {
		t.Fatalf("expected %d considered images, got %d", len(urls), stats.Considered)
	}
	if stats.Successful != len(urls) {
		t.Fatalf("expected %d successful images, got %d", len(urls), stats.Successful)
	}
	if got, want := len(req.Contents[0].Parts), 1+len(urls); got != want {
		t.Fatalf("expected %d parts, got %d", want, got)
	}
	if got := maxInFlight.Load(); got > 2 {
		t.Fatalf("expected max in-flight <= 2, got %d", got)
	}
}

func TestBuildGeminiRequest_PreservesImageOrder(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/img/")
		switch id {
		case "3":
			time.Sleep(70 * time.Millisecond)
		case "1":
			time.Sleep(10 * time.Millisecond)
		default:
			time.Sleep(20 * time.Millisecond)
		}
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write([]byte("img-" + id))
	}))
	defer server.Close()

	service := NewModerationService("key", "gemini")
	service.httpClient = server.Client()
	service.ConfigureImageFetch(3, 2*time.Second)

	urls := []string{
		server.URL + "/img/3",
		server.URL + "/img/1",
		server.URL + "/img/2",
	}

	req, stats, err := service.buildGeminiRequest(context.Background(), ModerationInput{
		Title:       "title",
		Description: "description",
		ImageURLs:   urls,
	})
	if err != nil {
		t.Fatalf("buildGeminiRequest returned error: %v", err)
	}
	if stats.Successful != 3 {
		t.Fatalf("expected 3 successful images, got %d", stats.Successful)
	}

	expected := []string{"img-3", "img-1", "img-2"}
	parts := req.Contents[0].Parts[1:]
	for i, p := range parts {
		if p.InlineData == nil {
			t.Fatalf("part %d missing inline data", i)
		}
		decoded, err := base64.StdEncoding.DecodeString(p.InlineData.Data)
		if err != nil {
			t.Fatalf("failed decoding base64 for part %d: %v", i, err)
		}
		if string(decoded) != expected[i] {
			t.Fatalf("expected part %d payload %q, got %q", i, expected[i], string(decoded))
		}
	}
}

func TestBuildGeminiRequest_RetriesTransientFailureOnce(t *testing.T) {
	var requests atomic.Int64

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		call := requests.Add(1)
		if call == 1 {
			http.Error(w, "temporary", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("image"))
	}))
	defer server.Close()

	service := NewModerationService("key", "gemini")
	service.httpClient = server.Client()
	service.ConfigureImageFetch(1, 2*time.Second)

	req, stats, err := service.buildGeminiRequest(context.Background(), ModerationInput{
		Title:       "title",
		Description: "description",
		ImageURLs:   []string{server.URL + "/img"},
	})
	if err != nil {
		t.Fatalf("buildGeminiRequest returned error: %v", err)
	}
	if requests.Load() != 2 {
		t.Fatalf("expected 2 requests (1 retry), got %d", requests.Load())
	}
	if stats.Successful != 1 {
		t.Fatalf("expected 1 successful image, got %d", stats.Successful)
	}
	if got, want := len(req.Contents[0].Parts), 2; got != want {
		t.Fatalf("expected %d parts, got %d", want, got)
	}
}

func TestBuildGeminiRequest_DoesNotRetryPermanentFailure(t *testing.T) {
	var requests atomic.Int64

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		http.NotFound(w, r)
	}))
	defer server.Close()

	service := NewModerationService("key", "gemini")
	service.httpClient = server.Client()
	service.ConfigureImageFetch(1, 2*time.Second)

	req, stats, err := service.buildGeminiRequest(context.Background(), ModerationInput{
		Title:       "title",
		Description: "description",
		ImageURLs:   []string{server.URL + "/img"},
	})
	if err != nil {
		t.Fatalf("buildGeminiRequest returned error: %v", err)
	}
	if requests.Load() != 1 {
		t.Fatalf("expected 1 request (no retry), got %d", requests.Load())
	}
	if stats.Successful != 0 {
		t.Fatalf("expected 0 successful images, got %d", stats.Successful)
	}
	if got, want := len(req.Contents[0].Parts), 1; got != want {
		t.Fatalf("expected %d parts, got %d", want, got)
	}
}

func TestModerateListing_MajorityPassCallsGemini(t *testing.T) {
	var geminiCalls atomic.Int64

	mux := http.NewServeMux()
	mux.HandleFunc("/img/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/bad") {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("img"))
	})
	mux.HandleFunc("/gemini", func(w http.ResponseWriter, _ *http.Request) {
		geminiCalls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"candidates": []any{
				map[string]any{
					"content": map[string]any{
						"parts": []any{
							map[string]any{
								"text": `{"decision":"clean","severity":"clean","flag_profile":false,"violations":[],"summary":"clean"}`,
							},
						},
					},
				},
			},
		})
	})

	server := httptest.NewServer(mux)
	defer server.Close()

	service := NewModerationService("key", "gemini")
	service.httpClient = server.Client()
	service.modelURL = server.URL + "/gemini"
	service.ConfigureImageFetch(3, 2*time.Second)

	result, err := service.ModerateListing(context.Background(), ModerationInput{
		Title:       "title",
		Description: "description",
		ImageURLs: []string{
			server.URL + "/img/good-1",
			server.URL + "/img/bad",
			server.URL + "/img/good-2",
		},
	})
	if err != nil {
		t.Fatalf("ModerateListing returned error: %v", err)
	}
	if result.Decision != models.ModerationDecisionClean {
		t.Fatalf("expected clean decision, got %s", result.Decision)
	}
	if geminiCalls.Load() != 1 {
		t.Fatalf("expected 1 Gemini call, got %d", geminiCalls.Load())
	}
}

func TestModerateListing_MajorityFailSkipsGemini(t *testing.T) {
	var geminiCalls atomic.Int64

	mux := http.NewServeMux()
	mux.HandleFunc("/img/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/good") {
			w.Header().Set("Content-Type", "image/jpeg")
			_, _ = w.Write([]byte("img"))
			return
		}
		http.NotFound(w, r)
	})
	mux.HandleFunc("/gemini", func(w http.ResponseWriter, _ *http.Request) {
		geminiCalls.Add(1)
		w.WriteHeader(http.StatusOK)
	})

	server := httptest.NewServer(mux)
	defer server.Close()

	service := NewModerationService("key", "gemini")
	service.httpClient = server.Client()
	service.modelURL = server.URL + "/gemini"
	service.ConfigureImageFetch(3, 2*time.Second)

	result, err := service.ModerateListing(context.Background(), ModerationInput{
		Title:       "title",
		Description: "description",
		ImageURLs: []string{
			server.URL + "/img/bad-1",
			server.URL + "/img/good",
			server.URL + "/img/bad-2",
		},
	})
	if err != nil {
		t.Fatalf("ModerateListing returned error: %v", err)
	}
	if result.Decision != models.ModerationDecisionReviewNeeded {
		t.Fatalf("expected review-needed decision, got %s", result.Decision)
	}
	if result.Source != "image_coverage_gate" {
		t.Fatalf("expected source image_coverage_gate, got %s", result.Source)
	}
	if !strings.Contains(result.Summary, "manual review") {
		t.Fatalf("expected manual review summary, got %q", result.Summary)
	}
	if geminiCalls.Load() != 0 {
		t.Fatalf("expected 0 Gemini calls, got %d", geminiCalls.Load())
	}
}

func TestBuildGeminiRequest_TimeoutRetryExitsPromptly(t *testing.T) {
	var requests atomic.Int64

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		time.Sleep(150 * time.Millisecond)
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("img"))
	}))
	defer server.Close()

	service := NewModerationService("key", "gemini")
	service.httpClient = server.Client()
	service.ConfigureImageFetch(1, 40*time.Millisecond)

	start := time.Now()
	req, stats, err := service.buildGeminiRequest(context.Background(), ModerationInput{
		Title:       "title",
		Description: "description",
		ImageURLs:   []string{server.URL + "/img"},
	})
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("buildGeminiRequest returned error: %v", err)
	}
	if requests.Load() != 2 {
		t.Fatalf("expected 2 timed-out requests, got %d", requests.Load())
	}
	if stats.Successful != 0 {
		t.Fatalf("expected 0 successful images, got %d", stats.Successful)
	}
	if got, want := len(req.Contents[0].Parts), 1; got != want {
		t.Fatalf("expected %d parts, got %d", want, got)
	}
	if elapsed > 450*time.Millisecond {
		t.Fatalf("expected timeout path to finish promptly, took %s", elapsed)
	}
}
