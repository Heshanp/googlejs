.PHONY: help dev up down logs clean migrate-up migrate-down backend-stop backend-run frontend-run db-shell db-status embeddings-preflight

BACKEND_PORT ?= 8080

help:
	@echo "Justsell Development Commands:"
	@echo ""
	@echo "  make dev          - Start development environment (DB + Backend + Frontend)"
	@echo "  make up           - Start all services with Docker Compose"
	@echo "  make down         - Stop all services"
	@echo "  make logs         - Show logs from all services"
	@echo "  make clean        - Clean up containers and volumes"
	@echo ""
	@echo "  make migrate-up   - Run database migrations"
	@echo "  make migrate-down - Rollback database migrations"
	@echo "  make db-shell     - Open PostgreSQL shell"
	@echo "  make db-status    - Check database connection and tables"
	@echo ""
	@echo "  make backend-run  - Run backend locally (without Docker)"
	@echo "  make backend-stop - Stop backend (frees :$(BACKEND_PORT))"
	@echo "  make frontend-run - Run frontend locally (without Docker)"
	@echo "  make embeddings-preflight - Validate Gemini embeddings config with a live probe"

dev:
	@echo "Starting PostgreSQL..."
	@command -v docker >/dev/null 2>&1 || { echo "Error: Docker is not installed. Please install Docker Desktop first."; exit 1; }
	docker compose up postgres -d
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo "PostgreSQL is ready!"
	@echo ""
	@echo "Run 'make backend-run' in another terminal to start the backend"
	@echo "Run 'make frontend-run' in another terminal to start the frontend"

up:
	@command -v docker >/dev/null 2>&1 || { echo "Error: Docker is not installed. Please install Docker Desktop first."; exit 1; }
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

clean:
	docker compose down -v
	rm -rf postgres_data

migrate-up:
	@echo "Running migrations..."
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/001_create_listings.sql
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/002_add_vector_extension.sql
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/002_create_listing_images.sql
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/003_update_embedding_dimensions.sql
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/004_create_users.sql
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/011_add_category_fields.sql
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/034_add_listing_public_id.sql
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/037_add_embedding_model_tracking.sql
	@echo "✅ Migrations complete!"

migrate-down:
	@echo "Rolling back migrations..."
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/down/002_drop_listing_images.sql
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/down/002_drop_vector_extension.sql
	@docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/down/001_drop_listings.sql
	@echo "✅ Rollback complete!"

backend-stop:
	@echo "🛑 Checking :$(BACKEND_PORT)..."
	@command -v lsof >/dev/null 2>&1 || { echo "Error: lsof is required to stop :$(BACKEND_PORT)"; exit 1; }
	@pids=$$(lsof -tiTCP:$(BACKEND_PORT) -sTCP:LISTEN 2>/dev/null); \
	if [ -z "$$pids" ]; then \
		echo "✓ :$(BACKEND_PORT) is free"; \
		exit 0; \
	fi; \
	echo "⚠ :$(BACKEND_PORT) is currently in use:"; \
	lsof -nP -iTCP:$(BACKEND_PORT) -sTCP:LISTEN || true; \
	cmds=$$(lsof -nP -iTCP:$(BACKEND_PORT) -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $$1}' | sort -u); \
	if echo "$$cmds" | grep -qi docker; then \
		echo "Hint: looks like Docker is using :$(BACKEND_PORT). Try: make down (or stop the container)."; \
	fi; \
	if echo "$$cmds" | grep -E -qv '^(main|api|go)$$' && [ "$${FORCE_KILL_PORT:-0}" != "1" ]; then \
		echo "Refusing to kill non-backend process(es) on :$(BACKEND_PORT)."; \
		echo "Stop them manually, or run: FORCE_KILL_PORT=1 make backend-stop"; \
		exit 1; \
	fi; \
	echo "Killing pid(s): $$pids"; \
	kill $$pids 2>/dev/null || true; \
	sleep 1; \
	pids2=$$(lsof -tiTCP:$(BACKEND_PORT) -sTCP:LISTEN 2>/dev/null); \
	if [ -n "$$pids2" ]; then \
		echo "Force killing remaining pid(s): $$pids2"; \
		kill -9 $$pids2 2>/dev/null || true; \
	fi

backend-run: backend-stop
	@echo "🚀 Starting backend..."
	cd backend && go run cmd/api/main.go

frontend-run:
	@echo "🛑 Stopping any running frontend..."
	@-pkill -f "next dev" 2>/dev/null || true
	@-rm -f frontend/.next/dev/lock 2>/dev/null || true
	@sleep 1
	@echo "🚀 Starting frontend..."
	cd frontend && npm run dev

db-shell:
	@docker compose exec postgres psql -U postgres -d justsell

db-status:
	@echo "📊 Database Status:"
	@docker compose exec postgres psql -U postgres -d justsell -c "\dt" || echo "❌ Database not running or tables not created yet"

backfill-embeddings:
	@echo "🔄 Running embeddings backfill script..."
	cd backend && go run cmd/backfill-embeddings/main.go

embeddings-preflight:
	@echo "🔍 Running embeddings preflight..."
	cd backend && ENV=production EMBEDDINGS_FAIL_FAST=true go run cmd/embeddings-preflight/main.go
