'use client';

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  floatingLabel?: boolean;
  // Backward compatibility
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    containerClassName,
    icon, // Legacy prop
    floatingLabel = false,
    id,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = id || React.useId();

    // Handle password toggle
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    // Use legacy icon if provided and no leftIcon
    const finalLeftIcon = leftIcon || icon;

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && !floatingLabel && (
          <label
            htmlFor={generatedId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        <div className="relative group">
          {finalLeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-primary-600 transition-colors">
              {finalLeftIcon}
            </div>
          )}

          <input
            id={generatedId}
            ref={ref}
            type={inputType}
            disabled={disabled}
            className={cn(
              "flex h-[42px] w-full rounded-2xl border bg-white dark:bg-neutral-900 px-phi-13 py-phi-8 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 shadow-sm",
              error
                ? "border-red-500 focus-visible:ring-4 focus-visible:ring-red-500/10"
                : "border-app-color hover:border-neutral-300 dark:hover:border-neutral-700 focus-visible:ring-4 focus-visible:ring-primary-500/10 focus-visible:border-primary-500",
              finalLeftIcon ? "pl-[42px]" : "",
              (rightIcon || isPassword || error) ? "pr-[42px]" : "",
              floatingLabel ? "pt-phi-21 pb-phi-5 h-phi-55" : "",
              className
            )}
            placeholder={floatingLabel ? " " : props.placeholder}
            {...props}
          />

          {floatingLabel && label && (
            <label
              htmlFor={generatedId}
              className="absolute left-3 top-4 text-gray-500 transition-all duration-200 -translate-y-3 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 pointer-events-none"
            >
              {label}
            </label>
          )}

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 rounded-full"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}

            {rightIcon && !isPassword && !error && (
              <div className="text-gray-400">{rightIcon}</div>
            )}

            {error && <AlertCircle className="h-4 w-4 text-red-500" />}
          </div>
        </div>

        {(helperText || error) && (
          <p className={cn("text-xs transition-all", error ? "text-red-500 font-medium" : "text-gray-500")} role={error ? "alert" : undefined}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';