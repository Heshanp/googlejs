import React from 'react';
import { cn } from '../../lib/utils';

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  withBottomNavPadding?: boolean;
}

export const PageShell = React.forwardRef<HTMLDivElement, PageShellProps>(
  ({ className, withBottomNavPadding = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'min-h-screen bg-gray-50 dark:bg-neutral-950 pt-[var(--app-header-offset)]',
          withBottomNavPadding && 'pb-phi-89',
          className
        )}
        {...props}
      />
    );
  }
);
PageShell.displayName = 'PageShell';
