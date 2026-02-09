import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';
import { cn } from '../../../../lib/utils';

interface RadioFieldProps {
    field: FieldSchema;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

export const RadioField: React.FC<RadioFieldProps> = ({ field, value, onChange, error }) => {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex flex-wrap gap-3">
                {field.options?.map((option) => (
                    <label
                        key={option.value}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer transition-all text-sm",
                            value === option.value
                                ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:border-primary-500 dark:text-primary-300"
                                : "bg-white dark:bg-neutral-800 border-app-color hover:border-gray-300 dark:hover:border-neutral-600"
                        )}
                    >
                        <input
                            type="radio"
                            name={field.id}
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value as string)}
                            className="sr-only"
                        />
                        {option.label}
                    </label>
                ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
        </div>
    );
};
