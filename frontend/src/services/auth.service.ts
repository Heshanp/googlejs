import { User, AuthState } from '../types';
import { apiClient } from './api.client';

export interface GoogleLoginResponse {
  user: User;
  token: string;
}

export const AuthService = {
  async login(email: string, password: string): Promise<AuthState> {
    // TODO: Implement backend auth endpoint for email/password
    throw new Error('Email/password authentication not yet implemented');
  },

  async register(data: any): Promise<AuthState> {
    // TODO: Implement backend registration endpoint
    throw new Error('Registration not yet implemented');
  },

  async googleLogin(credential: string): Promise<GoogleLoginResponse> {
    const response = await apiClient.post<GoogleLoginResponse>('/api/auth/google', {
      credential,
    });
    return response;
  },

  async logout(): Promise<void> {
    // Clear local storage token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('justsell-auth-token');
    }
  },

  async deleteProfile(): Promise<void> {
    await apiClient.delete<{ message: string }>('/api/auth/me');
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('justsell-auth-token')
        : null;

      if (!token) return null;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, clear it
          localStorage.removeItem('justsell-auth-token');
          return null;
        }
        throw new Error('Failed to get current user');
      }

      return response.json();
    } catch (error) {
      return null;
    }
  },

  async forgotPassword(email: string) {
    // TODO: Implement backend password reset endpoint
    throw new Error('Password reset not yet implemented');
  },

  getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('justsell-auth-token');
    }
    return null;
  },

  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('justsell-auth-token', token);
    }
  },

  getCurrentUserId(): string | null {
    const token = this.getStoredToken();
    if (!token) return null;

    try {
      // Decode JWT payload (base64)
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.sub || decoded.userId || null;
    } catch {
      return null;
    }
  },
};
