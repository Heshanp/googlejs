package service

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type publishCounter struct {
	windowStart time.Time
	count       int
}

// PublishGuard enforces publish attempt limits per user and per IP.
type PublishGuard struct {
	mu        sync.Mutex
	window    time.Duration
	userLimit int
	ipLimit   int
	users     map[string]*publishCounter
	ips       map[string]*publishCounter
}

// NewPublishGuard creates a publish rate limiter.
func NewPublishGuard(userLimit, ipLimit int, window time.Duration) *PublishGuard {
	if userLimit <= 0 {
		userLimit = 10
	}
	if ipLimit <= 0 {
		ipLimit = 30
	}
	if window <= 0 {
		window = time.Minute
	}
	return &PublishGuard{
		window:    window,
		userLimit: userLimit,
		ipLimit:   ipLimit,
		users:     make(map[string]*publishCounter),
		ips:       make(map[string]*publishCounter),
	}
}

// Allow returns true when request can proceed under both user and IP limits.
func (g *PublishGuard) Allow(userID, ip string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	now := time.Now()
	allowedUser := g.allowCounter(g.users, normalizeKey(userID), g.userLimit, now)
	allowedIP := g.allowCounter(g.ips, normalizeKey(ip), g.ipLimit, now)

	g.cleanupLocked(now)
	return allowedUser && allowedIP
}

func (g *PublishGuard) allowCounter(store map[string]*publishCounter, key string, limit int, now time.Time) bool {
	if key == "" {
		return true
	}

	counter, ok := store[key]
	if !ok {
		store[key] = &publishCounter{windowStart: now, count: 1}
		return true
	}

	if now.Sub(counter.windowStart) >= g.window {
		counter.windowStart = now
		counter.count = 1
		return true
	}

	if counter.count >= limit {
		return false
	}

	counter.count++
	return true
}

func (g *PublishGuard) cleanupLocked(now time.Time) {
	maxAge := g.window * 3
	for key, counter := range g.users {
		if now.Sub(counter.windowStart) > maxAge {
			delete(g.users, key)
		}
	}
	for key, counter := range g.ips {
		if now.Sub(counter.windowStart) > maxAge {
			delete(g.ips, key)
		}
	}
}

func normalizeKey(key string) string {
	return strings.TrimSpace(strings.ToLower(key))
}

// ExtractClientIP resolves the best-effort real client IP.
func ExtractClientIP(r *http.Request) string {
	if r == nil {
		return ""
	}

	for _, header := range []string{"CF-Connecting-IP", "X-Forwarded-For", "X-Real-IP"} {
		value := strings.TrimSpace(r.Header.Get(header))
		if value == "" {
			continue
		}
		if header == "X-Forwarded-For" {
			parts := strings.Split(value, ",")
			if len(parts) > 0 {
				value = strings.TrimSpace(parts[0])
			}
		}
		if value != "" {
			return value
		}
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}
