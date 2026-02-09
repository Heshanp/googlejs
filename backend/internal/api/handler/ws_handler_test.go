package handler

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/service"
	"github.com/yourusername/justsell/backend/internal/ws"
)

func wsURLFromServer(serverURL string, path string) string {
	u, _ := url.Parse(serverURL)
	u.Scheme = "ws"
	u.Path = path
	return u.String()
}

func setupWebSocketHandler(t *testing.T) (*ws.Hub, string, func()) {
	t.Helper()

	hub := ws.NewHub()
	go hub.Run()

	SetWSHub(hub)
	SetWSHandler(ws.NewHandler(hub, nil, nil))

	authSvc := service.GetAuthService()
	token, err := authSvc.GenerateToken(&models.User{
		ID:    "user-123",
		Email: "user@example.com",
		Name:  "Test User",
	})
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}

	cleanup := func() {
		hub.Stop()
	}

	return hub, token, cleanup
}

func TestHandleWebSocket_RequiresToken(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "https://allowed.example")

	_, _, cleanup := setupWebSocketHandler(t)
	defer cleanup()

	srv := httptest.NewServer(http.HandlerFunc(HandleWebSocket))
	defer srv.Close()

	u := wsURLFromServer(srv.URL, "/ws")
	_, resp, err := websocket.DefaultDialer.Dial(u, http.Header{
		"Origin": []string{"https://allowed.example"},
	})
	if err == nil {
		t.Fatal("expected dial to fail without token")
	}
	if resp == nil {
		t.Fatalf("expected http response, got nil (err=%v)", err)
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}

func TestHandleWebSocket_AllowsQueryToken(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "https://allowed.example")

	_, token, cleanup := setupWebSocketHandler(t)
	defer cleanup()

	srv := httptest.NewServer(http.HandlerFunc(HandleWebSocket))
	defer srv.Close()

	u := wsURLFromServer(srv.URL, "/ws") + "?token=" + url.QueryEscape(token)
	conn, resp, err := websocket.DefaultDialer.Dial(u, http.Header{
		"Origin": []string{"https://allowed.example"},
	})
	if err != nil {
		status := 0
		if resp != nil {
			status = resp.StatusCode
		}
		t.Fatalf("expected dial success, got err=%v status=%d", err, status)
	}
	_ = conn.Close()
}

func TestHandleWebSocket_OriginAllowlist(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "https://allowed.example")

	_, token, cleanup := setupWebSocketHandler(t)
	defer cleanup()

	srv := httptest.NewServer(http.HandlerFunc(HandleWebSocket))
	defer srv.Close()

	t.Run("rejects disallowed origin", func(t *testing.T) {
		u := wsURLFromServer(srv.URL, "/ws") + "?token=" + url.QueryEscape(token)
		_, resp, err := websocket.DefaultDialer.Dial(u, http.Header{
			"Origin": []string{"https://not-allowed.example"},
		})
		if err == nil {
			t.Fatal("expected dial to fail for disallowed origin")
		}
		if resp == nil {
			t.Fatalf("expected http response, got nil (err=%v)", err)
		}
		if resp.StatusCode != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", resp.StatusCode)
		}
	})

	t.Run("allows allowed origin", func(t *testing.T) {
		u := wsURLFromServer(srv.URL, "/ws") + "?token=" + url.QueryEscape(token)
		conn, _, err := websocket.DefaultDialer.Dial(u, http.Header{
			"Origin": []string{"https://allowed.example"},
		})
		if err != nil {
			t.Fatalf("expected dial success, got err=%v", err)
		}
		_ = conn.Close()
	})
}

func TestHandleWebSocket_AllowsAuthorizationHeader(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "https://allowed.example")

	_, token, cleanup := setupWebSocketHandler(t)
	defer cleanup()

	srv := httptest.NewServer(http.HandlerFunc(HandleWebSocket))
	defer srv.Close()

	u := wsURLFromServer(srv.URL, "/ws")
	conn, resp, err := websocket.DefaultDialer.Dial(u, http.Header{
		"Origin":        []string{"https://allowed.example"},
		"Authorization": []string{"Bearer " + strings.TrimSpace(token)},
	})
	if err != nil {
		status := 0
		if resp != nil {
			status = resp.StatusCode
		}
		t.Fatalf("expected dial success, got err=%v status=%d", err, status)
	}
	_ = conn.Close()
}
