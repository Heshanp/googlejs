import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    fullWidth,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow hover:shadow active:scale-[0.98] focus-visible:ring-primary-500 transition-all duration-300',
      secondary: 'bg-white text-neutral-900 border border-app-color hover:bg-neutral-50 hover:border-neutral-300 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 focus-visible:ring-neutral-400 shadow-sm hover:shadow-md transition-all duration-300',
      outline: 'border border-app-color bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 focus-visible:ring-neutral-400 transition-all duration-300',
      ghost: 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus-visible:ring-neutral-400 transition-all duration-300',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow focus-visible:ring-red-500 transition-all duration-300',
      glass: 'glass-button text-neutral-900 dark:text-white',
    };

    const sizes = {
      sm: 'h-phi-34 px-phi-13 text-xs rounded-xl gap-phi-5',
      md: 'h-[42px] px-phi-21 text-sm rounded-2xl gap-phi-8',
      lg: 'h-phi-55 px-phi-34 text-base rounded-2xl gap-phi-8',
      icon: 'h-[42px] w-[42px] p-0 rounded-2xl flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          fullWidth ? 'w-full' : '',
          className
        )}
        disabled={isLoading || disabled}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';
