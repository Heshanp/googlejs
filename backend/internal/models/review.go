package models

import "time"

// Review represents a user review after a completed transaction
type Review struct {
	ID         string    `json:"id"`
	ListingID  int       `json:"listingId"`
	ReviewerID string    `json:"reviewerId"`
	RevieweeID string    `json:"revieweeId"`
	Rating     int       `json:"rating"` // 1-5
	Comment    *string   `json:"comment,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`

	// Joined fields (not stored in reviews table)
	ReviewerName   string  `json:"reviewerName,omitempty"`
	ReviewerAvatar *string `json:"reviewerAvatar,omitempty"`
	ListingTitle   string  `json:"listingTitle,omitempty"`
}

// CreateReviewInput contains fields for creating a new review
type CreateReviewInput struct {
	ListingID  int
	ReviewerID string
	RevieweeID string
	Rating     int
	Comment    *string
}

// ReviewStats contains aggregated review statistics for a user
type ReviewStats struct {
	AverageRating float64     `json:"averageRating"`
	TotalReviews  int         `json:"totalReviews"`
	Breakdown     map[int]int `json:"breakdown"` // rating -> count
}

// PendingReview represents a transaction where the user can still leave a review
type PendingReview struct {
	ListingID        int     `json:"listingId"`
	ListingTitle     string  `json:"listingTitle"`
	ListingImage     *string `json:"listingImage,omitempty"`
	OtherPartyID     string  `json:"otherPartyId"`
	OtherPartyName   string  `json:"otherPartyName"`
	OtherPartyAvatar *string `json:"otherPartyAvatar,omitempty"`
	Role             string  `json:"role"` // "buyer" or "seller"
	SoldAt           string  `json:"soldAt"`
}
