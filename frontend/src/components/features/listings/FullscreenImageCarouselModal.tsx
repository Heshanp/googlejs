'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface FullscreenImageCarouselItem {
  id: string;
  url: string;
  alt?: string;
}

interface FullscreenImageCarouselModalProps {
  images: FullscreenImageCarouselItem[];
  title: string;
  isOpen: boolean;
  currentIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const FullscreenImageCarouselModal: React.FC<FullscreenImageCarouselModalProps> = ({
  images,
  title,
  isOpen,
  currentIndex,
  onClose,
  onSelect,
  onPrev,
  onNext,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-3 bg-neutral-800/50 hover:bg-neutral-700 text-white rounded-full z-50 transition-colors cursor-pointer"
            aria-label="Close fullscreen"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-neutral-800/50 hover:bg-neutral-700 text-white rounded-full z-50 transition-colors hidden md:flex items-center justify-center group cursor-pointer"
              aria-label="Previous image"
              type="button"
            >
              <ChevronLeft className="w-8 h-8 group-active:scale-90 transition-transform" />
            </button>
          )}

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-neutral-800/50 hover:bg-neutral-700 text-white rounded-full z-50 transition-colors hidden md:flex items-center justify-center group cursor-pointer"
              aria-label="Next image"
              type="button"
            >
              <ChevronRight className="w-8 h-8 group-active:scale-90 transition-transform" />
            </button>
          )}

          <motion.img
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            src={images[currentIndex]?.url}
            alt={images[currentIndex]?.alt || `${title} - Fullscreen`}
            className="max-h-[90vh] max-w-[90vw] object-contain select-none z-10"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <div
              className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => onSelect(idx)}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-all shadow-sm cursor-pointer',
                    idx === currentIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'
                  )}
                  type="button"
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
