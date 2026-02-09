'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '../../../hooks/useFavorites';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LikeButtonProps {
  listingId: string;
  price: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'action' | 'glass' | 'overlay';
}

const PARTICLES = Array.from({ length: 12 });
const COLORS = ['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

export const LikeButton: React.FC<LikeButtonProps> = ({
  listingId,
  price,
  className,
  size = 'md',
  variant = 'card'
}) => {
  const { isLiked, toggleLike } = useFavorites();
  const liked = isLiked(listingId);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!liked) {
      setShowConfetti(true);
      // Reset after animation
      setTimeout(() => setShowConfetti(false), 1000);
    }

    toggleLike(listingId, price);
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'action':
        return cn(
          "p-3 rounded-xl border transition-all hover:scale-105 active:scale-95",
          liked
            ? "bg-red-50 border-red-200 text-red-500 dark:bg-red-900/20 dark:border-red-900"
            : "bg-white dark:bg-neutral-800 border-app-color text-gray-500 hover:border-gray-300"
        );
      case 'glass':
        return cn(
          "p-2.5 rounded-full glass-panel transition-all duration-300 hover:scale-105 active:scale-95",
          liked
            ? "bg-white text-red-500 shadow"
            : "text-gray-700 dark:text-white hover:bg-white hover:text-red-500"
        );
      case 'overlay':
        return cn(
          "p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl",
          liked
            ? "bg-white text-red-500"
            : "bg-white text-black"
        );
      case 'card':
      default:
        return cn(
          "rounded-full transition-all shadow-sm flex items-center justify-center p-2 backdrop-blur-sm hover:scale-110 active:scale-95",
          liked
            ? "bg-white/90 dark:bg-black/60 text-red-500"
            : "bg-white/80 dark:bg-black/50 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-neutral-800"
        );
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={liked ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "relative flex items-center justify-center",
        getVariantClasses(),
        className
      )}
    >
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
            {PARTICLES.map((_, i) => {
              const angle = (i / PARTICLES.length) * 360;
              const distance = Math.random() * 40 + 20;
              const color = COLORS[Math.floor(Math.random() * COLORS.length)];

              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                  animate={{
                    x: Math.cos(angle * (Math.PI / 180)) * distance,
                    y: Math.sin(angle * (Math.PI / 180)) * distance,
                    opacity: 0,
                    scale: 0,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ scale: showConfetti ? [1, 1.4, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart
          className={cn(
            iconSizes[size],
            "transition-colors",
            variant === 'overlay'
              ? (liked ? "text-red-500" : "text-black")
              : (liked ? "text-red-500" : "text-neutral-500 dark:text-neutral-400")
          )}
          fill={liked ? "currentColor" : "none"}
        />
      </motion.div>
    </button>
  );
};
