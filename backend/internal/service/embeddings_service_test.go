package service

import (
	"context"
	"strings"
	"testing"
)

func TestNormalizeEmbeddingModel(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "empty defaults",
			input:    "",
			expected: DefaultEmbeddingModel,
		},
		{
			name:     "bare stable model gets prefixed",
			input:    "gemini-embedding-001",
			expected: DefaultEmbeddingModel,
		},
		{
			name:     "prefixed stable model stays",
			input:    "models/gemini-embedding-001",
			expected: DefaultEmbeddingModel,
		},
		{
			name:     "future gemini embedding family is allowed",
			input:    "models/gemini-embedding-exp-03-07",
			expected: "models/gemini-embedding-exp-03-07",
		},
		{
			name:     "deprecated text embedding model is rejected",
			input:    "text-embedding-004",
			expected: DefaultEmbeddingModel,
		},
		{
			name:     "wrong model family is rejected",
			input:    "models/not-an-embedding-model",
			expected: DefaultEmbeddingModel,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, _ := normalizeEmbeddingModel(tt.input)
			if got != tt.expected {
				t.Fatalf("normalizeEmbeddingModel(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestNewEmbeddingsService_PrefersValidatedModel(t *testing.T) {
	svc := NewEmbeddingsService("dummy-key", "text-embedding-004")
	if svc.PreferredModel() != DefaultEmbeddingModel {
		t.Fatalf("PreferredModel() = %q, want %q", svc.PreferredModel(), DefaultEmbeddingModel)
	}
}

func TestStartupHealthCheck_NoAPIKeyFails(t *testing.T) {
	svc := NewEmbeddingsService("", "gemini-embedding-001")
	if err := svc.StartupHealthCheck(context.Background()); err == nil {
		t.Fatal("StartupHealthCheck() expected error with missing API key, got nil")
	}
}

func TestStartupHealthCheck_InvalidModelFailsFast(t *testing.T) {
	svc := NewEmbeddingsService("dummy-key", "text-embedding-004")
	err := svc.StartupHealthCheck(context.Background())
	if err == nil {
		t.Fatal("StartupHealthCheck() expected invalid model error, got nil")
	}
	if !strings.Contains(err.Error(), "invalid GEMINI_EMBEDDING_MODEL") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRedactAPIKey(t *testing.T) {
	raw := "request failed for key=abc123 and key abc123"
	got := redactAPIKey(raw, "abc123")
	if got == raw {
		t.Fatal("expected API key to be redacted")
	}
	if redactAPIKey(raw, "") != raw {
		t.Fatal("expected no-op redaction when apiKey is empty")
	}
}
