'use client';

import React from 'react';
import { Button } from '../../ui/Button';
import { GoogleLogin } from '@react-oauth/google';

export type SocialProviderId = 'google' | 'facebook' | 'apple';

interface SocialProviderConfig {
  id: SocialProviderId;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  className?: string;
  iconColor?: string;
}

interface SocialLoginButtonsProps {
  onGoogleSuccess?: (credential: string) => void;
  onProviderClick?: (provider: SocialProviderId) => void;
  isLoading?: boolean;
}

// Official Google "G" Logo
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// Facebook "f" Logo
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 2.848-6.463 6.388-6.463 1.084 0 2.531.143 2.531.143v3.461h-2.228c-1.797 0-2.268.837-2.268 2.344v2.095h3.893l-.537 3.667h-3.356v7.98h-4.422z" />
  </svg>
);

// Apple Logo
const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.127 3.675-.552 9.127 1.519 12.153 1.015 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.038-3.052 2.48-4.519 2.597-4.597-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onGoogleSuccess,
  onProviderClick,
  isLoading = false
}) => {
  // Use Google One Tap / Popup for Google login
  const handleGoogleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential && onGoogleSuccess) {
      onGoogleSuccess(credentialResponse.credential);
    } else {
    }
  };

  const handleGoogleError = () => {
    onProviderClick?.('google');
  };

  // Other providers (coming soon)
  const otherProviders: SocialProviderConfig[] = [
    {
      id: 'facebook',
      label: 'Facebook',
      icon: FacebookIcon,
      iconColor: "text-[#1877F2]"
    },
    {
      id: 'apple',
      label: 'Apple',
      icon: AppleIcon,
      iconColor: "text-black dark:text-white"
    }
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Google Login - Uses official Google button via ID token flow */}
      <div className="w-full flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="outline"
          size="large"
          width="100%"
          text="continue_with"
          shape="rectangular"
          logo_alignment="left"
          useOneTap={false}
        />
      </div>

      {/* Other providers - Coming soon */}
      {otherProviders.map((provider) => {
        const Icon = provider.icon;
        return (
          <Button
            key={provider.id}
            type="button"
            variant="glass"
            onClick={() => onProviderClick?.(provider.id)}
            disabled={isLoading}
            className={`w-full relative h-12 rounded-xl font-medium text-sm sm:text-base ${provider.className || ''}`}
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6">
              <Icon className={`w-5 h-5 ${provider.iconColor || ''}`} />
            </div>
            <span className="w-full text-center">Continue with {provider.label}</span>
          </Button>
        );
      })}
    </div>
  );
};
