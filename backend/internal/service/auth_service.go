package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/yourusername/justsell/backend/internal/models"
)

// AuthService handles authentication logic
type AuthService struct {
	googleClientID string
	jwtSecret      []byte
}

// NewAuthService creates a new AuthService
func NewAuthService() *AuthService {
	return &AuthService{
		googleClientID: os.Getenv("GOOGLE_CLIENT_ID"),
		jwtSecret:      []byte(getJWTSecret()),
	}
}

func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Default secret for development - MUST be set in production
		return "justsell-dev-secret-change-in-production"
	}
	return secret
}

// VerifyGoogleToken verifies a Google ID token and returns the token info
func (s *AuthService) VerifyGoogleToken(credential string) (*models.GoogleTokenInfo, error) {
	// Use Google's tokeninfo endpoint to verify the token
	resp, err := http.Get(fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", credential))
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("invalid token")
	}

	var tokenInfo models.GoogleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&tokenInfo); err != nil {
		return nil, fmt.Errorf("failed to decode token info: %w", err)
	}

	// Verify the audience matches our client ID
	if s.googleClientID != "" && tokenInfo.Aud != s.googleClientID {
		return nil, errors.New("token audience mismatch")
	}

	return &tokenInfo, nil
}

// JWTClaims represents the claims in our JWT token
type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	jwt.RegisteredClaims
}

// GenerateToken generates a JWT token for a user
func (s *AuthService) GenerateToken(user *models.User) (string, error) {
	claims := JWTClaims{
		UserID: user.ID,
		Email:  user.Email,
		Name:   user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // 7 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "justsell",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ValidateToken validates a JWT token and returns the claims
func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// Global instance
var authService *AuthService

// GetAuthService returns the global auth service instance
func GetAuthService() *AuthService {
	if authService == nil {
		authService = NewAuthService()
	}
	return authService
}
