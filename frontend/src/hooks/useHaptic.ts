'use client';

import { useCallback } from 'react';

export const useHaptic = () => {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const triggerImpact = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    switch (style) {
      case 'light': vibrate(10); break;
      case 'medium': vibrate(20); break;
      case 'heavy': vibrate(40); break;
    }
  };

  return { vibrate, triggerImpact };
};