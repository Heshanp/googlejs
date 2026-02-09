package service

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/yourusername/justsell/backend/internal/models"
)

// ============================================================================
// Tests for GenerateToken
// ============================================================================

func TestGenerateToken_Success(t *testing.T) {
	authSvc := &AuthService{
		jwtSecret: []byte("test-secret-key-for-testing"),
	}

	user := &models.User{
		ID:    "user-123",
		Email: "test@example.com",
		Name:  "Test User",
	}

	token, err := authSvc.GenerateToken(user)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if token == "" {
		t.Error("Expected non-empty token")
	}

	// Verify token has 3 parts (header.payload.signature)
	parts := splitToken(token)
	if len(parts) != 3 {
		t.Errorf("Expected 3 token parts, got %d", len(parts))
	}
}

func TestGenerateToken_ContainsCorrectClaims(t *testing.T) {
	authSvc := &AuthService{
		jwtSecret: []byte("test-secret-key-for-testing"),
	}

	user := &models.User{
		ID:    "user-456",
		Email: "claims@example.com",
		Name:  "Claims User",
	}

	tokenString, err := authSvc.GenerateToken(user)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	// Parse and verify claims
	claims, err := authSvc.ValidateToken(tokenString)
	if err != nil {
		t.Fatalf("Expected valid token, got error: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("UserID mismatch: expected %q, got %q", user.ID, claims.UserID)
	}
	if claims.Email != user.Email {
		t.Errorf("Email mismatch: expected %q, got %q", user.Email, claims.Email)
	}
	if claims.Name != user.Name {
		t.Errorf("Name mismatch: expected %q, got %q", user.Name, claims.Name)
	}
	if claims.Issuer != "justsell" {
		t.Errorf("Issuer mismatch: expected 'justsell', got %q", claims.Issuer)
	}
}

func TestGenerateToken_HasExpirationTime(t *testing.T) {
	authSvc := &AuthService{
		jwtSecret: []byte("test-secret-key-for-testing"),
	}

	user := &models.User{
		ID:    "user-789",
		Email: "expiry@example.com",
		Name:  "Expiry User",
	}

	tokenString, err := authSvc.GenerateToken(user)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	claims, err := authSvc.ValidateToken(tokenString)
	if err != nil {
		t.Fatalf("Expected valid token, got error: %v", err)
	}

	// Token should expire in approximately 7 days
	if claims.ExpiresAt == nil {
		t.Fatal("Expected ExpiresAt to be set")
	}

	expiryTime := claims.ExpiresAt.Time
	expectedExpiry := time.Now().Add(7 * 24 * time.Hour)

	// Allow 1 minute tolerance for test execution time
	if expiryTime.Before(expectedExpiry.Add(-1*time.Minute)) || expiryTime.After(expectedExpiry.Add(1*time.Minute)) {
		t.Errorf("Expiry time should be ~7 days from now, got: %v", expiryTime)
	}
}

// ============================================================================
// Tests for ValidateToken
// ============================================================================

func TestValidateToken_ValidToken(t *testing.T) {
	authSvc := &AuthService{
		jwtSecret: []byte("test-secret-key-for-testing"),
	}

	user := &models.User{
		ID:    "validate-user",
		Email: "validate@example.com",
		Name:  "Validate User",
	}

	tokenString, _ := authSvc.GenerateToken(user)
	claims, err := authSvc.ValidateToken(tokenString)

	if err != nil {
		t.Fatalf("Expected no error for valid token, got: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("Expected UserID %q, got %q", user.ID, claims.UserID)
	}
}

func TestValidateToken_InvalidSignature(t *testing.T) {
	authSvc := &AuthService{
		jwtSecret: []byte("test-secret-key-for-testing"),
	}

	// Create a token with a different secret
	differentAuthSvc := &AuthService{
		jwtSecret: []byte("different-secret-key"),
	}

	user := &models.User{
		ID:    "hacker-user",
		Email: "hacker@evil.com",
		Name:  "Hacker",
	}

	tokenString, _ := differentAuthSvc.GenerateToken(user)

	// Try to validate with original service (different secret)
	_, err := authSvc.ValidateToken(tokenString)

	if err == nil {
		t.Error("Expected error for token with wrong signature")
	}
}

func TestValidateToken_MalformedToken(t *testing.T) {
	authSvc := &AuthService{
		jwtSecret: []byte("test-secret-key-for-testing"),
	}

	malformedTokens := []string{
		"",
		"not.a.jwt",
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // Only header
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ", // No signature
		"totally-invalid-token",
	}

	for _, token := range malformedTokens {
		_, err := authSvc.ValidateToken(token)
		if err == nil {
			t.Errorf("Expected error for malformed token: %q", token)
		}
	}
}

func TestValidateToken_ExpiredToken(t *testing.T) {
	authSvc := &AuthService{
		jwtSecret: []byte("test-secret-key-for-testing"),
	}

	// Create an already-expired token manually
	claims := JWTClaims{
		UserID: "expired-user",
		Email:  "expired@example.com",
		Name:   "Expired User",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)), // Expired 1 hour ago
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-8 * time.Hour)),
			Issuer:    "justsell",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString(authSvc.jwtSecret)

	_, err := authSvc.ValidateToken(tokenString)
	if err == nil {
		t.Error("Expected error for expired token")
	}
}

func TestValidateToken_WrongSigningMethod(t *testing.T) {
	authSvc := &AuthService{
		jwtSecret: []byte("test-secret-key-for-testing"),
	}

	// Create a token with RS256 (asymmetric) instead of HS256
	// This is a security test - we should reject tokens with unexpected algorithms
	// For this test, we'll create a token that claims to use "none" algorithm
	claims := JWTClaims{
		UserID: "none-algo-user",
		Email:  "none@example.com",
		Name:   "None Algo User",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			Issuer:    "justsell",
		},
	}

	// Create unsigned token (alg: none attack simulation)
	unsignedToken := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
	tokenString, _ := unsignedToken.SignedString(jwt.UnsafeAllowNoneSignatureType)

	_, err := authSvc.ValidateToken(tokenString)
	if err == nil {
		t.Error("Expected error for token with 'none' algorithm - this is a security vulnerability!")
	}
}

// Helper function
func splitToken(token string) []string {
	var parts []string
	start := 0
	for i, c := range token {
		if c == '.' {
			parts = append(parts, token[start:i])
			start = i + 1
		}
	}
	parts = append(parts, token[start:])
	return parts
}
