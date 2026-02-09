'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { usePathname } from 'next/navigation';
import { useNavigation } from '../../../hooks/useNavigation';
import { Loader2 } from 'lucide-react';
import { AuthService } from '../../../services/auth.service';
import { useStore } from '../../../store/useStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, setAuth, logout } = useAuthStore();
  const { navigate } = useNavigation();
  const pathname = usePathname();
  const { searchParams } = useNavigation();
  const openAuthModal = useStore((state) => state.openAuthModal);
  const [isChecking, setIsChecking] = React.useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // If we have state in store, verify it's still valid with backend or assume valid for now
      if (isAuthenticated && user) {
        setIsChecking(false);
        return;
      }

      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          setAuth(currentUser, 'restored-token');
        } else {
          // No user found, redirect home and open auth modal with return URL
          const search = searchParams.toString();
          const fullPath = search ? `${pathname}?${search}` : pathname;
          openAuthModal({ tab: 'login', returnUrl: fullPath });
          navigate('/');
        }
      } catch {
        logout();
        const search = searchParams.toString();
        const fullPath = search ? `${pathname}?${search}` : pathname;
        openAuthModal({ tab: 'login', returnUrl: fullPath });
        navigate('/');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [isAuthenticated, user, navigate, pathname, searchParams, setAuth, logout, openAuthModal]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};
