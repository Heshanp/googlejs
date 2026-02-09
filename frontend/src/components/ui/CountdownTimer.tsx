import React, { useEffect } from 'react';
import { useCountdown } from '../../hooks/useCountdown';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string | Date | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'warning' | 'danger';
  showIcon?: boolean;
  onExpire?: () => void;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  size = 'md',
  variant = 'default',
  showIcon = true,
  onExpire,
  className = '',
}) => {
  const { formatted, isExpired, timeLeft } = useCountdown(expiresAt);

  useEffect(() => {
    if (isExpired && onExpire) {
      onExpire();
    }
  }, [isExpired, onExpire]);

  if (!expiresAt) return null;

  // Auto-detect variant based on time left (if variant is default)
  let finalVariant = variant;
  if (variant === 'default') {
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    if (isExpired) {
      finalVariant = 'danger';
    } else if (hoursLeft < 6) {
      finalVariant = 'danger';
    } else if (hoursLeft < 24) {
      finalVariant = 'warning';
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-gray-100 text-gray-700 border-gray-300',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    danger: 'bg-red-50 text-red-800 border-red-300',
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${sizeClasses[size]} ${variantClasses[finalVariant]} ${className}`}
    >
      {showIcon && <Clock size={iconSize[size]} className="flex-shrink-0" />}
      <span className="whitespace-nowrap">{formatted}</span>
    </div>
  );
};
