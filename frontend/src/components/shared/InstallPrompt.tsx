'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { Button } from '../ui/Button';
import { X, Download } from 'lucide-react';
import { cn } from '../../lib/utils';

export const InstallPrompt: React.FC = () => {
  const { isInstallable, install } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      // Check if user dismissed it recently
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        // Delay showing prompt
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isInstallable]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-app-color p-4 relative overflow-hidden">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
            J
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white">Install Justsell</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
              Add to your home screen for a better experience, instant access, and notifications.
            </p>
            <Button size="sm" onClick={install} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" /> Add to Home Screen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};