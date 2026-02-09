package service

import (
	"os"
	"strings"
)

// AdminAccess defines admin email allowlist checks.
type AdminAccess struct {
	allowed map[string]struct{}
}

var adminAccess *AdminAccess

// InitAdminAccess initializes admin access control from env.
func InitAdminAccess(emailsCSV string) {
	adminAccess = NewAdminAccess(emailsCSV)
}

// NewAdminAccess creates admin access checker from comma-separated emails.
func NewAdminAccess(emailsCSV string) *AdminAccess {
	allowed := make(map[string]struct{})
	for _, raw := range strings.Split(emailsCSV, ",") {
		email := strings.ToLower(strings.TrimSpace(raw))
		if email == "" {
			continue
		}
		allowed[email] = struct{}{}
	}
	return &AdminAccess{allowed: allowed}
}

// GetAdminAccess returns the global admin access checker.
func GetAdminAccess() *AdminAccess {
	if adminAccess == nil {
		adminAccess = NewAdminAccess(os.Getenv("ADMIN_EMAILS"))
	}
	return adminAccess
}

// IsAdminEmail checks whether an email is in the admin allowlist.
func (a *AdminAccess) IsAdminEmail(email string) bool {
	if a == nil {
		return false
	}
	_, ok := a.allowed[strings.ToLower(strings.TrimSpace(email))]
	return ok
}
