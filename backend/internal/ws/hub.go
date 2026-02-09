package ws

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 4096

	// Send buffer size per client.
	sendBufferSize = 256
)

// Client represents a single WebSocket connection
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	userID string
	send   chan []byte
	ctx    context.Context
	cancel context.CancelFunc
}

// NewClient creates a new WebSocket client
func NewClient(hub *Hub, conn *websocket.Conn, userID string) *Client {
	ctx, cancel := context.WithCancel(context.Background())
	return &Client{
		hub:    hub,
		conn:   conn,
		userID: userID,
		send:   make(chan []byte, sendBufferSize),
		ctx:    ctx,
		cancel: cancel,
	}
}

// UserID returns the user ID for this client
func (c *Client) UserID() string {
	return c.userID
}

// Send queues a message for sending to the client
func (c *Client) Send(msg []byte) bool {
	select {
	case c.send <- msg:
		return true
	default:
		// Buffer full, client is slow
		return false
	}
}

// Close gracefully closes the client connection
func (c *Client) Close() {
	c.cancel()
	c.hub.unregister <- c
}

// readPump pumps messages from the websocket connection to the hub.
// Runs in its own goroutine, one per connection.
func (c *Client) readPump(handler MessageHandler) {
	defer func() {
		c.Close()
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		select {
		case <-c.ctx.Done():
			return
		default:
			_, message, err := c.conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket read error for user %s: %v", c.userID, err)
				}
				return
			}

			// Parse inbound message
			var inMsg InboundMessage
			if err := json.Unmarshal(message, &inMsg); err != nil {
				c.sendError("invalid message format")
				continue
			}

			// Handle ping immediately
			if inMsg.Type == TypePing {
				c.sendPong()
				continue
			}

			// Delegate to message handler
			if handler != nil {
				handler.HandleMessage(c.ctx, c, &inMsg)
			}
		}
	}
}

// writePump pumps messages from the send channel to the websocket connection.
// Runs in its own goroutine, one per connection.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case <-c.ctx.Done():
			return
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Coalesce pending messages for efficiency
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// sendError sends an error message to the client
func (c *Client) sendError(errMsg string) {
	msg := OutboundMessage{
		Type:      TypeError,
		Error:     errMsg,
		Timestamp: time.Now(),
	}
	data, _ := json.Marshal(msg)
	c.Send(data)
}

// sendPong sends a pong response
func (c *Client) sendPong() {
	msg := OutboundMessage{
		Type:      TypePong,
		Timestamp: time.Now(),
	}
	data, _ := json.Marshal(msg)
	c.Send(data)
}

// Run starts the read and write pumps for this client
func (c *Client) Run(handler MessageHandler) {
	go c.writePump()
	c.readPump(handler) // Blocking call
}

// MessageHandler interface for processing inbound messages
type MessageHandler interface {
	HandleMessage(ctx context.Context, client *Client, msg *InboundMessage)
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients by user ID (one user can have multiple connections)
	clients map[string]map[*Client]bool
	mu      sync.RWMutex

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Broadcast messages to specific users
	broadcast chan *BroadcastTarget

	// Context for shutdown
	ctx    context.Context
	cancel context.CancelFunc
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
		broadcast:  make(chan *BroadcastTarget, 256),
		ctx:        ctx,
		cancel:     cancel,
	}
}

// Run starts the hub's main loop. Should be called in a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case <-h.ctx.Done():
			h.shutdown()
			return
		case client := <-h.register:
			h.addClient(client)
		case client := <-h.unregister:
			h.removeClient(client)
		case target := <-h.broadcast:
			h.broadcastToUsers(target)
		}
	}
}

// Register adds a client to the hub
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Broadcast sends a message to specific users
func (h *Hub) Broadcast(target *BroadcastTarget) {
	select {
	case h.broadcast <- target:
	default:
		log.Println("Broadcast channel full, message dropped")
	}
}

// Stop gracefully shuts down the hub
func (h *Hub) Stop() {
	h.cancel()
}

// OnlineUsers returns a list of currently connected user IDs
func (h *Hub) OnlineUsers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]string, 0, len(h.clients))
	for userID := range h.clients {
		users = append(users, userID)
	}
	return users
}

// IsOnline checks if a user has any active connections
func (h *Hub) IsOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, exists := h.clients[userID]
	return exists
}

// addClient registers a client with thread-safety
func (h *Hub) addClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[client.userID] == nil {
		h.clients[client.userID] = make(map[*Client]bool)
	}
	h.clients[client.userID][client] = true
	log.Printf("Client connected: user=%s, total_connections=%d", client.userID, len(h.clients[client.userID]))
}

// removeClient unregisters a client with thread-safety
func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.clients[client.userID]; ok {
		if _, exists := clients[client]; exists {
			delete(clients, client)
			close(client.send)
			if len(clients) == 0 {
				delete(h.clients, client.userID)
			}
			log.Printf("Client disconnected: user=%s", client.userID)
		}
	}
}

// broadcastToUsers sends a message to all connections of specified users
func (h *Hub) broadcastToUsers(target *BroadcastTarget) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	data, err := json.Marshal(target.Message)
	if err != nil {
		log.Printf("Failed to marshal broadcast message: %v", err)
		return
	}

	for _, userID := range target.UserIDs {
		if clients, ok := h.clients[userID]; ok {
			for client := range clients {
				if !client.Send(data) {
					// Client buffer full, connection likely dead
					go client.Close()
				}
			}
		}
	}
}

// shutdown closes all client connections
func (h *Hub) shutdown() {
	h.mu.Lock()
	defer h.mu.Unlock()

	for userID, clients := range h.clients {
		for client := range clients {
			close(client.send)
		}
		delete(h.clients, userID)
	}
	log.Println("Hub shutdown complete")
}
