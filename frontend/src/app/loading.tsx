import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg flex items-center justify-center mb-4 animate-bounce">
        <div className="w-8 h-8 bg-primary-600 rounded-lg" />
      </div>
      <Loader2 className="w-6 h-6 animate-spin text-primary-600 mb-2" />
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-pulse">
        Loading Justsell...
      </p>
    </div>
  );
}