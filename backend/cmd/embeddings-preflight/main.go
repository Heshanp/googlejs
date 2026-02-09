package main

import (
	"context"
	"log"
	"time"

	"github.com/yourusername/justsell/backend/internal/config"
	"github.com/yourusername/justsell/backend/internal/service"

	"github.com/joho/godotenv"
)

func main() {
	log.Println("🔍 Embeddings preflight check")

	// Load .env file from backend directory when available.
	_ = godotenv.Load()

	cfg := config.Load()
	if cfg.GeminiKey == "" {
		log.Fatal("❌ GEMINI_API_KEY is required for embeddings preflight")
	}

	embeddingsService := service.NewEmbeddingsService(cfg.GeminiKey, cfg.GeminiEmbeddingModel)
	log.Printf("ℹ️  Checking embedding model: %s", embeddingsService.PreferredModel())

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	if err := embeddingsService.StartupHealthCheck(ctx); err != nil {
		log.Fatalf("❌ Embeddings preflight failed: %v", err)
	}

	log.Println("✅ Embeddings preflight passed")
}
