import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  variant = 'rectangular',
  width,
  height,
  style,
  ...props 
}) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200 dark:bg-neutral-800",
        variant === 'circular' && "rounded-full",
        variant === 'text' && "rounded",
        variant === 'rectangular' && "rounded-xl",
        className
      )}
      style={{
        width,
        height,
        ...style
      }}
      {...props}
    />
  );
};