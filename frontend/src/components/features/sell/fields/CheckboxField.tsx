import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';

interface CheckboxFieldProps {
    field: FieldSchema;
    value: boolean;
    onChange: (value: boolean) => void;
    error?: string;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({ field, value, onChange, error }) => {
    return (
        <div className="space-y-1">
            <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="peer h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:checked:bg-primary-600 transition-all"
                    />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                </span>
            </label>
            {error && <p className="text-sm text-red-500 pl-8">{error}</p>}
            {field.helpText && <p className="text-xs text-gray-500 pl-8">{field.helpText}</p>}
        </div>
    );
};
