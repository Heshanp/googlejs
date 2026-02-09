package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds application configuration
type Config struct {
	Port                            string
	DatabaseURL                     string
	GeminiKey                       string
	GeminiModel                     string // e.g. "gemini-3-flash-preview" or "gemini-2.5-flash"
	GeminiImageModel                string // e.g. "gemini-2.5-flash-image"
	GeminiEmbeddingModel            string // e.g. "gemini-embedding-001"
	SearchAnchorMatchRatio          float64
	EmbeddingsFailFast              bool
	Environment                     string
	GoogleClientID                  string
	JWTSecret                       string
	ModerationCacheTTLMinutes       int
	ModerationImageFetchConcurrency int
	ModerationImageFetchTimeoutMS   int
	PublishIdempotencyTTLHours      int
	ViolationFlagThreshold          int
	PublishRateLimitPerUser         int
	PublishRateLimitPerIP           int
	PublishRateLimitWindowSec       int
	ImageGenRateLimitBurst          int
	ImageGenRateLimitRefillMS       int
	AdminEmails                     string
}

// Load loads configuration from environment variables
func Load() *Config {
	environment := getEnv("ENV", "development")
	defaultEmbeddingsFailFast := strings.EqualFold(environment, "production")

	return &Config{
		Port:                            getEnv("PORT", "8080"),
		DatabaseURL:                     getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/justsell?sslmode=disable"),
		GeminiKey:                       getEnv("GEMINI_API_KEY", ""),
		GeminiModel:                     getEnv("GEMINI_MODEL", "gemini-3-flash-preview"),
		GeminiImageModel:                getEnv("GEMINI_IMAGE_MODEL", ""),
		GeminiEmbeddingModel:            getEnv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"),
		SearchAnchorMatchRatio:          getEnvFloat("SEARCH_ANCHOR_MATCH_RATIO", 0.60),
		EmbeddingsFailFast:              getEnvBool("EMBEDDINGS_FAIL_FAST", defaultEmbeddingsFailFast),
		Environment:                     environment,
		GoogleClientID:                  getEnv("GOOGLE_CLIENT_ID", ""),
		JWTSecret:                       getEnv("JWT_SECRET", "justsell-dev-secret-change-in-production"),
		ModerationCacheTTLMinutes:       getEnvInt("MODERATION_CACHE_TTL_MINUTES", 120),
		ModerationImageFetchConcurrency: getEnvInt("MODERATION_IMAGE_FETCH_CONCURRENCY", 3),
		ModerationImageFetchTimeoutMS:   getEnvInt("MODERATION_IMAGE_FETCH_TIMEOUT_MS", 5000),
		PublishIdempotencyTTLHours:      getEnvInt("PUBLISH_IDEMPOTENCY_TTL_HOURS", 24),
		ViolationFlagThreshold:          getEnvInt("VIOLATION_FLAG_THRESHOLD", 3),
		PublishRateLimitPerUser:         getEnvInt("PUBLISH_RATE_LIMIT_PER_USER", 10),
		PublishRateLimitPerIP:           getEnvInt("PUBLISH_RATE_LIMIT_PER_IP", 30),
		PublishRateLimitWindowSec:       getEnvInt("PUBLISH_RATE_LIMIT_WINDOW_SECONDS", 60),
		ImageGenRateLimitBurst:          getEnvInt("IMAGE_GEN_RATE_LIMIT_BURST", 5),
		ImageGenRateLimitRefillMS:       getEnvInt("IMAGE_GEN_RATE_LIMIT_REFILL_MS", 10000),
		AdminEmails:                     getEnv("ADMIN_EMAILS", ""),
	}
}

// getEnv gets an environment variable with a fallback default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return defaultValue
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func getEnvFloat(key string, defaultValue float64) float64 {
	raw := os.Getenv(key)
	if raw == "" {
		return defaultValue
	}
	parsed, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func getEnvBool(key string, defaultValue bool) bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if raw == "" {
		return defaultValue
	}
	switch raw {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return defaultValue
	}
}
