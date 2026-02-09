# Justsell API Endpoints

Base URL: `http://localhost:8080`

---

## Health Check

### GET /health
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "service": "justsell-api"
}
```

---

## Listings

### GET /api/listings
Get all active listings.

**Query Parameters:**
- `limit` (optional) - Number of listings to return (default: 20)

**Example:**
```bash
curl http://localhost:8080/api/listings
curl http://localhost:8080/api/listings?limit=50
```

**Response:**
```json
{
  "listings": [
    {
      "id": 1,
      "title": "Toyota Camry 2018",
      "description": "Reliable family car",
      "price": 18000,
      "category": "vehicles",
      "location": "Auckland",
      "make": "Toyota",
      "model": "Camry",
      "year": 2018,
      "odometer": 45000,
      "createdAt": "2025-12-26T10:30:00Z",
      "updatedAt": "2025-12-26T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /api/listings/:id
Get a specific listing by ID.

`:id` must be the listing `publicId` (UUID).

**Example:**
```bash
curl http://localhost:8080/api/listings/00000000-0000-0000-0000-000000000000
```

**Response:**
```json
{
  "id": 1,
  "publicId": "00000000-0000-0000-0000-000000000000",
  "title": "Toyota Camry 2018",
  "description": "Reliable family car",
  "price": 18000,
  "category": "vehicles",
  "location": "Auckland",
  "make": "Toyota",
  "model": "Camry",
  "year": 2018,
  "odometer": 45000,
  "createdAt": "2025-12-26T10:30:00Z",
  "updatedAt": "2025-12-26T10:30:00Z"
}
```

**Error Response (404):**
```
Listing not found
```

---

### POST /api/listings
Create a new listing.

**Request Body:**
```json
{
  "title": "Honda Civic 2020",
  "description": "Low mileage, one owner",
  "price": 22000,
  "category": "vehicles",
  "location": "Wellington",
  "make": "Honda",
  "model": "Civic",
  "year": 2020,
  "odometer": 15000
}
```

**Required Fields:**
- `title` - String
- `price` - Integer > 0

**Optional Fields:**
- `description` - String
- `category` - String
- `location` - String
- `make` - String (for vehicles)
- `model` - String (for vehicles)
- `year` - Integer (for vehicles)
- `odometer` - Integer (for vehicles)

**Example:**
```bash
curl -X POST http://localhost:8080/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Honda Civic 2020",
    "description": "Low mileage, one owner",
    "price": 22000,
    "category": "vehicles",
    "location": "Wellington",
    "make": "Honda",
    "model": "Civic",
    "year": 2020,
    "odometer": 15000
  }'
```

**Response (201 Created):**
```json
{
  "id": 2,
  "title": "Honda Civic 2020",
  "description": "Low mileage, one owner",
  "price": 22000,
  "category": "vehicles",
  "location": "Wellington",
  "make": "Honda",
  "model": "Civic",
  "year": 2020,
  "odometer": 15000,
  "createdAt": "2025-12-26T11:00:00Z",
  "updatedAt": "2025-12-26T11:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - "Invalid request body"
- `400 Bad Request` - "Title is required"
- `400 Bad Request` - "Price must be greater than 0"

---

### PUT /api/listings/:id
Update an existing listing.

**Request Body:**
```json
{
  "title": "Honda Civic 2020 - UPDATED",
  "description": "Low mileage, one owner, price reduced!",
  "price": 20000,
  "category": "vehicles",
  "location": "Wellington",
  "make": "Honda",
  "model": "Civic",
  "year": 2020,
  "odometer": 16000
}
```

**Example:**
```bash
curl -X PUT http://localhost:8080/api/listings/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Honda Civic 2020 - UPDATED",
    "description": "Low mileage, one owner, price reduced!",
    "price": 20000,
    "category": "vehicles",
    "location": "Wellington",
    "make": "Honda",
    "model": "Civic",
    "year": 2020,
    "odometer": 16000
  }'
```

**Response:**
```json
{
  "id": 2,
  "title": "Honda Civic 2020 - UPDATED",
  "description": "Low mileage, one owner, price reduced!",
  "price": 20000,
  "category": "vehicles",
  "location": "Wellington",
  "make": "Honda",
  "model": "Civic",
  "year": 2020,
  "odometer": 16000
}
```

**Error Responses:**
- `400 Bad Request` - "Invalid listing ID"
- `400 Bad Request` - "Invalid request body"
- `400 Bad Request` - "Title is required"
- `400 Bad Request` - "Price must be greater than 0"

---

### DELETE /api/listings/:id
Delete (soft delete) a listing.

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/listings/00000000-0000-0000-0000-000000000000
```

**Response:**
```json
{
  "message": "Listing deleted successfully",
  "id": 2
}
```

**Error Responses:**
- `400 Bad Request` - "Invalid listing ID"

**Note:** This is a soft delete. The listing's status is set to 'deleted' but the record remains in the database.

---

## Search

### POST /api/search
Search listings with natural language queries.

**Status:** Not yet implemented (returns 501 Not Implemented)

**Request Body:**
```json
{
  "query": "toyota camry 2015-2020 near auckland under $20k"
}
```

**Expected Response (when implemented):**
```json
{
  "listings": [...],
  "total": 15,
  "interpretedAs": "Make: Toyota · Model: Camry · Year: 2015-2020 · Location: Auckland · Max price: $20,000",
  "filters": {
    "make": "Toyota",
    "model": "Camry",
    "yearMin": 2015,
    "yearMax": 2020,
    "location": "Auckland",
    "priceMax": 20000
  }
}
```

---

## Testing with Your Frontend

Update your frontend API service to point to the Go backend:

```typescript
// frontend/src/services/api.config.ts
const API_BASE_URL = 'http://localhost:8080';

export const listingsAPI = {
  getAll: async (limit = 20) => {
    const response = await fetch(`${API_BASE_URL}/api/listings?limit=${limit}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/api/listings/${id}`);
    return response.json();
  },

  create: async (listing: any) => {
    const response = await fetch(`${API_BASE_URL}/api/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listing),
    });
    return response.json();
  },

  update: async (id: string, listing: any) => {
    const response = await fetch(`${API_BASE_URL}/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listing),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/api/listings/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },
};
```

---

## Complete Test Script

Save this as `test_api.sh`:

```bash
#!/bin/bash

API="http://localhost:8080"

echo "1. Health Check"
curl -s $API/health | jq
echo ""

echo "2. Create Listing #1"
curl -s -X POST $API/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Toyota Camry 2018",
    "description": "Reliable family car",
    "price": 18000,
    "category": "vehicles",
    "location": "Auckland",
    "make": "Toyota",
    "model": "Camry",
    "year": 2018,
    "odometer": 45000
  }' | jq
echo ""

echo "3. Create Listing #2"
curl -s -X POST $API/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Honda Civic 2020",
    "description": "Low mileage, one owner",
    "price": 22000,
    "category": "vehicles",
    "location": "Wellington",
    "make": "Honda",
    "model": "Civic",
    "year": 2020,
    "odometer": 15000
  }' | jq
echo ""

echo "4. Get All Listings"
curl -s $API/api/listings | jq
echo ""

LISTING_1_ID="<paste-public-id-from-create-response>"
LISTING_2_ID="<paste-public-id-from-create-response>"

echo "5. Get Listing by ID"
curl -s $API/api/listings/$LISTING_1_ID | jq
echo ""

echo "6. Update Listing"
curl -s -X PUT $API/api/listings/$LISTING_1_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Toyota Camry 2018 - PRICE REDUCED",
    "description": "Reliable family car, price reduced!",
    "price": 16000,
    "category": "vehicles",
    "location": "Auckland",
    "make": "Toyota",
    "model": "Camry",
    "year": 2018,
    "odometer": 46000
  }' | jq
echo ""

echo "7. Delete Listing"
curl -s -X DELETE $API/api/listings/$LISTING_2_ID | jq
echo ""

echo "8. Get All Listings (after delete)"
curl -s $API/api/listings | jq
```

Run with: `chmod +x test_api.sh && ./test_api.sh`

---

## Status Summary

✅ **Implemented:**
- GET /health
- GET /api/listings
- GET /api/listings/:id
- POST /api/listings
- PUT /api/listings/:id
- DELETE /api/listings/:id

⏳ **Not Implemented:**
- POST /api/search (needs NLP parser + Gemini embeddings)

---

## CORS Configuration

The API allows requests from:
- `http://localhost:3000` (Next.js frontend)

Allowed methods:
- GET, POST, PUT, DELETE, OPTIONS

Allowed headers:
- Content-Type, Authorization
