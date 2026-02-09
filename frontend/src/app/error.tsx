'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigation } from '../hooks/useNavigation';

interface ErrorPageProps {
  error?: Error;
  reset?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ error, reset }) => {
  const { navigate } = useNavigation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Something went wrong
      </h1>
      
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
        We encountered an unexpected error. Our team has been notified.
        {process.env.NODE_ENV === 'development' && error && (
          <span className="block mt-4 p-4 bg-gray-100 dark:bg-neutral-900 rounded-lg text-xs font-mono text-left overflow-auto max-h-32">
            {error.message}
          </span>
        )}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {reset && (
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
          <Home className="w-4 h-4" /> Go Home
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;