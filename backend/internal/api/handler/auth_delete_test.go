package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yourusername/justsell/backend/internal/repository"
)

type fakeUserAccountRepo struct {
	err       error
	called    bool
	gotUserID string
}

func (f *fakeUserAccountRepo) DeleteAccount(ctx context.Context, userID string) error {
	f.called = true
	f.gotUserID = userID
	return f.err
}

func TestDeleteProfile_MethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	w := httptest.NewRecorder()

	DeleteProfile(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected %d, got %d", http.StatusMethodNotAllowed, w.Code)
	}
}

func TestDeleteProfile_Unauthorized_NoUserID(t *testing.T) {
	req := httptest.NewRequest(http.MethodDelete, "/api/auth/me", nil)
	w := httptest.NewRecorder()

	DeleteProfile(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestDeleteProfile_UsesRepoAndReturnsOK(t *testing.T) {
	original := userAccountRepo
	defer SetUserAccountRepo(original)

	fake := &fakeUserAccountRepo{}
	SetUserAccountRepo(fake)

	req := httptest.NewRequest(http.MethodDelete, "/api/auth/me", nil)
	req = req.WithContext(context.WithValue(req.Context(), "userID", "user-123"))
	w := httptest.NewRecorder()

	DeleteProfile(w, req)

	if !fake.called {
		t.Fatal("expected DeleteAccount to be called")
	}
	if fake.gotUserID != "user-123" {
		t.Fatalf("expected userID %q, got %q", "user-123", fake.gotUserID)
	}
	if w.Code != http.StatusOK {
		t.Fatalf("expected %d, got %d", http.StatusOK, w.Code)
	}
}

func TestDeleteProfile_UserNotFound(t *testing.T) {
	original := userAccountRepo
	defer SetUserAccountRepo(original)

	SetUserAccountRepo(&fakeUserAccountRepo{err: repository.ErrUserNotFound})

	req := httptest.NewRequest(http.MethodDelete, "/api/auth/me", nil)
	req = req.WithContext(context.WithValue(req.Context(), "userID", "user-123"))
	w := httptest.NewRecorder()

	DeleteProfile(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected %d, got %d", http.StatusNotFound, w.Code)
	}
}

func TestDeleteProfile_InternalError(t *testing.T) {
	original := userAccountRepo
	defer SetUserAccountRepo(original)

	SetUserAccountRepo(&fakeUserAccountRepo{err: context.DeadlineExceeded})

	req := httptest.NewRequest(http.MethodDelete, "/api/auth/me", nil)
	req = req.WithContext(context.WithValue(req.Context(), "userID", "user-123"))
	w := httptest.NewRecorder()

	DeleteProfile(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected %d, got %d", http.StatusInternalServerError, w.Code)
	}
}

