import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BackendListingsService } from '../services/listings.backend';
import { AuthService } from '../services/auth.service';

interface LikedItem {
  id: string;
  priceWhenLiked: number;
  likedAt: string;
}

interface FavoritesState {
  items: LikedItem[];
  toggleLike: (id: string, currentPrice: number) => void;
  isLiked: (id: string) => boolean;
  removeItem: (id: string) => void;
  clearFavorites: () => void;
  syncLikeWithBackend: (id: string, isCurrentlyLiked: boolean) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      toggleLike: (id, currentPrice) => {
        const exists = get().items.find(i => i.id === id);

        // Optimistically update local state
        if (exists) {
          set((state) => ({ items: state.items.filter(i => i.id !== id) }));
        } else {
          set((state) => ({
            items: [
              { id, priceWhenLiked: currentPrice, likedAt: new Date().toISOString() },
              ...state.items
            ]
          }));
        }

        // Only sync with backend if user is authenticated
        const token = AuthService.getStoredToken();
        if (token) {
          get().syncLikeWithBackend(id, !!exists);
        }
      },
      isLiked: (id) => !!get().items.find(i => i.id === id),
      removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),
      clearFavorites: () => set({ items: [] }),
      syncLikeWithBackend: async (id, wasLiked) => {
        try {
          if (wasLiked) {
            // Was liked, now unlike
            await BackendListingsService.unlikeListing(id);
          } else {
            // Was not liked, now like
            await BackendListingsService.likeListing(id);
          }
        } catch (error) {
          // If backend fails, log but don't revert - local state is still valid
        }
      },
    }),
    { name: 'justsell-favorites' }
  )
);