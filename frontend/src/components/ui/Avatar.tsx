import React from 'react';
import { cn } from '../../lib/utils';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  fallback, 
  size = 'md', 
  status, 
  className 
}) => {
  const [hasError, setHasError] = React.useState(false);

  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-lg',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
  };

  const statusSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3.5 w-3.5',
    xl: 'h-4 w-4',
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <div className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800 items-center justify-center font-semibold text-gray-600 dark:text-gray-300 uppercase ring-2 ring-white dark:ring-neutral-950", 
        sizes[size]
      )}>
        {!hasError && src ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          fallback ? fallback : <User className="h-[60%] w-[60%]" />
        )}
      </div>
      
      {status && (
        <span className={cn(
          "absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-neutral-950",
          statusColors[status],
          statusSizes[size]
        )} />
      )}
    </div>
  );
};