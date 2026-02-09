'use client';

import React, { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { useVoiceSearch } from '../../../hooks/useVoiceSearch';

interface VoiceSearchButtonProps {
  onTranscript: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  size?: 'sm' | 'md';
  variant?: 'default' | 'circle';
  className?: string;
  lang?: string;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({
  onTranscript,
  onInterim,
  onListeningChange,
  size = 'md',
  variant = 'default',
  className,
  lang,
}) => {
  const { isListening, isSupported, error, startListening, stopListening } = useVoiceSearch({
    lang,
    onResult: onTranscript,
    onInterim,
  });

  const [showError, setShowError] = useState(false);

  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 4000);
      return () => clearTimeout(timer);
    }
    setShowError(false);
  }, [error]);

  if (!isSupported) return null;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isListening ? 'Stop listening' : 'Voice search'}
        title={isListening ? 'Stop listening' : 'Voice search'}
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-200',
          sizeClasses[size],
          isListening
            ? 'text-red-500'
            : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300',
          variant === 'circle' && !isListening && 'bg-neutral-100 dark:bg-neutral-800',
          variant === 'circle' && isListening && 'bg-red-50 dark:bg-red-900/20',
        )}
      >
        {/* Pulsing ring animation when listening */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500/20"
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Inner glow when listening */}
        {isListening && (
          <div className="absolute inset-0 rounded-full bg-red-50 dark:bg-red-900/20" />
        )}

        <Mic className={cn('relative z-10', iconSizes[size])} />
      </button>

      {/* Error tooltip */}
      <AnimatePresence>
        {showError && error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 right-0 whitespace-nowrap px-3 py-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-app-color text-xs text-red-500 z-50"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
