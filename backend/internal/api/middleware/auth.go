package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/yourusername/justsell/backend/internal/service"
)

// Auth middleware validates JWT tokens and adds user info to context
func Auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// Expect "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]
		authSvc := service.GetAuthService()
		claims, err := authSvc.ValidateToken(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Add user info to context
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "userEmail", claims.Email)
		ctx = context.WithValue(ctx, "userName", claims.Name)

		next(w, r.WithContext(ctx))
	}
}

// OptionalAuth middleware optionally validates JWT tokens
// If a valid token is present, user info is added to context
// If no token or invalid token, request continues without user info
func OptionalAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			next(w, r)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			next(w, r)
			return
		}

		tokenString := parts[1]
		authSvc := service.GetAuthService()
		claims, err := authSvc.ValidateToken(tokenString)
		if err != nil {
			next(w, r)
			return
		}

		// Add user info to context
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "userEmail", claims.Email)
		ctx = context.WithValue(ctx, "userName", claims.Name)

		next(w, r.WithContext(ctx))
	}
}
