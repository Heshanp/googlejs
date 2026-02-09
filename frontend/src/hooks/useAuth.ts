'use client';

import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { AuthService } from '../services/auth.service';
import { useToast } from '../components/ui/Toast';
import { useNavigation } from './useNavigation';

export const useAuth = () => {
  const store = useAuthStore();
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [isLoading, setIsLoading] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();
  const { navigate } = useNavigation();

  const login = async (email: string, password: string, redirect = '/') => {
    setIsLoading(true);
    try {
      const response = await AuthService.login(email, password);
      if (response.user && response.token) {
        store.setAuth(response.user, response.token);
        AuthService.setToken(response.token);
        toastSuccess(`Welcome back, ${response.user.name.split(' ')[0]}!`);
        if (redirect) navigate(redirect);
        return true;
      }
    } catch (err: any) {
      toastError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const register = async (data: any, redirect = '/verify-email') => {
    setIsLoading(true);
    try {
      const response = await AuthService.register(data);
      if (response.user && response.token) {
        store.setAuth(response.user, response.token);
        AuthService.setToken(response.token);
        if (redirect) navigate(redirect);
        return true;
      }
    } catch (err: any) {
      toastError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const logout = async (redirect = '/login') => {
    try {
      await AuthService.logout();
      store.logout();
      if (redirect) navigate(redirect);
    } catch (err) {
    }
  };

  return {
    ...store,
    hasHydrated,
    isLoading,
    login,
    register,
    logout,
  };
};