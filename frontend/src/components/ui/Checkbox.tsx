import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = id || React.useId();

    return (
      <div className={cn("flex items-start gap-3", className)}>
        <div className="relative flex items-center mt-0.5">
          <input
            type="checkbox"
            id={generatedId}
            ref={ref}
            className="peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-app-color bg-white dark:bg-neutral-800 transition-all checked:border-primary-600 checked:bg-primary-600 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            suppressHydrationWarning
            {...props}
          />
          <Check className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={3} />
        </div>
        {label && (
          <label
            htmlFor={generatedId}
            className="cursor-pointer text-sm font-medium leading-tight text-gray-700 dark:text-gray-300 select-none pt-0.5"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';