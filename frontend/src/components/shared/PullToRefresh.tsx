'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useHaptic } from '../../hooks/useHaptic';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const { triggerImpact } = useHaptic();

  // Threshold to trigger refresh
  const THRESHOLD = 80;
  const MAX_PULL = 120;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && startY.current > 0 && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;
        
        if (diff > 0) {
          // Resistance effect
          const newPull = Math.min(diff * 0.5, MAX_PULL);
          setPullDistance(newPull);
          
          if (e.cancelable && diff < MAX_PULL) {
             // Optional: prevent default only if strictly pulling
             // e.preventDefault(); 
          }
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > THRESHOLD && !isRefreshing) {
        triggerImpact('medium');
        setIsRefreshing(true);
        setPullDistance(60); // Snap to loading position
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      startY.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh, triggerImpact]);

  return (
    <div ref={containerRef} className="min-h-screen relative">
      {/* Spinner Indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-20"
        style={{ 
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: pullDistance > 0 ? 1 : 0,
          transition: isRefreshing ? 'transform 0.2s' : 'none'
        }}
      >
        <div className="bg-white dark:bg-neutral-800 rounded-full p-2 shadow-md border border-app-color">
          <Loader2 
            className={cn(
              "w-6 h-6 text-primary-600 ptr-spinner",
              isRefreshing && "rotating"
            )} 
            style={{ 
              transform: !isRefreshing ? `rotate(${pullDistance * 3}deg)` : undefined 
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1.0)' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};