import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverable = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-neutral-800 border border-app-color',
      elevated: 'bg-white dark:bg-neutral-800 shadow-lg border-none',
      outlined: 'bg-transparent border border-app-color',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl overflow-hidden transition-all duration-200',
          variants[variant],
          hoverable && 'hover:-translate-y-1 hover:shadow cursor-pointer active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-phi-21 pb-phi-13', className)}>{children}</div>
);

export const CardContent = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-phi-21 pt-0', className)}>{children}</div>
);

export const CardFooter = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center p-phi-21 pt-0', className)}>{children}</div>
);

export const CardImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
  <div className={cn("relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-neutral-900", className)}>
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
      loading="lazy"
    />
  </div>
);
