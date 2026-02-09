'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check initial online status
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!mounted || !isOffline) return null;

  return (
    <div className={cn(
      "fixed bottom-safe left-0 right-0 z-[100] bg-neutral-900 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg animate-in slide-in-from-bottom-full duration-300",
      "md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:rounded-full md:right-auto md:px-6"
    )}>
      <WifiOff className="w-4 h-4 text-red-400" />
      <span className="text-sm font-medium">You are currently offline</span>
    </div>
  );
};