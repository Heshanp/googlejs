import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  sticky?: boolean;
  containerClassName?: string;
  belowTitle?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  left,
  right,
  sticky = true,
  className,
  containerClassName,
  belowTitle,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b border-app-color',
        sticky && 'sticky top-[var(--app-header-offset)] z-20',
        className
      )}
      {...props}
    >
      <div className={cn('container mx-auto max-w-2xl px-4', containerClassName)}>
        <div className="relative flex items-center h-16 gap-2">
          <div className="flex flex-1 items-center justify-start min-w-0">
            {left}
          </div>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900 dark:text-white truncate max-w-[calc(100%-8rem)]">
            {title}
          </h1>

          <div className="flex flex-1 items-center justify-end min-w-0">
            {right}
          </div>
        </div>

        {belowTitle && (
          <div className="pb-2">
            {belowTitle}
          </div>
        )}
      </div>
    </div>
  );
};
