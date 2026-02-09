import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'primary',
  size = 'sm',
  children,
  ...props
}) => {
  const variants = {
    primary: 'bg-primary-50 text-primary-700 border border-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-900/50',
    success: 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/50',
    warning: 'bg-yellow-50 text-yellow-800 border border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-900/50',
    error: 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50',
    neutral: 'bg-neutral-50 text-neutral-700 border border-app-color dark:bg-neutral-800 dark:text-neutral-300',
    outline: 'bg-transparent border border-app-color text-neutral-700 dark:text-neutral-300',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 rounded-full',
    md: 'text-xs px-3 py-1 rounded-full',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
