package service

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// S3Service handles image uploads to S3
type S3Service struct {
	client     *s3.Client
	bucketName string
	region     string
}

// UploadResult contains the result of an S3 upload
type UploadResult struct {
	URL      string
	Key      string
	Filename string
}

// NewS3Service creates a new S3 service
func NewS3Service(ctx context.Context, bucketName, region string) (*S3Service, error) {
	if bucketName == "" {
		return nil, fmt.Errorf("S3 bucket name is required")
	}
	if region == "" {
		region = "ap-southeast-2" // Default to Sydney
	}

	// Load AWS config - uses EC2 instance role or environment credentials
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg)

	return &S3Service{
		client:     client,
		bucketName: bucketName,
		region:     region,
	}, nil
}

// Upload uploads image data to S3 and returns the public URL
func (s *S3Service) Upload(ctx context.Context, data []byte, originalFilename, contentType string) (*UploadResult, error) {
	// Generate unique key with date-based path
	now := time.Now()
	ext := getExtension(originalFilename, contentType)
	key := fmt.Sprintf("listings/%d/%02d/%s%s", now.Year(), now.Month(), uuid.New().String(), ext)

	// Upload to S3
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Construct public URL
	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucketName, s.region, key)

	return &UploadResult{
		URL:      url,
		Key:      key,
		Filename: key,
	}, nil
}

// IsConfigured returns true if the S3 service is properly configured
func (s *S3Service) IsConfigured() bool {
	return s != nil && s.client != nil && s.bucketName != ""
}

// getExtension extracts or determines file extension
func getExtension(filename, contentType string) string {
	// Try to get extension from filename
	if idx := strings.LastIndex(filename, "."); idx != -1 {
		return strings.ToLower(filename[idx:])
	}

	// Fallback based on content type
	switch contentType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".jpg"
	}
}
