package service

import (
	"context"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ViewCountService tracks listing views with in-memory batching
// to minimize database writes. Views are flushed to DB periodically.
type ViewCountService struct {
	db *pgxpool.Pool

	// Buffer for pending view count increments: listingID -> delta
	buffer map[int]int
	bufMu  sync.Mutex

	// Debounce map to prevent spam: "visitorKey:listingID" -> lastViewTime
	seen   map[string]time.Time
	seenMu sync.RWMutex

	// Configuration
	flushInterval  time.Duration
	debounceWindow time.Duration

	// Control
	stopCh chan struct{}
	wg     sync.WaitGroup
}

var (
	viewCountService     *ViewCountService
	viewCountServiceOnce sync.Once
)

// NewViewCountService creates a new view count service
func NewViewCountService(db *pgxpool.Pool) *ViewCountService {
	return &ViewCountService{
		db:             db,
		buffer:         make(map[int]int),
		seen:           make(map[string]time.Time),
		flushInterval:  30 * time.Second,
		debounceWindow: 1 * time.Hour,
		stopCh:         make(chan struct{}),
	}
}

// InitViewCountService initializes the global view count service
func InitViewCountService(db *pgxpool.Pool) *ViewCountService {
	viewCountServiceOnce.Do(func() {
		viewCountService = NewViewCountService(db)
		viewCountService.Start()
	})
	return viewCountService
}

// GetViewCountService returns the global view count service
func GetViewCountService() *ViewCountService {
	return viewCountService
}

// Start begins the background flush goroutine
func (s *ViewCountService) Start() {
	s.wg.Add(1)
	go s.flushLoop()
	log.Println("✓ ViewCountService started (flush every 30s)")
}

// Stop gracefully shuts down the service
func (s *ViewCountService) Stop() {
	close(s.stopCh)
	s.wg.Wait()
	// Final flush
	s.flush()
	log.Println("✓ ViewCountService stopped")
}

// RecordView records a view for a listing, with spam prevention
// Returns true if the view was counted, false if debounced
func (s *ViewCountService) RecordView(listingID int, r *http.Request, sellerID string) bool {
	visitorKey := s.getVisitorKey(r)

	// Don't count if seller is viewing their own listing
	if visitorKey == sellerID && sellerID != "" {
		return false
	}

	// Check debounce
	cacheKey := visitorKey + ":" + string(rune(listingID))
	s.seenMu.RLock()
	lastSeen, exists := s.seen[cacheKey]
	s.seenMu.RUnlock()

	if exists && time.Since(lastSeen) < s.debounceWindow {
		return false // Already viewed recently
	}

	// Record the view time
	s.seenMu.Lock()
	s.seen[cacheKey] = time.Now()
	s.seenMu.Unlock()

	// Increment buffer
	s.bufMu.Lock()
	s.buffer[listingID]++
	s.bufMu.Unlock()

	return true
}

// GetBufferedCount returns the pending (unflushed) view count for a listing
func (s *ViewCountService) GetBufferedCount(listingID int) int {
	s.bufMu.Lock()
	defer s.bufMu.Unlock()
	return s.buffer[listingID]
}

// getVisitorKey returns a unique identifier for the visitor
// Uses userID if logged in, otherwise falls back to IP address
func (s *ViewCountService) getVisitorKey(r *http.Request) string {
	// Check for userID in context (set by auth middleware)
	if userID := r.Context().Value("userID"); userID != nil {
		if uid, ok := userID.(string); ok && uid != "" {
			return uid
		}
	}

	// Fall back to IP address
	return s.getClientIP(r)
}

// getClientIP extracts the real client IP from the request
func (s *ViewCountService) getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (for proxies/load balancers)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Take the first IP in the chain
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// flushLoop periodically flushes buffered view counts to the database
func (s *ViewCountService) flushLoop() {
	defer s.wg.Done()
	ticker := time.NewTicker(s.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.flush()
			s.cleanupOldSeen()
		case <-s.stopCh:
			return
		}
	}
}

// flush writes all buffered view counts to the database
func (s *ViewCountService) flush() {
	s.bufMu.Lock()
	if len(s.buffer) == 0 {
		s.bufMu.Unlock()
		return
	}

	// Copy and clear buffer
	toFlush := s.buffer
	s.buffer = make(map[int]int)
	s.bufMu.Unlock()

	// Batch update database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for listingID, delta := range toFlush {
		_, err := s.db.Exec(ctx,
			"UPDATE listings SET view_count = view_count + $1 WHERE id = $2",
			delta, listingID)
		if err != nil {
			log.Printf("Failed to update view count for listing %d: %v", listingID, err)
			// Re-add to buffer on failure
			s.bufMu.Lock()
			s.buffer[listingID] += delta
			s.bufMu.Unlock()
		}
	}

	if len(toFlush) > 0 {
		log.Printf("✓ Flushed view counts for %d listings", len(toFlush))
	}
}

// cleanupOldSeen removes expired entries from the debounce map
func (s *ViewCountService) cleanupOldSeen() {
	s.seenMu.Lock()
	defer s.seenMu.Unlock()

	now := time.Now()
	for key, lastSeen := range s.seen {
		if now.Sub(lastSeen) > s.debounceWindow {
			delete(s.seen, key)
		}
	}
}
