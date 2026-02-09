#!/bin/bash

# Integration Test Script
# Tests the complete frontend → backend flow

API="http://localhost:8080"
echo "🧪 Testing Justsell Frontend ↔ Backend Integration"
echo "=================================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check"
HEALTH=$(curl -s $API/health)
echo "Response: $HEALTH"
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is not responding"
    exit 1
fi
echo ""

# Test 2: Create a listing
echo "2️⃣  Create Listing"
CREATE_RESPONSE=$(curl -s -X POST $API/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Integration Test - Toyota Camry 2020",
    "description": "This is a test listing created via integration test",
    "price": 25000,
    "category": "vehicles",
    "location": "Auckland",
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "odometer": 35000
  }')

LISTING_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "Response: $CREATE_RESPONSE"
if [ -n "$LISTING_ID" ]; then
    echo "✅ Listing created with ID: $LISTING_ID"
else
    echo "❌ Failed to create listing"
    exit 1
fi
echo ""

# Test 3: Get all listings
echo "3️⃣  Get All Listings"
LISTINGS=$(curl -s $API/api/listings)
TOTAL=$(echo "$LISTINGS" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
echo "Total listings: $TOTAL"
if [ "$TOTAL" -gt 0 ]; then
    echo "✅ Successfully retrieved $TOTAL listing(s)"
else
    echo "❌ No listings found"
fi
echo ""

# Test 4: Get listing by ID
echo "4️⃣  Get Listing by ID ($LISTING_ID)"
SINGLE_LISTING=$(curl -s $API/api/listings/$LISTING_ID)
echo "Response: $SINGLE_LISTING"
if echo "$SINGLE_LISTING" | grep -q "Toyota Camry 2020"; then
    echo "✅ Successfully retrieved listing"
else
    echo "❌ Failed to retrieve listing"
fi
echo ""

# Test 5: Update listing
echo "5️⃣  Update Listing"
UPDATE_RESPONSE=$(curl -s -X PUT $API/api/listings/$LISTING_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Integration Test - Toyota Camry 2020 - UPDATED",
    "description": "Price reduced! This is an updated test listing",
    "price": 23000,
    "category": "vehicles",
    "location": "Auckland",
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "odometer": 36000
  }')

echo "Response: $UPDATE_RESPONSE"
if echo "$UPDATE_RESPONSE" | grep -q "UPDATED"; then
    echo "✅ Listing updated successfully"
else
    echo "❌ Failed to update listing"
fi
echo ""

# Test 6: Delete listing
echo "6️⃣  Delete Listing"
DELETE_RESPONSE=$(curl -s -X DELETE $API/api/listings/$LISTING_ID)
echo "Response: $DELETE_RESPONSE"
if echo "$DELETE_RESPONSE" | grep -q "deleted successfully"; then
    echo "✅ Listing deleted successfully"
else
    echo "❌ Failed to delete listing"
fi
echo ""

echo "=================================================="
echo "🎉 Integration Test Complete!"
echo ""
echo "Next steps:"
echo "1. Start frontend: cd frontend && npm run dev"
echo "2. Open http://localhost:3000"
echo "3. Check console for: '🔧 API Mode: REAL BACKEND (Go API)'"
echo "4. Try creating a listing via the app!"
