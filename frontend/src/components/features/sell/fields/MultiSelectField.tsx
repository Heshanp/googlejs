import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';
import { cn } from '../../../../lib/utils';
import { Check } from 'lucide-react';

interface MultiSelectFieldProps {
    field: FieldSchema;
    value: string[];
    onChange: (value: string[]) => void;
    error?: string;
}

export const MultiSelectField: React.FC<MultiSelectFieldProps> = ({ field, value = [], onChange, error }) => {
    const toggleOption = (optionValue: string) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {field.options?.map((option) => {
                    const isSelected = value.includes(option.value as string);
                    return (
                        <div
                            key={option.value}
                            onClick={() => toggleOption(option.value as string)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm select-none",
                                isSelected
                                    ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:border-primary-500 dark:text-primary-300"
                                    : "bg-white dark:bg-neutral-800 border-app-color hover:border-gray-300 dark:hover:border-neutral-600"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                isSelected
                                    ? "bg-primary-500 border-primary-500 text-white"
                                    : "border-app-color"
                            )}>
                                {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="truncate">{option.label}</span>
                        </div>
                    );
                })}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
        </div>
    );
};
