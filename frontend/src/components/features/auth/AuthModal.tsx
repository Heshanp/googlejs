'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useAuthStore } from '../../../store/auth.store';
import { AuthService } from '../../../services/auth.service';
import { useToast } from '../../ui/Toast';
import Link from 'next/link';
import { SocialLoginButtons, SocialProviderId } from './SocialLoginButtons';
import { ChevronDown } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { useNavigation } from '../../../hooks/useNavigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { authModalDefaultTab, authModalReturnUrl } = useStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(authModalDefaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const store = useAuthStore();
  const { info, error: toastError, success: toastSuccess } = useToast();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const { navigate } = useNavigation();

  // Simple local state for form values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(authModalDefaultTab);
    setShowEmailForm(false);
  }, [isOpen, authModalDefaultTab]);

  const completeAuth = (userName: string) => {
    toastSuccess(`Welcome${userName ? `, ${userName}!` : ''}`);
    const redirectTo = authModalReturnUrl;
    onClose();
    if (redirectTo) {
      navigate(redirectTo);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (activeTab === 'login') {
        const response = await AuthService.login(email, password);
        if (response.user && response.token) {
          store.setAuth(response.user, response.token);
          AuthService.setToken(response.token);
          completeAuth(response.user.name.split(' ')[0] || '');
        }
      } else {
        const response = await AuthService.register({ name, email, password });
        if (response.user && response.token) {
          store.setAuth(response.user, response.token);
          AuthService.setToken(response.token);
          completeAuth(response.user.name.split(' ')[0] || '');
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setIsLoading(true);
    try {
      const response = await AuthService.googleLogin(credential);
      if (response.user && response.token) {
        store.setAuth(response.user, response.token);
        AuthService.setToken(response.token);
        completeAuth(response.user.name.split(' ')[0] || '');
      }
    } catch (err: any) {
      toastError(err.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: SocialProviderId) => {
    if (provider !== 'google') {
      info(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login coming soon!`);
    }
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setShowEmailForm(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" hideHeader>
      <div className="text-center mb-8 pt-2">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Welcome to Justsell</h2>
        <p className="text-gray-500 mt-2 font-medium">Join the community to buy and sell</p>
      </div>

      <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl mb-8">
        <button
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'login' ? 'bg-white dark:bg-neutral-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => handleTabChange('login')}
        >
          Login
        </button>
        <button
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'register' ? 'bg-white dark:bg-neutral-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => handleTabChange('register')}
        >
          Sign Up
        </button>
      </div>

      <div className="mb-8">
        <SocialLoginButtons
          onGoogleSuccess={handleGoogleSuccess}
          onProviderClick={handleSocialLogin}
          isLoading={isLoading}
        />
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-app-color" />
        </div>
        <div className="relative flex justify-center">
          <button
            type="button"
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="bg-white dark:bg-neutral-900 px-4 text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2 transition-colors"
          >
            {showEmailForm ? 'Hide email options' : `Or ${activeTab === 'login' ? 'login' : 'sign up'} with email`}
            <span className={`transition-transform duration-200 ${showEmailForm ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>

      {showEmailForm && (
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 pb-2">
          {activeTab === 'register' && (
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Doe"
              autoComplete="name"
            />
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
          />

          {activeTab === 'login' && (
            <div className="text-right">
              <Link href="/forgot-password" onClick={onClose} className="text-xs font-medium text-primary-600 hover:underline">
                Forgot Password?
              </Link>
            </div>
          )}

          <Button type="submit" fullWidth isLoading={isLoading} size="lg" className="mt-2">
            {activeTab === 'login' ? 'Log In' : 'Create Account'}
          </Button>
        </form>
      )}
    </Modal>
  );
};
