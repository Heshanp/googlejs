package handler

import (
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/yourusername/justsell/backend/internal/service"
	"github.com/yourusername/justsell/backend/internal/ws"
)

var wsMu sync.RWMutex
var wsHub *ws.Hub
var wsHandler *ws.Handler

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return isWebSocketOriginAllowed(origin)
	},
}

func isWebSocketOriginAllowed(origin string) bool {
	// Non-browser clients may omit Origin. Allow.
	if origin == "" {
		return true
	}

	allowed := os.Getenv("ALLOWED_ORIGINS")
	if allowed == "" {
		// Default dev origin.
		return origin == "http://localhost:3000"
	}

	for _, entry := range strings.Split(allowed, ",") {
		if strings.TrimSpace(entry) == origin {
			return true
		}
	}

	return false
}

// SetWSHub sets the WebSocket hub dependency
func SetWSHub(hub *ws.Hub) {
	wsMu.Lock()
	defer wsMu.Unlock()
	wsHub = hub
}

// SetWSHandler sets the WebSocket message handler dependency
func SetWSHandler(handler *ws.Handler) {
	wsMu.Lock()
	defer wsMu.Unlock()
	wsHandler = handler
}

func getWSHub() *ws.Hub {
	wsMu.RLock()
	defer wsMu.RUnlock()
	return wsHub
}

func getWSHubAndHandler() (*ws.Hub, *ws.Handler) {
	wsMu.RLock()
	defer wsMu.RUnlock()
	return wsHub, wsHandler
}

// HandleWebSocket handles WebSocket upgrade requests at /ws
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	var userIDStr string

	hub, handler := getWSHubAndHandler()
	if hub == nil {
		http.Error(w, "WebSocket unavailable", http.StatusServiceUnavailable)
		return
	}

	// 1) Try to get userID from middleware (if any).
	if userID := r.Context().Value("userID"); userID != nil {
		userIDStr = userID.(string)
	}

	// 2) If not present, allow Authorization: Bearer <token> for non-browser clients.
	if userIDStr == "" {
		if tokenString := bearerTokenFromHeader(r.Header.Get("Authorization")); tokenString != "" {
			authService := service.GetAuthService()
			claims, err := authService.ValidateToken(tokenString)
			if err != nil {
				log.Printf("WebSocket auth failed (Authorization header): %v", err)
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}
			userIDStr = claims.UserID
		}
	}

	// 3) Preferred: token via query param (?token=) for browsers.
	if userIDStr == "" {
		token := r.URL.Query().Get("token")
		if token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		authService := service.GetAuthService()
		claims, err := authService.ValidateToken(token)
		if err != nil {
			log.Printf("WebSocket auth failed (query token): %v", err)
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}
		userIDStr = claims.UserID
	}

	if userIDStr == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	// Create client and register with hub
	client := ws.NewClient(hub, conn, userIDStr)
	hub.Register(client)

	// Run client (blocking - handles read/write pumps)
	client.Run(handler)
}

func bearerTokenFromHeader(headerValue string) string {
	if headerValue == "" {
		return ""
	}
	parts := strings.SplitN(headerValue, " ", 2)
	if len(parts) != 2 {
		return ""
	}
	if parts[0] != "Bearer" {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
