'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthService } from '../../services/auth.service';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await AuthService.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Check your email</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            We've sent password reset instructions to <strong>{email}</strong>
          </p>
          <div className="space-y-4">
            <Button variant="outline" fullWidth onClick={() => setSubmitted(false)}>
              Resend email
            </Button>
            <Link href="/login" className="block">
              <Button variant="ghost" fullWidth>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Reset password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-neutral-900 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-app-color">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <Button type="submit" fullWidth isLoading={isLoading} size="lg">
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6">
            <Link href="/login" className="flex items-center justify-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-300">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
