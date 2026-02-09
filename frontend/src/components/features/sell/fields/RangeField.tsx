import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';
import { Input } from '../../../ui/Input';

interface RangeFieldProps {
    field: FieldSchema;
    value: { min?: number; max?: number } | undefined;
    onChange: (value: { min?: number; max?: number }) => void;
    error?: string;
}

export const RangeField: React.FC<RangeFieldProps> = ({ field, value = {}, onChange, error }) => {
    const handleChange = (key: 'min' | 'max', val: string) => {
        const numVal = val === '' ? undefined : Number(val);
        onChange({ ...value, [key]: numVal });
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Input
                        type="number"
                        placeholder="Min"
                        value={value.min ?? ''}
                        onChange={(e) => handleChange('min', e.target.value)}
                        min={field.validation?.min}
                        max={field.validation?.max}
                    />
                    {field.unit && (
                        <div className="absolute right-3 top-[10px] text-gray-500 text-sm pointer-events-none">
                            {field.unit}
                        </div>
                    )}
                </div>
                <span className="text-gray-400">-</span>
                <div className="flex-1 relative">
                    <Input
                        type="number"
                        placeholder="Max"
                        value={value.max ?? ''}
                        onChange={(e) => handleChange('max', e.target.value)}
                        min={field.validation?.min}
                        max={field.validation?.max}
                    />
                    {field.unit && (
                        <div className="absolute right-3 top-[10px] text-gray-500 text-sm pointer-events-none">
                            {field.unit}
                        </div>
                    )}
                </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
        </div>
    );
};
