'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useFavoritesStore } from '../store/favorites.store';
import { useStore } from '../store/useStore';
import { useAuth } from './useAuth';

export const useFavorites = () => {
  const { items, toggleLike, isLiked, removeItem } = useFavoritesStore();
  const { openAuthModal } = useStore();
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const handleToggleLike = (id: string, price: number) => {
    if (!isAuthenticated) {
      openAuthModal({ tab: 'login', returnUrl: currentPath });
      return;
    }
    toggleLike(id, price);
  };

  return {
    favorites: items,
    toggleLike: handleToggleLike,
    isLiked,
    removeFavorite: removeItem,
    count: items.length
  };
};
