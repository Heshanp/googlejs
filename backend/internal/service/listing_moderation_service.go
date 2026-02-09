package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/yourusername/justsell/backend/internal/models"
	"github.com/yourusername/justsell/backend/internal/repository"
)

// ListingModerationService coordinates moderation, caching, audit, and violations.
type ListingModerationService struct {
	aiModeration      *ModerationService
	moderationRepo    *repository.ModerationRepository
	listingRepo       *repository.ListingRepository
	userRepo          *repository.UserRepository
	notificationSvc   *NotificationService
	emailSvc          *EmailService
	cacheTTL          time.Duration
	idempotencyTTL    time.Duration
	autoFlagThreshold int
}

// ModerationExecution captures a moderation run and side effects.
type ModerationExecution struct {
	Result               models.ModerationResult
	Fingerprint          string
	FromCache            bool
	ViolationIncremented bool
	ViolationCount       int
	UserFlagged          bool
}

// NewListingModerationService creates a reusable moderation coordinator.
func NewListingModerationService(
	aiModeration *ModerationService,
	moderationRepo *repository.ModerationRepository,
	listingRepo *repository.ListingRepository,
	userRepo *repository.UserRepository,
	notificationSvc *NotificationService,
	emailSvc *EmailService,
	cacheTTL time.Duration,
	idempotencyTTL time.Duration,
	autoFlagThreshold int,
) *ListingModerationService {
	if cacheTTL <= 0 {
		cacheTTL = 2 * time.Hour
	}
	if idempotencyTTL <= 0 {
		idempotencyTTL = 24 * time.Hour
	}
	if autoFlagThreshold <= 0 {
		autoFlagThreshold = 3
	}

	return &ListingModerationService{
		aiModeration:      aiModeration,
		moderationRepo:    moderationRepo,
		listingRepo:       listingRepo,
		userRepo:          userRepo,
		notificationSvc:   notificationSvc,
		emailSvc:          emailSvc,
		cacheTTL:          cacheTTL,
		idempotencyTTL:    idempotencyTTL,
		autoFlagThreshold: autoFlagThreshold,
	}
}

// EvaluateAndApply moderates listing content and persists moderation outcomes.
func (s *ListingModerationService) EvaluateAndApply(
	ctx context.Context,
	listing *models.Listing,
	userID string,
	userEmail string,
	imageRefs []string,
) (*ModerationExecution, error) {
	if s == nil || s.moderationRepo == nil || s.listingRepo == nil {
		return nil, fmt.Errorf("moderation service not initialized")
	}
	if listing == nil {
		return nil, fmt.Errorf("listing is required")
	}

	fingerprint := BuildContentFingerprint(listing.Title, listing.Description, imageRefs)

	result, fromCache, err := s.evaluate(ctx, listing.Title, listing.Description, imageRefs, fingerprint)
	if err != nil {
		return nil, err
	}

	exec := &ModerationExecution{
		Result:      result,
		Fingerprint: fingerprint,
		FromCache:   fromCache,
	}

	listingID := listing.ID
	listingIDPtr := &listingID
	userIDPtr := &userID
	if strings.TrimSpace(userID) == "" {
		userIDPtr = nil
	}

	if auditErr := s.moderationRepo.InsertAudit(ctx, listingIDPtr, userIDPtr, fingerprint, result); auditErr != nil {
		return nil, auditErr
	}

	switch result.Decision {
	case models.ModerationDecisionClean:
		if err := s.listingRepo.UpdateModerationOutcome(
			ctx,
			listing.ID,
			models.ListingStatusActive,
			models.ListingModerationStatusClean,
			&result,
			fingerprint,
		); err != nil {
			return nil, err
		}
		listing.Status = string(models.ListingStatusActive)
		listing.ModerationStatus = models.ListingModerationStatusClean
	case models.ModerationDecisionFlagged:
		if err := s.listingRepo.UpdateModerationOutcome(
			ctx,
			listing.ID,
			models.ListingStatusPendingReview,
			models.ListingModerationStatusFlagged,
			&result,
			fingerprint,
		); err != nil {
			return nil, err
		}
		listing.Status = string(models.ListingStatusPendingReview)
		listing.ModerationStatus = models.ListingModerationStatusFlagged

		if strings.TrimSpace(userID) != "" {
			inserted, violationCount, isFlagged, violationErr := s.moderationRepo.RecordViolationIfNew(
				ctx,
				userID,
				listingIDPtr,
				fingerprint,
				result,
				s.autoFlagThreshold,
			)
			if violationErr != nil {
				return nil, violationErr
			}

			exec.ViolationIncremented = inserted
			exec.ViolationCount = violationCount
			exec.UserFlagged = isFlagged

			if result.Severity == models.ModerationSeverityCritical || result.FlagProfile {
				exec.UserFlagged = true
				if s.userRepo != nil {
					if flagErr := s.userRepo.SetFlagStatus(ctx, userID, true); flagErr != nil {
						return nil, flagErr
					}
				}
			}
		}

		s.sendFlagNotifications(ctx, userID, userEmail, listing, result)
	default:
		if err := s.listingRepo.UpdateModerationOutcome(
			ctx,
			listing.ID,
			models.ListingStatusPendingReview,
			models.ListingModerationStatusError,
			&result,
			fingerprint,
		); err != nil {
			return nil, err
		}
		listing.Status = string(models.ListingStatusPendingReview)
		listing.ModerationStatus = models.ListingModerationStatusError
	}

	listing.ModerationSeverity = result.Severity
	listing.ModerationSummary = result.Summary
	listing.ModerationFlagProfile = result.FlagProfile
	listing.ModerationFingerprint = fingerprint
	now := time.Now()
	listing.ModerationCheckedAt = &now

	return exec, nil
}

func (s *ListingModerationService) evaluate(
	ctx context.Context,
	title string,
	description string,
	imageRefs []string,
	fingerprint string,
) (models.ModerationResult, bool, error) {
	if cached, err := s.moderationRepo.GetCachedDecision(ctx, fingerprint, time.Now()); err == nil && cached != nil {
		cached.Source = "cache"
		return *cached, true, nil
	} else if err != nil {
		return models.ModerationResult{}, false, err
	}

	if s.aiModeration == nil {
		result := fallbackModerationResult("Publishing is taking longer than usual. Listing sent for manual review.")
		result.Source = "fallback_error"
		return result, false, nil
	}

	result, err := s.aiModeration.ModerateListing(ctx, ModerationInput{
		Title:       title,
		Description: description,
		ImageURLs:   imageRefs,
	})
	if err != nil {
		// Fallback result is returned by ModerateListing on hard failure.
		if result.Decision == "" {
			result = fallbackModerationResult("Publishing is taking longer than usual. Listing sent for manual review.")
		}
	}

	if result.Source == "" {
		result.Source = "ai"
	}

	if result.Source == "ai" {
		if cacheErr := s.moderationRepo.UpsertCachedDecision(ctx, fingerprint, result, s.cacheTTL); cacheErr != nil {
			return models.ModerationResult{}, false, cacheErr
		}
	}

	return result, false, nil
}

func (s *ListingModerationService) sendFlagNotifications(
	ctx context.Context,
	userID,
	userEmail string,
	listing *models.Listing,
	result models.ModerationResult,
) {
	if listing == nil {
		return
	}

	if strings.TrimSpace(userEmail) != "" && s.emailSvc != nil {
		_ = s.emailSvc.SendModerationBlockedEmail(userEmail, listing.Title, result.Summary, string(result.Severity))
	}

	if strings.TrimSpace(userID) == "" || s.notificationSvc == nil {
		return
	}

	listingID := int64(listing.ID)
	metadata := map[string]any{
		"moderationStatus": "pending_review",
		"severity":         result.Severity,
		"summary":          result.Summary,
		"violations":       result.Violations,
	}
	_, _ = s.notificationSvc.Notify(ctx, models.CreateNotificationInput{
		UserID:    userID,
		Type:      models.NotificationTypeSystem,
		Title:     "Listing pending review",
		Body:      "Publishing is taking longer than usual. Our team is reviewing your listing.",
		ListingID: &listingID,
		Metadata:  metadata,
	}, true)
}

// CheckIdempotency validates and fetches a replay-safe publish response.
// Returns: stored response body, stored status, shouldReplay, conflictError.
func (s *ListingModerationService) CheckIdempotency(
	ctx context.Context,
	userID,
	idempotencyKey,
	requestFingerprint string,
) (json.RawMessage, int, bool, error) {
	if s == nil || s.moderationRepo == nil {
		return nil, 0, false, nil
	}
	if strings.TrimSpace(idempotencyKey) == "" || strings.TrimSpace(userID) == "" {
		return nil, 0, false, nil
	}

	record, err := s.moderationRepo.GetIdempotencyRecord(ctx, userID, idempotencyKey, time.Now())
	if err != nil {
		return nil, 0, false, err
	}
	if record == nil {
		return nil, 0, false, nil
	}

	if strings.TrimSpace(record.RequestFingerprint) != strings.TrimSpace(requestFingerprint) {
		return nil, 0, false, fmt.Errorf("idempotency key already used with different payload")
	}

	return record.ResponseBody, record.ResponseStatus, true, nil
}

// StoreIdempotencyResponse stores a publish response for safe retries.
func (s *ListingModerationService) StoreIdempotencyResponse(
	ctx context.Context,
	userID,
	idempotencyKey,
	requestFingerprint string,
	status int,
	body any,
) error {
	if s == nil || s.moderationRepo == nil {
		return nil
	}
	return s.moderationRepo.SaveIdempotencyRecord(
		ctx,
		userID,
		idempotencyKey,
		requestFingerprint,
		status,
		body,
		s.idempotencyTTL,
	)
}
