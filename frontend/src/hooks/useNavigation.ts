'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams as useNextSearchParams } from 'next/navigation';
import { ROUTES } from '../lib/routes';
import { useAuthStore } from '../store/auth.store';
import { AuthService } from '../services/auth.service';
import { useStore } from '../store/useStore';

export const useNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const openAuthModal = useStore((state) => state.openAuthModal);

  const navigate = useCallback((path: string | number) => {
    if (typeof path === 'number') {
      router.back();
    } else {
      router.push(path);
    }
  }, [router]);

  const navigateToListing = useCallback((id: string) => navigate(ROUTES.LISTING(id)), [navigate]);
  const navigateToCategory = useCallback((slug: string) => navigate(ROUTES.CATEGORY(slug)), [navigate]);
  const navigateToUser = useCallback((id: string) => navigate(ROUTES.USER_PROFILE(id)), [navigate]);
  const navigateToConversation = useCallback((id: string) => navigate(ROUTES.CONVERSATION(id)), [navigate]);

  const navigateWithAuth = useCallback((path: string) => {
    // Wait for hydration before checking auth state to prevent false redirects
    if (!hasHydrated) {
      const hasStoredToken = !!AuthService.getStoredToken();
      if (hasStoredToken) {
        router.push(path);
      } else {
        openAuthModal({ tab: 'login', returnUrl: path });
      }
      return;
    }

    if (isAuthenticated) {
      router.push(path);
    } else {
      openAuthModal({ tab: 'login', returnUrl: path });
    }
  }, [isAuthenticated, hasHydrated, router, openAuthModal]);

  const goBack = useCallback((fallback = ROUTES.HOME) => {
    if (window.history.state && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }, [router]);

  const updateSearchParams = useCallback((params: Record<string, string | number | boolean | (string | number | boolean)[] | null | undefined>) => {
    const newParams = new URLSearchParams(searchParams?.toString() || '');

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        newParams.delete(key);
        value.forEach(v => newParams.append(key, String(v)));
      } else {
        newParams.set(key, String(value));
      }
    });

    const queryString = newParams.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`);
  }, [pathname, router, searchParams]);

  const isActivePath = useCallback((path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  }, [pathname]);

  return {
    navigate,
    navigateToListing,
    navigateToCategory,
    navigateToUser,
    navigateToConversation,
    navigateWithAuth,
    goBack,
    updateSearchParams,
    isActivePath,
    currentPath: pathname,
    searchParams,
    setSearchParams: updateSearchParams // Alias for compatibility
  };
};
