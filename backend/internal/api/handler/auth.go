package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
	"github.com/yourusername/justsell/backend/internal/service"
)

type userAccountDeleter interface {
	DeleteAccount(ctx context.Context, userID string) error
}

var userAccountRepo userAccountDeleter

// SetUserAccountRepo allows tests to inject a stub.
func SetUserAccountRepo(repo userAccountDeleter) {
	userAccountRepo = repo
}

func getUserAccountRepo() userAccountDeleter {
	if userAccountRepo != nil {
		return userAccountRepo
	}
	return repository.GetUserRepository()
}

// GoogleLogin handles Google OAuth login
func GoogleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.GoogleAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Credential == "" {
		http.Error(w, "Credential is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// Verify the Google token
	authSvc := service.GetAuthService()
	tokenInfo, err := authSvc.VerifyGoogleToken(req.Credential)
	if err != nil {
		log.Printf("Failed to verify Google token: %v", err)
		http.Error(w, "Invalid Google token", http.StatusUnauthorized)
		return
	}

	// Find or create user
	userRepo := repository.GetUserRepository()
	user, err := userRepo.FindByGoogleID(ctx, tokenInfo.Sub)
	if err != nil {
		log.Printf("Error finding user by Google ID: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if user == nil {
		// Check if user exists with this email but different auth method
		user, err = userRepo.FindByEmail(ctx, tokenInfo.Email)
		if err != nil {
			log.Printf("Error finding user by email: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		if user != nil {
			// Update existing user with Google ID
			user.GoogleID = &tokenInfo.Sub
			if tokenInfo.Picture != "" {
				user.Avatar = &tokenInfo.Picture
			}
			user.IsVerified = true
			if err := userRepo.Update(ctx, user); err != nil {
				log.Printf("Error updating user: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
		} else {
			// Create new user
			var avatar *string
			if tokenInfo.Picture != "" {
				avatar = &tokenInfo.Picture
			}
			user = &models.User{
				Email:       tokenInfo.Email,
				Name:        tokenInfo.Name,
				Avatar:      avatar,
				GoogleID:    &tokenInfo.Sub,
				IsVerified:  true,
				Rating:      0,
				ReviewCount: 0,
			}
			if err := userRepo.Create(ctx, user); err != nil {
				log.Printf("Error creating user: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
		}
	}

	// Generate JWT token
	token, err := authSvc.GenerateToken(user)
	if err != nil {
		log.Printf("Error generating token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	userResp := user.ToResponse()
	userResp.IsAdmin = service.GetAdminAccess().IsAdminEmail(user.Email)

	// Return auth response
	response := models.AuthResponse{
		User:  userResp,
		Token: token,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetCurrentUser returns the currently authenticated user
func GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	ctx := context.Background()
	userRepo := repository.GetUserRepository()
	user, err := userRepo.GetByID(ctx, userID.(string))
	if err != nil {
		log.Printf("Error getting user: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if user == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	resp := user.ToResponse()
	resp.IsAdmin = service.GetAdminAccess().IsAdminEmail(user.Email)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GetUserByID returns a user by their ID (public profile)
func GetUserByID(w http.ResponseWriter, r *http.Request, userID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := context.Background()
	userRepo := repository.GetUserRepository()
	user, err := userRepo.GetByID(ctx, userID)
	if err != nil {
		log.Printf("Error getting user: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if user == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	userResp := user.ToResponse()
	userResp.IsAdmin = service.GetAdminAccess().IsAdminEmail(user.Email)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": userResp,
	})
}

// DeleteProfile deletes the currently authenticated user's account and related data.
func DeleteProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userIDStr, _ := userID.(string)
	if userIDStr == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	repo := getUserAccountRepo()
	if repo == nil {
		http.Error(w, "Service not initialized", http.StatusInternalServerError)
		return
	}

	if err := repo.DeleteAccount(r.Context(), userIDStr); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Error deleting user account %s: %v", userIDStr, err)
		http.Error(w, "Failed to delete profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Profile deleted successfully",
	})
}

// UpdateProfile updates the currently authenticated user's profile
func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := r.Context().Value("userID")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	ctx := context.Background()
	userRepo := repository.GetUserRepository()

	// Get existing user
	user, err := userRepo.GetByID(ctx, userID.(string))
	if err != nil {
		log.Printf("Error getting user: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if user == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Parse update request
	var req struct {
		Name     *string `json:"name"`
		Phone    *string `json:"phone"`
		Location *struct {
			City   string `json:"city"`
			Suburb string `json:"suburb"`
			Region string `json:"region"`
		} `json:"location"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update fields if provided
	if req.Name != nil {
		user.Name = *req.Name
	}
	if req.Phone != nil {
		user.Phone = req.Phone
	}
	if req.Location != nil {
		user.LocationCity = &req.Location.City
		user.LocationSuburb = &req.Location.Suburb
		user.LocationRegion = &req.Location.Region
	}

	// Save to database
	if err := userRepo.Update(ctx, user); err != nil {
		log.Printf("Error updating user: %v", err)
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": user.ToResponse(),
	})
}
