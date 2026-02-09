# Justsell - The Google of Marketplaces

An AI-powered marketplace platform with natural language search capabilities.

## Tech Stack

### Frontend
- **Framework**: Next.js 16 + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Custom component library

### Backend
- **Language**: Go 1.23
- **Database**: PostgreSQL 16 with pgvector extension
- **Vector Search**: pgvector (HNSW indexing)
- **AI Services**: Google Gemini API (embeddings + parsing)

## Project Structure

```
justsell/
├── frontend/              # Next.js application
│   ├── src/
│   ├── package.json
│   └── ...
│
├── backend/               # Go API server
│   ├── cmd/api/          # Application entry point
│   ├── internal/         # Internal packages
│   │   ├── api/         # HTTP handlers & routing
│   │   ├── service/     # Business logic
│   │   ├── repository/  # Database layer
│   │   ├── parser/      # NLP query parsing
│   │   ├── models/      # Data models
│   │   └── config/      # Configuration
│   ├── migrations/      # Database migrations
│   └── go.mod
│
├── docker-compose.yml    # Docker orchestration
├── Makefile             # Development commands
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** 20+
- **Go** 1.23+
- **Docker** and Docker Compose
- **PostgreSQL** 16+ (or use Docker)
- **Gemini API Key**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd justsell
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

3. **Start PostgreSQL with pgvector**
   ```bash
   make dev
   ```

4. **Run database migrations**
   ```bash
   make migrate-up
   ```

5. **Start the backend** (in a new terminal)
   ```bash
   make backend-run
   ```

6. **Start the frontend** (in another terminal)
   ```bash
   make frontend-run
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Health Check: http://localhost:8080/health

### Using Docker Compose

To run everything with Docker:

```bash
# Start all services
make up

# View logs
make logs

# Stop all services
make down

# Clean up (removes volumes)
make clean
```

## Development

### Available Make Commands

```bash
make help          # Show all available commands
make dev           # Start development environment
make up            # Start all Docker services
make down          # Stop all Docker services
make logs          # Show service logs
make clean         # Clean up containers and volumes
make migrate-up    # Run database migrations
make migrate-down  # Rollback migrations
make backend-run   # Run backend locally
make frontend-run  # Run frontend locally
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

### Backend Development

```bash
cd backend
go mod tidy
go run cmd/api/main.go
```

The backend API will be available at http://localhost:8080

## Features

### Natural Language Search
Search using natural language queries:
- "Find me a Toyota Camry 2015-2020 near Auckland under 50k miles"
- "Vintage cameras in excellent condition"
- "Reliable family car under $20k"

### AI-Powered
- **Semantic Search**: Vector embeddings for understanding intent
- **Smart Parsing**: AI-powered query parsing with fallback to pattern matching
- **Hybrid Search**: Combines vector similarity + keyword matching + filters

### Vector Database
- PostgreSQL with pgvector extension
- HNSW indexing for fast similarity search
- Sub-100ms search latency

## API Endpoints

### Health Check
```
GET /health
```

### Search
```
POST /api/search
Body: { "query": "your search query" }
```

### Listings
```
GET /api/listings
POST /api/listings
```

## Database Schema

See `backend/migrations/` for the complete schema.

Key tables:
- `listings` - Main listings table with full-text search and vector embeddings

## Environment Variables

### Root `.env`
- `GEMINI_API_KEY` - Your Gemini API key
- `GEMINI_IMAGE_MODEL` - Gemini image model ID for listing backdrop generation (Nano Banana Pro compatible)

### Backend `.env`
- `PORT` - Server port (default: 8080)
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Gemini API key for embeddings
- `GEMINI_IMAGE_MODEL` - Gemini image generation model (falls back to `GEMINI_MODEL` when empty)
- `SEARCH_ANCHOR_MATCH_RATIO` - Required anchor token match ratio for keyword retrieval (default: `0.60`)
- `ENV` - Environment (development/production)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is proprietary and confidential.

Copyright (c) 2026 Heshan Pathirana. All rights reserved.

No permission is granted to use, copy, modify, merge, publish, distribute, sublicense, create derivative works from, or commercially exploit this code without prior explicit written permission from the original author.
