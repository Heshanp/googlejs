import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  label?: React.ReactNode;
  error?: string;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(({
  options,
  value,
  onChange,
  placeholder = "Select option",
  label,
  error,
  multiple = false,
  searchable = false,
  disabled = false,
  className,
  id
}, ref) => {
  const generatedId = id || React.useId();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeAheadBuffer, setTypeAheadBuffer] = useState('');
  const typeAheadTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle type-ahead navigation
  useEffect(() => {
    if (!isOpen || searchable) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

      const char = e.key;
      const newBuffer = typeAheadBuffer + char;
      setTypeAheadBuffer(newBuffer);

      // Clear buffer after delay
      if (typeAheadTimeoutRef.current) clearTimeout(typeAheadTimeoutRef.current);
      typeAheadTimeoutRef.current = setTimeout(() => setTypeAheadBuffer(''), 500);

      // Find match
      const match = options.find(opt =>
        opt.label.toLowerCase().startsWith(newBuffer.toLowerCase())
      );

      if (match) {
        // Find element and scroll
        const element = containerRef.current?.querySelector(`button[data-value="${match.value}"]`);
        element?.scrollIntoView({ block: 'nearest' });
      } else if (newBuffer.length > 1) {
        // If no match with full buffer, retry with just the new char (e.g. user typed fast new sequence)
        const singleCharMatch = options.find(opt =>
          opt.label.toLowerCase().startsWith(char.toLowerCase())
        );
        if (singleCharMatch) {
          setTypeAheadBuffer(char);
          const element = containerRef.current?.querySelector(`button[data-value="${singleCharMatch.value}"]`);
          element?.scrollIntoView({ block: 'nearest' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchable, options, typeAheadBuffer]);

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValue = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const isSelected = (optionValue: string) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayValue = () => {
    if (!value || (Array.isArray(value) && value.length === 0)) return placeholder;

    if (multiple && Array.isArray(value)) {
      return `${value.length} selected`;
    }

    const selectedOption = options.find(opt => opt.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  return (
    <div className={cn("w-full space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={generatedId}
          className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <button
          ref={ref}
          id={generatedId}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-full border bg-white dark:bg-neutral-900 px-3.5 py-1.5 text-sm ring-offset-white placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm",
            error ? "border-red-500 focus:ring-red-500/10" : "border-app-color hover:border-neutral-300 dark:hover:border-neutral-700",
            isOpen && "ring-4 ring-primary-500/10 border-primary-500",
            !value && "text-neutral-400"
          )}
          disabled={disabled}
        >
          <span className="truncate flex items-center gap-2">
            {multiple && Array.isArray(value) && value.length > 0 && (
              <span className="flex gap-1 overflow-hidden">
                {value.slice(0, 2).map(v => {
                  const opt = options.find(o => o.value === v);
                  return opt ? (
                    <span key={v} className="bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded text-xs">
                      {opt.label}
                    </span>
                  ) : null;
                })}
                {value.length > 2 && <span className="text-xs text-gray-500 self-center">+{value.length - 2}</span>}
              </span>
            )}
            {(!multiple || !Array.isArray(value) || value.length === 0) && displayValue()}
          </span>
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 min-w-full w-max overflow-hidden rounded-2xl border border-app-color bg-white dark:bg-neutral-900 shadow animate-in fade-in-80 slide-in-from-top-1">
            {searchable && (
              <div className="p-2 bg-white dark:bg-neutral-900 border-b border-app-color">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    className="w-full rounded-lg bg-gray-50 dark:bg-neutral-800 py-1.5 pl-8 pr-2 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500/10 transition-shadow"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div
              className={cn(
                "p-2 overflow-y-auto",
                searchable ? "max-h-44" : "max-h-60"
              )}
            >
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">No options found</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    data-value={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-2 pr-8 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-100 dark:hover:bg-neutral-800 text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/20",
                      isSelected(option.value) ? "bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 font-medium" : "text-gray-900 dark:text-gray-100"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {option.icon}
                      {option.label}
                    </span>
                    {isSelected(option.value) && (
                      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center text-primary-600">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 font-medium" role="alert">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';
