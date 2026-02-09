import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';
export type AuthModalTab = 'login' | 'register';

interface OpenAuthModalOptions {
  tab?: AuthModalTab;
  returnUrl?: string | null;
}

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cartCount: number;
  addToCart: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAuthModalOpen: boolean;
  authModalDefaultTab: AuthModalTab;
  authModalReturnUrl: string | null;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
}

export const useStore = create<AppState>((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => {
    if (state.theme === 'dark') {
      return { theme: 'light' };
    }
    return { theme: 'dark' };
  }),
  cartCount: 2,
  addToCart: () => set((state) => ({ cartCount: state.cartCount + 1 })),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  isAuthModalOpen: false,
  authModalDefaultTab: 'login',
  authModalReturnUrl: null,
  openAuthModal: (options) => set({
    isAuthModalOpen: true,
    authModalDefaultTab: options?.tab ?? 'login',
    authModalReturnUrl: options?.returnUrl ?? null,
  }),
  closeAuthModal: () => set({
    isAuthModalOpen: false,
    authModalDefaultTab: 'login',
    authModalReturnUrl: null,
  }),
}));
