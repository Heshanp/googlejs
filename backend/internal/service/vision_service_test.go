package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestParseVisionSearchResponse_ValidJSON(t *testing.T) {
	input := `{"query":"Apple iPhone 15 Pro","confidence":0.92,"keywords":["iphone","apple","smartphone"]}`

	result, err := parseVisionSearchResponse(input)
	if err != nil {
		t.Fatalf("parseVisionSearchResponse() unexpected error: %v", err)
	}

	if result.Query != "apple iphone 15 pro" {
		t.Fatalf("query = %q, want %q", result.Query, "apple iphone 15 pro")
	}
	if result.Confidence != 0.92 {
		t.Fatalf("confidence = %v, want %v", result.Confidence, 0.92)
	}
	if len(result.Keywords) != 3 {
		t.Fatalf("keywords length = %d, want 3", len(result.Keywords))
	}
}

func TestParseVisionSearchResponse_StripsMarkdownFence(t *testing.T) {
	input := "```json\n{\"query\":\"Toyota Corolla\",\"confidence\":0.7}\n```"

	result, err := parseVisionSearchResponse(input)
	if err != nil {
		t.Fatalf("parseVisionSearchResponse() unexpected error: %v", err)
	}
	if result.Query != "toyota corolla" {
		t.Fatalf("query = %q, want %q", result.Query, "toyota corolla")
	}
}

func TestParseVisionSearchResponse_FallsBackToKeywords(t *testing.T) {
	input := `{"query":"","confidence":1.4,"keywords":["wireless","noise cancelling","headphones","over-ear"]}`

	result, err := parseVisionSearchResponse(input)
	if err != nil {
		t.Fatalf("parseVisionSearchResponse() unexpected error: %v", err)
	}

	if result.Query != "wireless noise cancelling headphones" {
		t.Fatalf("query = %q, want %q", result.Query, "wireless noise cancelling headphones")
	}
	if result.Confidence != 1 {
		t.Fatalf("confidence = %v, want 1", result.Confidence)
	}
}

func TestParseVisionSearchResponse_MissingQueryAndKeywords(t *testing.T) {
	input := `{"query":"   ","keywords":[]}`

	if _, err := parseVisionSearchResponse(input); err == nil {
		t.Fatal("expected error for empty query with no keywords")
	}
}

func TestParseVisionSearchResponse_ExtractsEmbeddedJSONObject(t *testing.T) {
	input := "Here is the JSON response:\n{\"query\":\"Breville espresso machine\",\"confidence\":0.88}"

	result, err := parseVisionSearchResponse(input)
	if err != nil {
		t.Fatalf("parseVisionSearchResponse() unexpected error: %v", err)
	}
	if result.Query != "breville espresso machine" {
		t.Fatalf("query = %q, want %q", result.Query, "breville espresso machine")
	}
}

func TestParseVisionSearchResponse_ExtractsQueryFromSentence(t *testing.T) {
	input := "Here is the search query: Breville espresso machine"

	result, err := parseVisionSearchResponse(input)
	if err != nil {
		t.Fatalf("parseVisionSearchResponse() unexpected error: %v", err)
	}
	if result.Query != "breville espresso machine" {
		t.Fatalf("query = %q, want %q", result.Query, "breville espresso machine")
	}
}

func TestParseVisionSearchResponse_RejectsGenericTextOnlyQuery(t *testing.T) {
	input := "Here is"

	if _, err := parseVisionSearchResponse(input); err == nil {
		t.Fatal("expected error for unusable generic query")
	}
}

func TestParseVisionSearchResponse_DerivesQueryFromLooseText(t *testing.T) {
	input := "Based on the image, a good search query would be: Breville stainless steel espresso machine with grinder."

	result, err := parseVisionSearchResponse(input)
	if err != nil {
		t.Fatalf("parseVisionSearchResponse() unexpected error: %v", err)
	}
	if !strings.Contains(strings.ToLower(result.Query), "breville") {
		t.Fatalf("query = %q, expected to contain breville", result.Query)
	}
	if strings.Contains(strings.ToLower(result.Query), "here is") {
		t.Fatalf("query must not contain generic lead-in text: %q", result.Query)
	}
}

func TestAnalyzeImageForSearch_FallsBackWhenPrimaryQueryIsGeneric(t *testing.T) {
	var callCount atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if callCount.Add(1) == 1 {
			// First response mimics the bad lightweight output.
			_, _ = w.Write([]byte(`{
				"candidates":[{"content":{"parts":[{"text":"Here"}]}}]
			}`))
			return
		}

		// Second response mimics the proven listing-analysis output shape.
		_, _ = w.Write([]byte(`{
			"candidates":[{"content":{"parts":[{"text":"{\"title\":\"Breville Barista Express Espresso Machine with Grinder\",\"confidence\":0.93,\"category\":\"general\",\"suggestions\":{\"keywords\":[\"breville\",\"espresso machine\",\"grinder\"]}}"}]}}]
		}`))
	}))
	defer server.Close()

	svc := NewVisionService("test-key", "gemini-2.5-flash")
	svc.modelURL = server.URL
	svc.httpClient = server.Client()

	result, err := svc.AnalyzeImageForSearch(context.Background(), ImageData{
		Data:     "ZmFrZS1pbWFnZS1kYXRh",
		MimeType: "image/jpeg",
	})
	if err != nil {
		t.Fatalf("AnalyzeImageForSearch() unexpected error: %v", err)
	}

	if callCount.Load() != 2 {
		t.Fatalf("expected 2 Gemini calls (primary + fallback), got %d", callCount.Load())
	}
	if !strings.Contains(strings.ToLower(result.Query), "breville") {
		t.Fatalf("expected fallback query to contain brand, got %q", result.Query)
	}
	if strings.EqualFold(strings.TrimSpace(result.Query), "here") {
		t.Fatalf("generic query should never pass through fallback path: %q", result.Query)
	}
}

func TestNormalizeVisionSearchQuery_TruncatesAndNormalizesWhitespace(t *testing.T) {
	raw := "   Apple    MacBook     Pro    M3    16-inch    Space    Black   " + strings.Repeat("x", 120)
	result := normalizeVisionSearchQuery(raw)

	if strings.Contains(result, "  ") {
		t.Fatalf("query contains duplicate whitespace: %q", result)
	}
	if len(result) > 80 {
		t.Fatalf("query length = %d, want <= 80", len(result))
	}
}

func TestNormalizeVisionSearchKeywords_DedupesAndCaps(t *testing.T) {
	raw := []string{"Laptop", "laptop", "  ultrabook ", "workstation", "notebook", "portable computer", "extra"}

	result := normalizeVisionSearchKeywords(raw)
	if len(result) != 5 {
		t.Fatalf("len(result) = %d, want 5", len(result))
	}
	if result[0] != "laptop" {
		t.Fatalf("result[0] = %q, want %q", result[0], "laptop")
	}
}

func TestNormalizeVisionSearchQuery_DropsNonEssentialModifiers(t *testing.T) {
	raw := "Breville Barista Espresso Machine with Integrated Grinder Included"

	got := normalizeVisionSearchQuery(raw)
	want := "breville barista espresso machine grinder"
	if got != want {
		t.Fatalf("normalizeVisionSearchQuery(%q) = %q, want %q", raw, got, want)
	}
}

func TestDeriveVisionSearchQueryFromAnalysis_PrefersSuggestionsKeywords(t *testing.T) {
	analysis := &AnalysisResult{
		Title: "Breville Barista Express Espresso Machine with Grinder",
		Suggestions: &AnalysisSuggestions{
			Keywords:    []string{"Breville", "Espresso Machine", "Integrated", "Grinder"},
			SearchTerms: []string{"coffee machine"},
		},
	}

	got := deriveVisionSearchQueryFromAnalysis(analysis)
	if got != "breville espresso machine grinder" {
		t.Fatalf("deriveVisionSearchQueryFromAnalysis() = %q, want %q", got, "breville espresso machine grinder")
	}
}

func TestDeriveVisionSearchQueryFromAnalysis_FallsBackToSearchTermThenTitle(t *testing.T) {
	analysis := &AnalysisResult{
		Title: "Breville Barista Espresso Machine",
		Suggestions: &AnalysisSuggestions{
			Keywords:    []string{"with", "integrated", "included"},
			SearchTerms: []string{"espresso coffee machine"},
		},
	}

	got := deriveVisionSearchQueryFromAnalysis(analysis)
	if got != "espresso coffee machine" {
		t.Fatalf("deriveVisionSearchQueryFromAnalysis() = %q, want %q", got, "espresso coffee machine")
	}

	analysis.Suggestions = nil
	got = deriveVisionSearchQueryFromAnalysis(analysis)
	if got != "breville barista espresso machine" {
		t.Fatalf("deriveVisionSearchQueryFromAnalysis() title fallback = %q, want %q", got, "breville barista espresso machine")
	}
}
