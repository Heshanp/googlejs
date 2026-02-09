import React from 'react';
import { cn } from '../../../lib/utils';
import { Star, Sparkles, AlertCircle, Wrench } from 'lucide-react';
import { ListingCondition } from '../../../types';

interface ConditionSelectorProps {
  value?: ListingCondition;
  onChange: (value: ListingCondition) => void;
  error?: string;
}

const CONDITIONS: { value: ListingCondition; label: string; desc: string; icon: any }[] = [
  { 
    value: 'New', 
    label: 'Brand New', 
    desc: 'Unused, in original packaging', 
    icon: Sparkles 
  },
  { 
    value: 'Like New', 
    label: 'Like New', 
    desc: 'Used once or twice, no signs of wear', 
    icon: Star 
  },
  { 
    value: 'Good', 
    label: 'Good', 
    desc: 'Used but well maintained, minor flaws', 
    icon: AlertCircle 
  },
  { 
    value: 'Fair', 
    label: 'Fair', 
    desc: 'Visible wear and tear, fully functional', 
    icon: Wrench 
  },
];

export const ConditionSelector: React.FC<ConditionSelectorProps> = ({ value, onChange, error }) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CONDITIONS.map((cond) => {
          const Icon = cond.icon;
          const isSelected = value === cond.value;
          return (
            <button
              key={cond.value}
              type="button"
              onClick={() => onChange(cond.value)}
              className={cn(
                "relative flex items-start gap-3 p-4 rounded-xl border transition-all text-left",
                isSelected
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500"
                  : "border-app-color bg-white dark:bg-neutral-800 hover:border-gray-300"
              )}
            >
              <div className={cn(
                "mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                isSelected ? "bg-primary-100 dark:bg-primary-900/40 text-primary-600" : "bg-gray-100 dark:bg-neutral-700 text-gray-500"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <span className={cn("block font-semibold text-sm", isSelected ? "text-primary-900 dark:text-primary-100" : "text-gray-900 dark:text-white")}>
                  {cond.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                  {cond.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};