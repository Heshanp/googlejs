package models

import "time"

// ListingImage represents an image attached to a listing
type ListingImage struct {
	ID              int        `json:"id"`
	ListingID       int        `json:"listingId"`
	URL             string     `json:"url"`
	Filename        string     `json:"filename"`
	DisplayOrder    int        `json:"displayOrder"`
	IsActive        bool       `json:"isActive"`
	SourceImageID   *int       `json:"sourceImageId,omitempty"`
	VariantType     *string    `json:"variantType,omitempty"`
	AIModel         *string    `json:"aiModel,omitempty"`
	AIPromptVersion *string    `json:"aiPromptVersion,omitempty"`
	AIGeneratedAt   *time.Time `json:"aiGeneratedAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
}
