# Smart Deal Finder - Notification System

A three-phase notification system that alerts users about price drops on liked items, matches new listings to saved searches, and delivers real-time alerts via WebSocket.

---

## Phase 1: Notification Backbone + Price Drop Alerts

### Database Schema

**`notifications`** - Stores all user notifications
```sql
id BIGINT PRIMARY KEY
user_id TEXT NOT NULL
type TEXT NOT NULL           -- message, like, offer, price_drop, deal_alert, etc.
title TEXT NOT NULL
body TEXT NOT NULL
listing_id BIGINT            -- Optional reference to listing
conversation_id TEXT         -- Optional reference to conversation
actor_id TEXT                -- User who triggered the notification
is_read BOOLEAN DEFAULT FALSE
read_at TIMESTAMPTZ
metadata JSONB DEFAULT '{}'  -- Type-specific data (prices, percentages, etc.)
created_at TIMESTAMPTZ
```

**`price_history`** - Tracks listing price changes
```sql
id BIGINT PRIMARY KEY
listing_id BIGINT NOT NULL
old_price INT NOT NULL
new_price INT NOT NULL
changed_at TIMESTAMPTZ
```

**`likes.price_when_liked`** - Column added to capture price at moment of like

### Automatic Price Tracking

A PostgreSQL trigger automatically logs price changes:
```sql
CREATE TRIGGER trigger_log_price_change
    AFTER UPDATE OF price ON listings
    FOR EACH ROW
    EXECUTE FUNCTION log_price_change();
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications (paginated) |
| GET | `/api/notifications/unread-count` | Get unread count |
| POST | `/api/notifications/{id}/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/{id}` | Delete notification |

### How Price Drop Notifications Work

1. User likes a listing → `price_when_liked` captured in `likes` table
2. Seller updates listing price → Trigger logs to `price_history`
3. Handler calls `NotificationService.NotifyPriceDrop()`
4. Service finds users who liked at a higher price
5. Notification created with savings metadata + broadcast via WebSocket

### Files

| File | Purpose |
|------|---------|
| `migrations/028_create_notifications.sql` | Notifications table |
| `migrations/029_create_price_history.sql` | Price history + trigger |
| `models/notification.go` | Notification types and structs |
| `repository/notification_repo.go` | Database operations |
| `service/notification_service.go` | Business logic + WebSocket broadcast |
| `handler/notifications.go` | HTTP handlers |

---

## Phase 2: Saved Searches

### Database Schema

**`saved_searches`** - Stores user search preferences
```sql
id BIGINT PRIMARY KEY
user_id TEXT NOT NULL
name TEXT NOT NULL           -- User-given name ("Gaming Laptops Under $500")
query TEXT NOT NULL          -- Search query string
filters JSONB DEFAULT '{}'   -- {category, priceMin, priceMax, location, ...}
notify_on_new BOOLEAN DEFAULT TRUE
last_notified_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(user_id, name)
```

**`saved_search_results`** - Tracks notified listings to prevent duplicates
```sql
id BIGINT PRIMARY KEY
saved_search_id BIGINT NOT NULL
listing_id BIGINT NOT NULL
notified_at TIMESTAMPTZ
UNIQUE(saved_search_id, listing_id)
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/saved-searches` | Create saved search |
| GET | `/api/saved-searches` | List user's saved searches |
| GET | `/api/saved-searches/{id}` | Get single saved search |
| PUT | `/api/saved-searches/{id}` | Update saved search |
| DELETE | `/api/saved-searches/{id}` | Delete saved search |
| GET | `/api/saved-searches/{id}/results` | Preview current results |

### Request/Response Examples

**Create Saved Search**
```json
POST /api/saved-searches
{
  "name": "Gaming Laptops Under 2000",
  "query": "gaming laptop RTX",
  "filters": {
    "category": "electronics",
    "priceMax": 200000
  },
  "notifyOnNew": true
}
```

**Response**
```json
{
  "id": 1,
  "userId": "user123",
  "name": "Gaming Laptops Under 2000",
  "query": "gaming laptop RTX",
  "filters": {"category": "electronics", "priceMax": 200000},
  "notifyOnNew": true,
  "createdAt": "2026-01-31T10:00:00Z",
  "updatedAt": "2026-01-31T10:00:00Z"
}
```

### Background Job

A cron job runs every 5 minutes:
1. Fetches all saved searches with `notify_on_new = true`
2. Executes each search using `SearchService`
3. Filters out already-notified listings
4. Sends notifications for new matches (max 5 per search per run)
5. Records notified listings to prevent duplicates
6. Cleans up records older than 30 days

### Files

| File | Purpose |
|------|---------|
| `migrations/030_create_saved_searches.sql` | Saved searches tables |
| `models/saved_search.go` | SavedSearch struct + input types |
| `repository/saved_search_repo.go` | CRUD + matching queries |
| `service/saved_search_service.go` | Business logic + alert processing |
| `handler/saved_searches.go` | HTTP handlers |

---

## Phase 3: Real-Time New Listing Alerts

### PostgreSQL LISTEN/NOTIFY

A trigger fires on every new listing insert:
```sql
CREATE TRIGGER trigger_notify_new_listing
    AFTER INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_listing();
```

The trigger sends a JSON payload:
```sql
pg_notify('new_listing', json_build_object(
    'id', NEW.id,
    'title', NEW.title,
    'category', NEW.category,
    'price', NEW.price,
    'user_id', NEW.user_id
)::text);
```

### Listener Service

A dedicated Go service listens for PostgreSQL notifications:
```go
conn.Exec(ctx, "LISTEN new_listing")
notification := conn.Conn().WaitForNotification(ctx)
```

### Matching Logic

When a new listing is created, it matches saved searches where:

1. **Text match**: Query appears in title OR description (case-insensitive)
2. **Category match**: Filter category equals listing category (or no filter)
3. **Price range**: Listing price within priceMin/priceMax (or no filter)
4. **Not self**: Listing owner is excluded from notifications

```sql
WHERE notify_on_new = TRUE
  AND user_id != $5                              -- Not listing owner
  AND ($1 ILIKE '%' || query || '%' OR ...)     -- Text match
  AND (filters->>'category' = $3 OR ...)         -- Category match
  AND ($4 >= (filters->>'priceMin')::int OR ...) -- Price range
```

### Architecture

```
New Listing Created
        │
        ▼
┌─────────────────┐
│ PostgreSQL      │
│ INSERT trigger  │
└────────┬────────┘
         │ pg_notify('new_listing', {...})
         ▼
┌─────────────────┐
│ ListingListener │  ◄── Dedicated connection with LISTEN
│ (Go service)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Match against   │  ◄── Query saved_searches table
│ Saved Searches  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create          │  ◄── Insert into notifications table
│ Notifications   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WebSocket       │  ◄── Real-time delivery to connected users
│ Broadcast       │
└─────────────────┘
```

### Features

- **Real-time**: Notifications within milliseconds of listing creation
- **Auto-reconnect**: Listener reconnects on connection loss (5s backoff)
- **Duplicate prevention**: `saved_search_results` table tracks notified pairs
- **Self-exclusion**: Users don't get notified about their own listings

### Files

| File | Purpose |
|------|---------|
| `migrations/031_add_listing_notify_trigger.sql` | NOTIFY trigger |
| `service/listing_listener.go` | PostgreSQL LISTEN service |

---

## WebSocket Integration

All notification types are broadcast to connected users via WebSocket:

```go
msg := &ws.OutboundMessage{
    Type:         ws.TypeNotification,
    Notification: notification,
    Timestamp:    time.Now(),
}
hub.Broadcast(&ws.BroadcastTarget{
    UserIDs: []string{notification.UserID},
    Message: msg,
})
```

Frontend clients receive notifications in real-time without polling.

---

## Configuration

### Background Jobs (main.go)

| Job | Interval | Purpose |
|-----|----------|---------|
| `startSavedSearchAlertsCron` | 5 min | Process saved search matches |
| `ListingListener` | Continuous | Real-time new listing alerts |

### Dependencies

Services are wired in `main.go`:
```go
notificationService := service.NewNotificationService(notificationRepo, wsHub, vectorRepo)
savedSearchService := service.NewSavedSearchService(savedSearchRepo, searchService, notificationService, wsHub)
listingListener := service.NewListingListener(db, savedSearchRepo, savedSearchService, listingRepo)
```

---

## Notification Types

| Type | Trigger | Example |
|------|---------|---------|
| `price_drop` | Liked listing price reduced | "Price Drop: iPhone 15 - Now $800 (was $900)" |
| `deal_alert` | New listing matches saved search | "New match: Gaming Laptop RTX 4080" |
| `message` | New chat message | "New message from John" |
| `like` | Someone liked your listing | "Your listing was liked" |
| `offer` | Offer received/updated | "New offer: $500 for iPhone 15" |

---

## Migrations

Run in order:
```bash
psql -d justsell < migrations/028_create_notifications.sql
psql -d justsell < migrations/029_create_price_history.sql
psql -d justsell < migrations/030_create_saved_searches.sql
psql -d justsell < migrations/031_add_listing_notify_trigger.sql
```

Or via Docker:
```bash
docker compose exec -T postgres psql -U postgres -d justsell < backend/migrations/028_create_notifications.sql
# ... repeat for each migration
```
