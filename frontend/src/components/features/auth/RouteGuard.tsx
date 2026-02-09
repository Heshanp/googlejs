'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ROUTES } from '../../../lib/routes';
import { isAdminPath, isPathProtected } from '../../../lib/auth/protected-routes';
import { useAuthStore } from '../../../store/auth.store';
import { AuthService } from '../../../services/auth.service';
import { useStore } from '../../../store/useStore';

interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const openAuthModal = useStore((state) => state.openAuthModal);

  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const validatedTokenRef = useRef<string | null>(null);
  const authPromptPathRef = useRef<string | null>(null);

  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const protectedPath = isPathProtected(pathname);
  const adminPath = isAdminPath(pathname);

  useEffect(() => {
    if (!hasHydrated || !protectedPath) {
      setIsRestoringSession(false);
      return;
    }

    const storedToken = AuthService.getStoredToken();
    if (!storedToken) {
      validatedTokenRef.current = null;
      if (isAuthenticated || user) {
        logout();
      }
      setIsRestoringSession(false);
      return;
    }

    // Avoid re-validating the same token repeatedly on every render.
    if (isAuthenticated && user && validatedTokenRef.current === storedToken) {
      setIsRestoringSession(false);
      return;
    }

    let isActive = true;
    setIsRestoringSession(true);

    void AuthService.getCurrentUser()
      .then((currentUser) => {
        if (!isActive) return;
        if (currentUser) {
          validatedTokenRef.current = storedToken;
          setAuth(currentUser, storedToken);
          return;
        }
        validatedTokenRef.current = null;
        logout();
      })
      .catch(() => {
        if (!isActive) return;
        validatedTokenRef.current = null;
        logout();
      })
      .finally(() => {
        if (isActive) {
          setIsRestoringSession(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [hasHydrated, protectedPath, isAuthenticated, user, setAuth, logout]);

  useEffect(() => {
    if (!hasHydrated || !protectedPath || isRestoringSession) return;

    if (!isAuthenticated || !user) {
      if (authPromptPathRef.current !== currentPath) {
        authPromptPathRef.current = currentPath;
        openAuthModal({ tab: 'login', returnUrl: currentPath });
      }
      router.replace(ROUTES.HOME);
      return;
    }

    authPromptPathRef.current = null;

    if (adminPath && !user.isAdmin) {
      router.replace(ROUTES.PROFILE);
    }
  }, [hasHydrated, protectedPath, isRestoringSession, isAuthenticated, user, adminPath, currentPath, router, openAuthModal]);

  if (protectedPath && (!hasHydrated || isRestoringSession)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (protectedPath && (!isAuthenticated || !user)) {
    return null;
  }

  if (adminPath && user && !user.isAdmin) {
    return null;
  }

  return <>{children}</>;
};
