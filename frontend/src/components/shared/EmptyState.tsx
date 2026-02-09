import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  className?: string;
  fullPage?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  action,
  className,
  fullPage = false,
}) => {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500",
        fullPage ? "min-h-[60vh]" : "py-12",
        className
      )}
    >
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
          <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button 
          variant={action.variant || 'primary'} 
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};