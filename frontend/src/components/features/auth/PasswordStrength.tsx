import React, { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password?: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password = '' }) => {
  const [strength, setStrength] = useState(0);
  const [checks, setChecks] = useState({
    length: false,
    uppercase: false,
    number: false,
    symbol: false
  });

  useEffect(() => {
    const newChecks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password)
    };
    setChecks(newChecks);
    setStrength(Object.values(newChecks).filter(Boolean).length);
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex gap-1 h-1">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i}
            className={cn(
              "h-full flex-1 rounded-full transition-all duration-500",
              i < strength 
                ? strength <= 2 
                  ? "bg-red-500" 
                  : strength === 3 
                    ? "bg-yellow-500" 
                    : "bg-green-500"
                : "bg-gray-200 dark:bg-neutral-700"
            )}
          />
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("text-xs flex items-center gap-1.5", checks.length ? "text-green-600 dark:text-green-500" : "text-gray-500")}>
          {checks.length ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-400" />}
          8+ Characters
        </div>
        <div className={cn("text-xs flex items-center gap-1.5", checks.uppercase ? "text-green-600 dark:text-green-500" : "text-gray-500")}>
          {checks.uppercase ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-400" />}
          Uppercase
        </div>
        <div className={cn("text-xs flex items-center gap-1.5", checks.number ? "text-green-600 dark:text-green-500" : "text-gray-500")}>
          {checks.number ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-400" />}
          Number
        </div>
        <div className={cn("text-xs flex items-center gap-1.5", checks.symbol ? "text-green-600 dark:text-green-500" : "text-gray-500")}>
          {checks.symbol ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-400" />}
          Symbol
        </div>
      </div>
    </div>
  );
};