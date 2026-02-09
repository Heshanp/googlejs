import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, helperText, autoResize, id, maxLength, ...props }, ref) => {
    const generatedId = id || React.useId();
    const internalRef = React.useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize && internalRef.current) {
        internalRef.current.style.height = 'auto';
        internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
      }
      props.onInput?.(e);
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={generatedId}
            className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <textarea
            id={generatedId}
            ref={internalRef}
            className={cn(
              "flex min-h-[80px] w-full rounded-xl border bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
              error
                ? "border-red-500 focus-visible:ring-0"
                : "border-app-color hover:border-gray-300 dark:hover:border-gray-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
              className
            )}
            onInput={handleInput}
            maxLength={maxLength}
            {...props}
          />
          {error && (
            <div className="absolute top-2 right-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          )}
        </div>

        <div className="flex justify-between items-start gap-2">
          {(helperText || error) && (
            <p className={cn("text-xs transition-all", error ? "text-red-500 font-medium" : "text-gray-500")} role={error ? "alert" : undefined}>
              {error || helperText}
            </p>
          )}
          {maxLength && (
            <p className="text-xs text-gray-400 ml-auto whitespace-nowrap">
              {props.value ? (props.value as string).length : 0} / {maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';