#!/bin/bash

# =============================================================================
# Database Bootstrap Script for Justsell
# =============================================================================

# Database credentials - UPDATE THESE
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="justsell"
DB_USER="justsell"
DB_PASSWORD="your_password_here"

# SSL mode: "disable" for local, "require" for production
DB_SSLMODE="disable"

# =============================================================================
# DO NOT EDIT BELOW THIS LINE
# =============================================================================

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "Justsell Database Bootstrap"
echo "========================================"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Database: ${DB_NAME}"
echo "User: ${DB_USER}"
echo "========================================"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed"
    echo "   Install with: brew install libpq && brew link --force libpq"
    exit 1
fi

# Test connection
echo "Testing database connection..."
if ! psql "${DATABASE_URL}" -c "SELECT 1" &> /dev/null; then
    echo "❌ Error: Could not connect to database"
    echo "   Check your credentials and ensure the database exists"
    exit 1
fi
echo "✓ Connection successful"
echo ""

# Enable pgvector extension
echo "Enabling pgvector extension..."
psql "${DATABASE_URL}" -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null
echo "✓ pgvector enabled"
echo ""

# Run migrations in order
echo "Running migrations..."
echo ""

MIGRATION_COUNT=0
FAILED_COUNT=0

for migration in "${SCRIPT_DIR}"/*.sql; do
    filename=$(basename "$migration")
    echo -n "  ${filename}... "

    if psql "${DATABASE_URL}" -f "$migration" &> /dev/null; then
        echo "✓"
        ((MIGRATION_COUNT++))
    else
        echo "⚠ (may already exist or has errors)"
        ((FAILED_COUNT++))
    fi
done

echo ""
echo "========================================"
echo "Bootstrap complete!"
echo "  Migrations run: ${MIGRATION_COUNT}"
echo "  Warnings: ${FAILED_COUNT}"
echo "========================================"
