import { Location } from './common.types';
import { SellerDefaults } from './listing-sections.types';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  createdAt: string;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  violationCount?: number;
  isFlagged?: boolean;
  isAdmin?: boolean;
  location?: Location;
}

export interface UserProfile extends User {
  bio?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
  memberSince: string;
  lastActive: string;
  sellerDefaults?: SellerDefaults;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showLocation: boolean;
  };
  currency: string;
  language: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token?: string;
}
