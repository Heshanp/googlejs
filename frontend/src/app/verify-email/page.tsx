'use client';

import React, { useEffect, useState } from 'react';
import { useNavigation } from '../../hooks/useNavigation';
import { Button } from '../../components/ui/Button';
import { Loader2, Mail } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export default function VerifyEmailPage() {
  const { navigate } = useNavigation();
  const [isVerifying, setIsVerifying] = useState(true);
  const { success } = useToast();

  useEffect(() => {
    // Simulate auto-verification
    const timer = setTimeout(() => {
      setIsVerifying(false);
      success('Email verified successfully!');
      setTimeout(() => navigate('/'), 1500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, success]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col justify-center items-center px-4 text-center">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-xl border border-app-color">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Verify your email
        </h2>
        
        <p className="text-gray-500 mb-8">
          We've sent a verification link to your email. Please click the link to continue.
        </p>

        {isVerifying ? (
          <div className="flex flex-col items-center gap-3">
             <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
             <span className="text-sm text-gray-500">Auto-verifying for demo...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-green-600 font-medium">Verified! Redirecting...</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-app-color">
          <p className="text-xs text-gray-400">
            Didn't receive the email? <button className="text-primary-600 hover:underline">Resend</button>
          </p>
        </div>
      </div>
    </div>
  );
}