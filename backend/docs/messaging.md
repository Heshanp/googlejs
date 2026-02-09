# Messaging System

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser A  │────▶│  WebSocket   │◀────│   Browser B  │
│   (Buyer)    │     │    Server    │     │   (Seller)   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────▼───────┐
                    │     Hub      │
                    │  (Go struct) │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  PostgreSQL  │
                    │  conversations│
                    │   messages   │
                    └──────────────┘
```

## Endpoints

### WebSocket
| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /ws` | Bearer token | WebSocket upgrade |

### REST API
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/conversations` | Required | List user's conversations |
| POST | `/api/conversations` | Required | Start new conversation |
| GET | `/api/conversations/:id` | Required | Get conversation details |
| GET | `/api/conversations/:id/messages` | Required | Get message history |

## WebSocket Protocol

### Inbound (Client → Server)

**Send Message**
```json
{
  "type": "send_message",
  "conversationId": "uuid",
  "content": "Hello, is this still available?"
}
```

**Typing Indicator**
```json
{
  "type": "typing",
  "conversationId": "uuid"
}
```

**Mark as Read**
```json
{
  "type": "mark_read",
  "conversationId": "uuid",
  "messageId": "uuid"
}
```

### Outbound (Server → Client)

**New Message**
```json
{
  "type": "new_message",
  "conversationId": "uuid",
  "message": {
    "id": "uuid",
    "senderId": "uuid",
    "content": "Yes, it's available!",
    "createdAt": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Typing Notification**
```json
{
  "type": "typing_notify",
  "conversationId": "uuid",
  "userId": "uuid",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Read Receipt**
```json
{
  "type": "read_receipt",
  "conversationId": "uuid",
  "userId": "uuid",
  "messageId": "uuid",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Database Schema

### conversations
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| listing_id | INTEGER | Reference to listing |
| buyer_id | UUID | Reference to buyer user |
| seller_id | UUID | Reference to seller user |
| last_message_at | TIMESTAMP | For sorting |
| created_at | TIMESTAMP | Creation time |

**Constraints:** `UNIQUE(listing_id, buyer_id)` - One conversation per buyer per listing.

### messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Reference to conversation |
| sender_id | UUID | Reference to sender user |
| content | TEXT | Message content |
| read_at | TIMESTAMP | NULL if unread |
| created_at | TIMESTAMP | Send time |

## Code Structure

```
internal/
├── models/
│   └── conversation.go      # Conversation, Message structs
├── repository/
│   ├── conversation_repo.go # CRUD for conversations
│   └── message_repo.go      # CRUD for messages
├── ws/
│   ├── message_types.go     # Wire protocol types
│   ├── hub.go               # Connection manager
│   └── handler.go           # Message processing
└── api/handler/
    ├── ws_handler.go        # WebSocket upgrade
    └── conversations.go     # REST endpoints
```

## Performance Characteristics

- **Thread-safe:** `sync.RWMutex` protects client map
- **Non-blocking:** Buffered channels (256 per client)
- **Graceful shutdown:** Context-based lifecycle management
- **Connection health:** Ping/pong every 54 seconds
- **Message size:** 4KB limit per message
- **Write timeout:** 10 seconds

## Usage Example

### JavaScript Client
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

// Auth header sent via query param for browsers
// Or use cookies in production

ws.onopen = () => {
  // Send a message
  ws.send(JSON.stringify({
    type: 'send_message',
    conversationId: 'conv-uuid',
    content: 'Hello!'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'new_message':
      // Handle new message payload
      break;
    case 'typing_notify':
      // Handle typing indicator updates
      break;
    case 'read_receipt':
      // Handle read receipt updates
      break;
  }
};
```

## Error Handling

Errors are sent as:
```json
{
  "type": "error",
  "error": "not authorized for this conversation",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Future Improvements

- [ ] Redis pub/sub for multi-instance deployment
- [ ] Push notifications (FCM/APNs)
- [ ] Image/file attachments
- [ ] Message reactions
- [ ] Message editing/deletion
