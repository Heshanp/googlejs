import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  contentClassName?: string;
  headerClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon: Icon,
  action,
  className,
  contentClassName,
  headerClassName,
  children,
  ...props
}) => {
  const hasHeader = Boolean(title || Icon || action);

  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      {hasHeader && (
        <div
          className={cn(
            'p-phi-13 border-b border-app-color flex items-center gap-phi-13',
            headerClassName
          )}
        >
          {Icon && (
            <div className="w-phi-34 h-phi-34 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
              <Icon className="w-phi-13 h-phi-13" />
            </div>
          )}
          {title && (
            <h3 className="font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {action && (
            <div className="ml-auto">
              {action}
            </div>
          )}
        </div>
      )}
      <div className={cn('p-phi-13', contentClassName)}>{children}</div>
    </Card>
  );
};

