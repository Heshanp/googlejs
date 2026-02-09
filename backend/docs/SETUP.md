# Justsell Monorepo Setup Guide

## Project Structure Created

```
justsell/
├── frontend/                          # Next.js Application
│   ├── src/                          # All your existing Next.js code
│   ├── package.json
│   ├── Dockerfile                    # Frontend Docker configuration
│   └── .env.example
│
├── backend/                          # Go API Server
│   ├── cmd/
│   │   └── api/
│   │       └── main.go              # Entry point (boilerplate)
│   │
│   ├── internal/
│   │   ├── api/
│   │   │   └── handler/             # HTTP request handlers
│   │   │       ├── health.go        # Health check endpoint
│   │   │       ├── search.go        # Search endpoint (TODO)
│   │   │       └── listings.go      # Listings endpoints (TODO)
│   │   │
│   │   ├── service/                 # Business logic layer
│   │   │   ├── search_service.go    # Search logic (TODO)
│   │   │   └── embedding_service.go # Gemini embeddings
│   │   │
│   │   ├── repository/              # Database layer
│   │   │   ├── listing_repo.go      # Listings CRUD (TODO)
│   │   │   └── vector_repo.go       # Vector search (TODO)
│   │   │
│   │   ├── parser/                  # Query parsing
│   │   │   ├── nlp_parser.go        # Pattern-based parser (TODO)
│   │   │   └── ai_parser.go         # LLM-based parser (TODO)
│   │   │
│   │   ├── models/                  # Data models
│   │   │   ├── listing.go           # Listing struct
│   │   │   └── filters.go           # Search filters struct
│   │   │
│   │   └── config/
│   │       └── config.go            # App configuration
│   │
│   ├── migrations/                   # Database migrations
│   │   ├── 001_create_listings.sql  # Create listings table
│   │   ├── 002_add_vector_extension.sql # Add pgvector
│   │   └── down/                    # Rollback migrations
│   │       ├── 001_drop_listings.sql
│   │       └── 002_drop_vector_extension.sql
│   │
│   ├── pkg/                         # Shared packages
│   │   ├── logger/                  # (empty - for future)
│   │   └── utils/                   # (empty - for future)
│   │
│   ├── scripts/                     # Helper scripts
│   │   └── (empty - for future seed/generation scripts)
│   │
│   ├── go.mod                       # Go dependencies
│   ├── Dockerfile                   # Backend Docker configuration
│   └── .env.example                 # Backend env template
│
├── docker-compose.yml               # Orchestrates all services
├── Makefile                         # Development commands
├── .gitignore                       # Updated for monorepo
├── .env.example                     # Root env template
└── README.md                        # Updated documentation
```

## What's Configured

### ✅ Monorepo Structure
- Frontend code moved to `frontend/` directory
- Backend skeleton created in `backend/` directory
- Clean separation of concerns

### ✅ Docker Setup
- PostgreSQL 16 with pgvector extension
- Backend service (Go API)
- Frontend service (Next.js)
- Network configuration for inter-service communication
- Volume persistence for database

### ✅ Database Migrations
- `001_create_listings.sql` - Creates listings table with full-text search
- `002_add_vector_extension.sql` - Enables pgvector and creates HNSW index
- Rollback migrations in `migrations/down/`

### ✅ Go Boilerplate
- Clean architecture with layers (handler → service → repository)
- Models for Listing and Filters
- Placeholder functions for all major components
- Health check endpoint ready to use

### ✅ Development Tools
- Makefile with helpful commands
- Environment variable templates
- Dockerfiles for containerization

## All Files Created (24 files)

**Configuration Files (7):**
- `.gitignore` (updated)
- `.env.example`
- `docker-compose.yml`
- `Makefile`
- `README.md` (updated)
- `backend/.env.example`
- `frontend/.env.example`

**Go Backend Files (13):**
- `backend/cmd/api/main.go`
- `backend/internal/config/config.go`
- `backend/internal/models/listing.go`
- `backend/internal/models/filters.go`
- `backend/internal/api/handler/health.go`
- `backend/internal/api/handler/search.go`
- `backend/internal/api/handler/listings.go`
- `backend/internal/parser/nlp_parser.go`
- `backend/internal/parser/ai_parser.go`
- `backend/internal/service/search_service.go`
- `backend/internal/service/embedding_service.go`
- `backend/internal/repository/listing_repo.go`
- `backend/internal/repository/vector_repo.go`

**Database Migrations (4):**
- `backend/migrations/001_create_listings.sql`
- `backend/migrations/002_add_vector_extension.sql`
- `backend/migrations/down/001_drop_listings.sql`
- `backend/migrations/down/002_drop_vector_extension.sql`

**Docker Files (2):**
- `backend/Dockerfile`
- `frontend/Dockerfile`

## Next Steps

### 1. Verify the Setup
```bash
cd /Users/heshanpathirana/Documents/Dev/Justsell/justsell
ls -la
ls -la backend/
ls -la frontend/
```

### 2. Test PostgreSQL
```bash
# Start PostgreSQL
make dev

# Check it's running
docker ps

# Connect to database
docker exec -it justsell-postgres psql -U postgres -d justsell
```

### 3. Run Migrations
```bash
make migrate-up
```

### 4. Test Frontend
```bash
cd frontend
npm install
npm run dev
# Should work at http://localhost:3000
```

### 5. Test Go Backend (once we implement it)
```bash
cd backend
go mod tidy
go run cmd/api/main.go
```

## What's NOT Implemented (marked with TODO)

All files are **boilerplate only**. You'll need to implement:

1. **Router** - HTTP routing logic
2. **Database Connection** - PostgreSQL connection pool
3. **NLP Parser** - Port from TypeScript
4. **AI Parser** - Gemini integration
5. **Embedding Service** - Generate vector embeddings
6. **Search Service** - Hybrid search logic
7. **Vector Repository** - pgvector queries
8. **Listing Repository** - CRUD operations
9. **Handlers** - Request/response logic

## Ready to Code!

The structure is ready. All folders exist. All boilerplate is in place.

You can now start implementing the actual logic without worrying about project structure.
