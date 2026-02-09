import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';
import { cn } from '../../../../lib/utils';

interface SizeSelectorFieldProps {
    field: FieldSchema;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

export const SizeSelectorField: React.FC<SizeSelectorFieldProps> = ({ field, value, onChange, error }) => {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex flex-wrap gap-2">
                {field.options?.map((option) => {
                    const isSelected = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value as string)}
                            className={cn(
                                "min-w-[3rem] h-10 px-3 rounded-lg border text-sm font-medium transition-all",
                                isSelected
                                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700 dark:hover:border-neutral-600"
                            )}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
        </div>
    );
};
