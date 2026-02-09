import { User, UserProfile } from '../types';
import { apiClient } from './api.client';
import { BackendListingsService } from './listings.backend';

interface UserResponse {
  user: User;
}


export const UsersService = {
  async getUserById(id: string) {
    try {
      const response = await apiClient.get<UserResponse>(`/api/users/${id}`);
      return {
        data: {
          data: response.user
        }
      };
    } catch (error) {
      return {
        data: {
          data: {} as User
        }
      };
    }
  },

  async getUserProfile(id: string) {
    // Alias for getUserById
    return this.getUserById(id);
  },

  async getPublicProfile(id: string) {
    // Fetch user, listings, and reviews in parallel (but tolerate partial failures)
    const [userRes, listingsRes, reviewsRes] = await Promise.allSettled([
      apiClient.get<UserResponse>(`/api/users/${id}`),
      BackendListingsService.getUserListings(id),
      apiClient.get<{ reviews: any[]; stats: any }>(`/api/users/${id}/reviews`)
    ]);

    if (userRes.status === 'rejected') {
      throw userRes.reason;
    }

    if (listingsRes.status === 'rejected') {
    }

    if (reviewsRes.status === 'rejected') {
    }

    const listings = listingsRes.status === 'fulfilled' ? (listingsRes.value.data?.data || []) : [];
    const reviews = reviewsRes.status === 'fulfilled' ? (reviewsRes.value.reviews || []) : [];
    const totalListings = listings.length;

    return {
      data: {
        data: {
          user: userRes.value.user,
          listings,
          reviews,
          stats: {
            totalListings,
            responseRate: '95%',
            responseTime: 'Usually within 1 hour'
          }
        }
      }
    };
  },

  async updateProfile(data: Partial<UserProfile>) {
    const response = await apiClient.put<{ user: User }>('/api/auth/me', data);
    return {
      data: {
        data: response.user
      }
    };
  }
};
