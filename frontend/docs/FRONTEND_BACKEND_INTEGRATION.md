# Frontend ↔ Backend Integration Guide

## 🔌 API Connection Status

The frontend is now **wired to the Go backend API** at `http://localhost:8080`.

### Configuration

Edit `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Create `.env.local` if it doesn't exist:

```bash
cd frontend
cp .env.example .env.local
```

---

## 🚀 Testing the Integration

### Step 1: Start the Backend

```bash
# Terminal 1: Start PostgreSQL
make dev

# Terminal 2: Start Go API
make backend-run
```

Expected output:
```
✅ Database connected
✅ Repositories initialized
Starting server on http://localhost:8080
```

### Step 2: Start the Frontend

```bash
# Terminal 3: Start Next.js
cd frontend
npm run dev
```

### Step 3: Verify Connection

Test the API endpoint:
```bash
curl http://localhost:8080/health
# Should return: {"status":"ok","service":"justsell-api"}
```

---

## 📡 Supported Operations

### ✅ Currently Working

| Operation | Endpoint | Frontend Support |
|-----------|----------|------------------|
| **List Listings** | `GET /api/listings` | ✅ Full support |
| **Get Listing by ID** | `GET /api/listings/:id` | ✅ Full support |
| **Create Listing** | `POST /api/listings` | ✅ Full support |
| **Update Listing** | `PUT /api/listings/:id` | ✅ Full support |
| **Delete Listing** | `DELETE /api/listings/:id` | ✅ Full support |

### ⏳ Not Yet Implemented in Backend

| Feature | Status | Notes |
|---------|--------|-------|
| Search | ❌ | Returns 501 - needs NLP parser + embeddings |
| Images | ❌ | Not stored in backend yet |
| User authentication | ❌ | No user system yet |
| Likes/Favorites | ❌ | Not implemented |
| View counts | ❌ | Not implemented |
| Comments/Reviews | ❌ | Not implemented |

---

## 🔄 Data Format Conversion

The frontend automatically converts between formats:

### Backend Format (Go)
```json
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
```

### Frontend Format (TypeScript)
```typescript
{
  id: "1",
  title: "Toyota Camry 2018",
  description: "Reliable family car",
  price: 18000,
  currency: "NZD",
  category: "vehicles",
  location: {
    city: "Auckland",
    suburb: "",
    region: ""
  },
  categoryFields: {
    make: "Toyota",
    model: "Camry",
    year: 2018,
    odometer: 45000
  },
  seller: { ... },
  images: [],
  status: "active",
  createdAt: "2025-12-26T10:30:00Z"
}
```

---

## 🧪 Testing CRUD Operations

### Create a Listing via Frontend

1. Navigate to `/list-item`
2. Fill out the form:
   - Title: "Honda Civic 2020"
   - Description: "Low mileage, one owner"
   - Price: 22000
   - Location: Wellington
3. Click "List item"

**Backend receives:**
```bash
curl -X POST http://localhost:8080/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Honda Civic 2020",
    "description": "Low mileage, one owner",
    "price": 22000,
    "category": "vehicles",
    "location": "Wellington"
  }'
```

### View Listings

Navigate to `/search` or home page - listings are fetched from the backend.

### Update a Listing

1. Click on a listing
2. Click "Edit"
3. Modify fields
4. Click "Save"

**Backend receives:**
```bash
curl -X PUT http://localhost:8080/api/listings/1 \
  -H "Content-Type: application/json" \
  -d '{...updated data...}'
```

### Delete a Listing

1. Click on a listing
2. Click "Delete"
3. Confirm

**Backend receives:**
```bash
curl -X DELETE http://localhost:8080/api/listings/1
```

---

## 🔍 Debugging

### Verify Backend is Running

```bash
curl http://localhost:8080/health
# Should return: {"status":"ok","service":"justsell-api"}
```

### Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Perform an action (e.g., view listings)
4. You should see requests to `http://localhost:8080/api/listings`

### Common Issues

**CORS Error:**
```
Access to fetch at 'http://localhost:8080' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**Solution:** Backend already has CORS enabled for `localhost:3000`. Make sure the backend is running.

**Connection Refused:**
```
Failed to fetch
```

**Solution:**
1. Check backend is running: `curl http://localhost:8080/health`
2. Verify `.env.local` has correct API URL

**API URL Not Configured:**

**Solution:**
1. Check `.env.local` exists in `frontend/` directory
2. Verify `NEXT_PUBLIC_API_URL=http://localhost:8080`
3. Restart Next.js dev server (`npm run dev`)

---

## 📁 Files Modified

### New Files Created
- `frontend/src/services/api.client.ts` - HTTP client for Go backend
- `frontend/src/services/listings.backend.ts` - Backend service adapter
- `frontend/.env.local` - Environment configuration (gitignored)
- `frontend/.env.example` - Example environment file

### Modified Files
- `frontend/src/services/index.ts` - Service exports

---

## 🎯 Next Steps

### To Enable Search
1. Implement NLP parser in backend (`internal/parser/nlp_parser.go`)
2. Implement embedding service (`internal/service/embedding_service.go`)
3. Implement search handler (`internal/api/handler/search.go`)
4. Update frontend to use `/api/search` endpoint

### To Add Images
1. Add image upload endpoint to backend
2. Integrate with cloud storage (S3, Cloudinary, etc.)
3. Update backend listings table with image URLs
4. Update frontend to upload images

### To Add Authentication
1. Implement JWT-based auth in backend
2. Add user registration/login endpoints
3. Update frontend to store JWT tokens
4. Add authorization middleware to protected endpoints

---

## 🎉 Status

**Frontend is now fully wired to the Go backend API!**

You can now:
- ✅ Create listings from the frontend app
- ✅ View listings from PostgreSQL database
- ✅ Update listings via the app
- ✅ Delete listings via the app

The integration is complete and ready for development!
