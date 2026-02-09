package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	Avatar         *string   `json:"avatar,omitempty"`
	GoogleID       *string   `json:"google_id,omitempty"`
	Phone          *string   `json:"phone,omitempty"`
	IsVerified     bool      `json:"is_verified"`
	Rating         float64   `json:"rating"`
	ReviewCount    int       `json:"review_count"`
	LocationCity   *string   `json:"location_city,omitempty"`
	LocationSuburb *string   `json:"location_suburb,omitempty"`
	LocationRegion *string   `json:"location_region,omitempty"`
	ViolationCount int       `json:"violation_count"`
	IsFlagged      bool      `json:"is_flagged"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// UserResponse is the user data returned to the frontend
type UserResponse struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	Avatar         *string   `json:"avatar,omitempty"`
	Phone          *string   `json:"phone,omitempty"`
	IsVerified     bool      `json:"isVerified"`
	Rating         float64   `json:"rating"`
	ReviewCount    int       `json:"reviewCount"`
	ViolationCount int       `json:"violationCount"`
	IsFlagged      bool      `json:"isFlagged"`
	IsAdmin        bool      `json:"isAdmin,omitempty"`
	CreatedAt      string    `json:"createdAt"`
	Location       *Location `json:"location,omitempty"`
}

// Location represents a user's location
type Location struct {
	City   string `json:"city,omitempty"`
	Suburb string `json:"suburb,omitempty"`
	Region string `json:"region,omitempty"`
}

// ToResponse converts a User to UserResponse for the frontend
func (u *User) ToResponse() UserResponse {
	resp := UserResponse{
		ID:             u.ID,
		Email:          u.Email,
		Name:           u.Name,
		Avatar:         u.Avatar,
		Phone:          u.Phone,
		IsVerified:     u.IsVerified,
		Rating:         u.Rating,
		ReviewCount:    u.ReviewCount,
		ViolationCount: u.ViolationCount,
		IsFlagged:      u.IsFlagged,
		CreatedAt:      u.CreatedAt.Format(time.RFC3339),
	}

	// Add location if any field is set
	if u.LocationCity != nil || u.LocationSuburb != nil || u.LocationRegion != nil {
		resp.Location = &Location{}
		if u.LocationCity != nil {
			resp.Location.City = *u.LocationCity
		}
		if u.LocationSuburb != nil {
			resp.Location.Suburb = *u.LocationSuburb
		}
		if u.LocationRegion != nil {
			resp.Location.Region = *u.LocationRegion
		}
	}

	return resp
}

// GoogleAuthRequest is the request body for Google OAuth login
type GoogleAuthRequest struct {
	Credential string `json:"credential"`
}

// AuthResponse is returned after successful authentication
type AuthResponse struct {
	User  UserResponse `json:"user"`
	Token string       `json:"token"`
}

// GoogleTokenInfo represents the response from Google's tokeninfo endpoint
type GoogleTokenInfo struct {
	Iss           string `json:"iss"`
	Azp           string `json:"azp"`
	Aud           string `json:"aud"`
	Sub           string `json:"sub"` // Google user ID
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Iat           string `json:"iat"`
	Exp           string `json:"exp"`
}
