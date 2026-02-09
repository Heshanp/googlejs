package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/yourusername/justsell/backend/internal/service"
)

var notificationSvc *service.NotificationService

// SetNotificationService sets the notification service dependency
func SetNotificationService(svc *service.NotificationService) {
	notificationSvc = svc
}

// GetNotifications handles GET /api/notifications
func GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	// Parse pagination params
	limit := 20
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	ctx := context.Background()
	notifications, err := notificationSvc.GetUserNotifications(ctx, userIDStr, limit, offset)
	if err != nil {
		log.Printf("GetNotifications: error=%v", err)
		http.Error(w, "Failed to fetch notifications", http.StatusInternalServerError)
		return
	}

	unreadCount, err := notificationSvc.GetUnreadCount(ctx, userIDStr)
	if err != nil {
		log.Printf("GetNotifications: error getting unread count: %v", err)
		unreadCount = 0
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"notifications": notifications,
		"unreadCount":   unreadCount,
	})
}

// GetUnreadCount handles GET /api/notifications/unread-count
func GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	ctx := context.Background()
	count, err := notificationSvc.GetUnreadCount(ctx, userIDStr)
	if err != nil {
		log.Printf("GetUnreadCount: error=%v", err)
		http.Error(w, "Failed to get unread count", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"unreadCount": count,
	})
}

// MarkNotificationAsRead handles POST /api/notifications/:id/read
func MarkNotificationAsRead(w http.ResponseWriter, r *http.Request, notificationIDStr string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	notificationID, err := strconv.ParseInt(notificationIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	err = notificationSvc.MarkAsRead(ctx, notificationID, userIDStr)
	if err != nil {
		log.Printf("MarkNotificationAsRead: error=%v", err)
		http.Error(w, "Failed to mark as read", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// MarkAllAsRead handles POST /api/notifications/read-all
func MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	ctx := context.Background()
	err := notificationSvc.MarkAllAsRead(ctx, userIDStr)
	if err != nil {
		log.Printf("MarkAllAsRead: error=%v", err)
		http.Error(w, "Failed to mark all as read", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// DeleteNotification handles DELETE /api/notifications/:id
func DeleteNotification(w http.ResponseWriter, r *http.Request, notificationIDStr string) {
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr := userID.(string)

	notificationID, err := strconv.ParseInt(notificationIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	err = notificationSvc.Delete(ctx, notificationID, userIDStr)
	if err != nil {
		log.Printf("DeleteNotification: error=%v", err)
		http.Error(w, "Failed to delete notification", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleNotificationRoutes routes notification-related requests
func HandleNotificationRoutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/notifications")
	path = strings.TrimPrefix(path, "/")

	// GET /api/notifications - list notifications
	if path == "" && r.Method == http.MethodGet {
		GetNotifications(w, r)
		return
	}

	// GET /api/notifications/unread-count - get unread count
	if path == "unread-count" && r.Method == http.MethodGet {
		GetUnreadCount(w, r)
		return
	}

	// POST /api/notifications/read-all - mark all as read
	if path == "read-all" && r.Method == http.MethodPost {
		MarkAllAsRead(w, r)
		return
	}

	// Handle /api/notifications/:id/* routes
	parts := strings.Split(path, "/")
	if len(parts) >= 1 && parts[0] != "" {
		notificationID := parts[0]

		// POST /api/notifications/:id/read - mark single as read
		if len(parts) >= 2 && parts[1] == "read" && r.Method == http.MethodPost {
			MarkNotificationAsRead(w, r, notificationID)
			return
		}

		// DELETE /api/notifications/:id - delete notification
		if len(parts) == 1 && r.Method == http.MethodDelete {
			DeleteNotification(w, r, notificationID)
			return
		}
	}

	http.Error(w, "Not found", http.StatusNotFound)
}
