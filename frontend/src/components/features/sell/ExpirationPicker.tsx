import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatDistanceToNow, addDays, addHours, format } from 'date-fns';

interface ExpirationPickerProps {
  value?: string; // ISO timestamp
  onChange: (value: string) => void;
  error?: string;
  createdAt?: string; // Original listing creation date (for edit mode)
}

type QuickOption = {
  label: string;
  days: number;
};

const QUICK_OPTIONS: QuickOption[] = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

const DEFAULT_DAYS = 7;

export const ExpirationPicker: React.FC<ExpirationPickerProps> = ({
  value,
  onChange,
  error,
  createdAt,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | 'custom'>(DEFAULT_DAYS);
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('12:00');

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      const expiryDate = new Date(value);
      const now = new Date();
      const diffMs = expiryDate.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Check if it matches a quick option
      const matchingOption = QUICK_OPTIONS.find(opt => Math.abs(opt.days - diffDays) <= 0.5);
      if (matchingOption) {
        setSelectedOption(matchingOption.days);
      } else {
        setSelectedOption('custom');
        setCustomDate(format(expiryDate, 'yyyy-MM-dd'));
        setCustomTime(format(expiryDate, 'HH:mm'));
      }
    } else {
      // Default to 1 week
      setSelectedOption(DEFAULT_DAYS);
      const defaultExpiry = addDays(new Date(), DEFAULT_DAYS);
      onChange(defaultExpiry.toISOString());
    }
  }, []);

  const handleQuickOptionClick = (days: number) => {
    setSelectedOption(days);
    const newExpiry = addDays(new Date(), days);
    onChange(newExpiry.toISOString());
  };

  const handleCustomDateChange = (date: string) => {
    setCustomDate(date);
    setSelectedOption('custom');
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = customTime.split(':').map(Number);
      const newExpiry = new Date(year, month - 1, day, hours, minutes);
      onChange(newExpiry.toISOString());
    }
  };

  const handleCustomTimeChange = (time: string) => {
    setCustomTime(time);
    if (customDate) {
      const [year, month, day] = customDate.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const newExpiry = new Date(year, month - 1, day, hours, minutes);
      onChange(newExpiry.toISOString());
    }
  };

  // Calculate min and max dates for the date picker
  const now = new Date();
  const minDate = format(addHours(now, 24), 'yyyy-MM-dd'); // 1 day from now
  // Max date: 1 month from creation date (edit mode) or 1 month from now (create mode)
  const baseDate = createdAt ? new Date(createdAt) : now;
  const maxDate = format(addDays(baseDate, 30), 'yyyy-MM-dd');

  // Get human-readable expiration text
  const getExpirationText = () => {
    if (!value) return null;
    try {
      const expiryDate = new Date(value);
      return formatDistanceToNow(expiryDate, { addSuffix: true });
    } catch {
      return null;
    }
  };

  // Validate the current value
  const isValidExpiration = () => {
    if (!value) return true;
    const expiryDate = new Date(value);
    const currentNow = new Date();
    // Use 24 hours minus 1 minute tolerance to account for timing difference
    // between click time (when expiry is calculated) and render time (when validation runs)
    const minExpiry = new Date(currentNow.getTime() + (24 * 60 - 1) * 60 * 1000);
    // Max: 1 month from creation date (edit mode) or now (create mode)
    const maxBaseDate = createdAt ? new Date(createdAt) : currentNow;
    const maxExpiry = addDays(maxBaseDate, 30);
    return expiryDate >= minExpiry && expiryDate <= maxExpiry;
  };

  // Filter quick options based on max allowed date
  const getAvailableOptions = () => {
    if (!createdAt) return QUICK_OPTIONS;

    const createdDate = new Date(createdAt);
    const maxExpiryDate = addDays(createdDate, 30);
    const currentNow = new Date();

    return QUICK_OPTIONS.filter(opt => {
      const optionExpiry = addDays(currentNow, opt.days);
      return optionExpiry <= maxExpiryDate;
    });
  };

  const availableOptions = getAvailableOptions();
  const expirationText = getExpirationText();
  const isValid = isValidExpiration();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Clock className="w-3.5 h-3.5" />
        <span>Listing expires {expirationText || 'in 1 week'}</span>
      </div>

      {/* Quick Options */}
      <div className="flex flex-wrap gap-2">
        {availableOptions.map((option) => (
          <button
            key={option.days}
            type="button"
            onClick={() => handleQuickOptionClick(option.days)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md border transition-colors',
              selectedOption === option.days
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-neutral-800 border-app-color text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-neutral-600'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Custom Date/Time Picker */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            setSelectedOption('custom');
            if (!customDate) {
              setCustomDate(format(addDays(now, 7), 'yyyy-MM-dd'));
            }
          }}
          className={cn(
            'flex items-center gap-2 text-xs transition-colors',
            selectedOption === 'custom'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          Custom date & time
        </button>

        {selectedOption === 'custom' && (
          <div className="flex gap-2 mt-2">
            <input
              type="date"
              value={customDate}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              min={minDate}
              max={maxDate}
              title="Expiration date"
              aria-label="Expiration date"
              className="flex-1 px-2 py-1.5 text-xs border border-app-color rounded-md bg-white dark:bg-neutral-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => handleCustomTimeChange(e.target.value)}
              title="Expiration time"
              aria-label="Expiration time"
              className="w-24 px-2 py-1.5 text-xs border border-app-color rounded-md bg-white dark:bg-neutral-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Edit mode info */}
      {createdAt && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Max expiry: 1 month from listing creation
        </p>
      )}

      {/* Validation Error */}
      {(error || !isValid) && (
        <p className="text-xs text-red-500">
          {error || (createdAt
            ? 'Expiration must be between 1 day from now and 1 month from listing creation'
            : 'Expiration must be between 1 day and 1 month from now'
          )}
        </p>
      )}
    </div>
  );
};
