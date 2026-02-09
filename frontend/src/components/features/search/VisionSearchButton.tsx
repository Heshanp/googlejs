'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../ui/Toast';
import { compressImage } from '../../../lib/imageCompression';
import { VisionSearchService, VisionSearchResult } from '../../../services/vision-search.service';

interface VisionSearchButtonProps {
  onDetectedQuery: (query: string, result: VisionSearchResult) => void;
  size?: 'sm' | 'md';
  variant?: 'default' | 'circle';
  className?: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const VisionSearchButton: React.FC<VisionSearchButtonProps> = ({
  onDetectedQuery,
  size = 'md',
  variant = 'default',
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { error: toastError } = useToast();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const handleOpenPicker = () => {
    if (isProcessing) return;
    fileInputRef.current?.click();
  };

  const handleChangeFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toastError('Image must be smaller than 10MB.');
      return;
    }

    setIsProcessing(true);
    try {
      let optimizedFile = file;
      try {
        optimizedFile = await compressImage(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.78,
          mimeType: 'image/jpeg',
        });
      } catch {
        optimizedFile = file;
      }

      const result = await VisionSearchService.searchByImage(optimizedFile);
      onDetectedQuery(result.query, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vision search failed';
      toastError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={handleChangeFile}
      />
      <button
        type="button"
        onClick={handleOpenPicker}
        disabled={isProcessing}
        aria-label={isProcessing ? 'Analyzing image' : 'Search with image'}
        title={isProcessing ? 'Analyzing image' : 'Search with image'}
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70',
          sizeClasses[size],
          isProcessing
            ? 'text-accent'
            : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300',
          variant === 'circle' && !isProcessing && 'bg-neutral-100 dark:bg-neutral-800',
          variant === 'circle' && isProcessing && 'bg-accent/10'
        )}
      >
        {isProcessing ? (
          <Loader2 className={cn('animate-spin', iconSizes[size])} />
        ) : (
          <Camera className={cn(iconSizes[size])} />
        )}
      </button>
    </div>
  );
};
