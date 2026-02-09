package service

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strconv"
	"strings"
)

// EmailService sends transactional emails.
type EmailService struct {
	host     string
	port     int
	username string
	password string
	from     string
}

// NewEmailServiceFromEnv constructs an email service from SMTP environment variables.
func NewEmailServiceFromEnv() *EmailService {
	port := 587
	if raw := strings.TrimSpace(os.Getenv("SMTP_PORT")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			port = parsed
		}
	}

	return &EmailService{
		host:     strings.TrimSpace(os.Getenv("SMTP_HOST")),
		port:     port,
		username: strings.TrimSpace(os.Getenv("SMTP_USERNAME")),
		password: os.Getenv("SMTP_PASSWORD"),
		from:     strings.TrimSpace(os.Getenv("SMTP_FROM")),
	}
}

// IsConfigured reports whether SMTP configuration is present.
func (s *EmailService) IsConfigured() bool {
	return s != nil && s.host != "" && s.username != "" && s.password != "" && s.from != ""
}

// SendModerationBlockedEmail sends a neutral moderation notification email.
func (s *EmailService) SendModerationBlockedEmail(toEmail, listingTitle, summary, severity string) error {
	toEmail = strings.TrimSpace(toEmail)
	if toEmail == "" {
		return nil
	}

	if s == nil || !s.IsConfigured() {
		log.Printf("[EMAIL] SMTP not configured, skipping moderation email to %s", toEmail)
		return nil
	}

	subject := "Listing update: review required"
	body := fmt.Sprintf("Hello,\n\nYour listing \"%s\" needs manual review before it can be published.\n\nStatus: Pending review\nSeverity: %s\nDetails: %s\n\nIf this is a false positive, our team can release it after review.\n\n- JustSell Trust & Safety", listingTitle, severity, summary)

	message := strings.Join([]string{
		fmt.Sprintf("From: %s", s.from),
		fmt.Sprintf("To: %s", toEmail),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	auth := smtp.PlainAuth("", s.username, s.password, s.host)
	if err := smtp.SendMail(addr, auth, s.from, []string{toEmail}, []byte(message)); err != nil {
		return fmt.Errorf("send moderation email: %w", err)
	}

	return nil
}
