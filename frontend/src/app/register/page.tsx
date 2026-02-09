'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '../../store/useStore';
import { ROUTES } from '../../lib/routes';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openAuthModal = useStore((state) => state.openAuthModal);
  const { isAuthenticated, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated) return;

    const returnUrl = searchParams.get('returnUrl');

    if (isAuthenticated) {
      router.replace(returnUrl || ROUTES.HOME);
      return;
    }

    openAuthModal({ tab: 'register', returnUrl: returnUrl || null });
    router.replace(ROUTES.HOME);
  }, [hasHydrated, isAuthenticated, openAuthModal, router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
      <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
    </div>
  );
}
