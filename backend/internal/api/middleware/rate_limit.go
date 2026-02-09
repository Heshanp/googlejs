package middleware

import (
	"net/http"
	"sync"
	"time"
)

// RateLimiter implements a simple token bucket rate limiter per user
type RateLimiter struct {
	buckets    map[string]*bucket
	mu         sync.RWMutex
	maxTokens  int
	refillRate time.Duration
}

type bucket struct {
	tokens     int
	lastRefill time.Time
}

// NewRateLimiter creates a new rate limiter
// maxTokens is the burst size, refillRate is how often a token is added
func NewRateLimiter(maxTokens int, refillRate time.Duration) *RateLimiter {
	return &RateLimiter{
		buckets:    make(map[string]*bucket),
		maxTokens:  maxTokens,
		refillRate: refillRate,
	}
}

// Allow checks if a request from userID should be allowed
func (rl *RateLimiter) Allow(userID string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	b, exists := rl.buckets[userID]
	if !exists {
		b = &bucket{
			tokens:     rl.maxTokens,
			lastRefill: time.Now(),
		}
		rl.buckets[userID] = b
	}

	// Refill tokens based on elapsed time
	elapsed := time.Since(b.lastRefill)
	tokensToAdd := int(elapsed / rl.refillRate)
	if tokensToAdd > 0 {
		b.tokens += tokensToAdd
		if b.tokens > rl.maxTokens {
			b.tokens = rl.maxTokens
		}
		b.lastRefill = time.Now()
	}

	// Check if we can consume a token
	if b.tokens > 0 {
		b.tokens--
		return true
	}
	return false
}

// Cleanup removes stale buckets (call periodically)
func (rl *RateLimiter) Cleanup(maxAge time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	for userID, b := range rl.buckets {
		if now.Sub(b.lastRefill) > maxAge {
			delete(rl.buckets, userID)
		}
	}
}

// Global rate limiters
var (
	// Message rate limiter: 60 messages per minute per user
	MessageRateLimiter = NewRateLimiter(60, time.Second)

	// Conversation rate limiter: 10 conversations per minute per user
	ConversationRateLimiter = NewRateLimiter(10, 6*time.Second)
)

// RateLimitMiddleware creates middleware that applies rate limiting
func RateLimitMiddleware(limiter *RateLimiter) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			userID := r.Context().Value("userID")
			if userID == nil {
				next(w, r)
				return
			}

			if !limiter.Allow(userID.(string)) {
				http.Error(w, "Rate limit exceeded. Please try again later.", http.StatusTooManyRequests)
				return
			}

			next(w, r)
		}
	}
}
