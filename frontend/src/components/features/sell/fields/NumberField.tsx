import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';
import { Input } from '../../../ui/Input';

interface NumberFieldProps {
    field: FieldSchema;
    value: number | string;
    onChange: (value: number | string) => void;
    error?: string;
    id?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({ field, value, onChange, error, id }) => {
    return (
        <div className="relative">
            <Input
                id={id}
                type="number"
                label={
                    <span>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                }
                placeholder={field.placeholder}
                value={value || ''}
                onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                error={error}
                helperText={field.helpText}
                required={field.required}
                min={field.validation?.min}
                max={field.validation?.max}
            />
            {field.unit && (
                <div className="absolute right-3 top-[38px] text-gray-500 text-sm pointer-events-none">
                    {field.unit}
                </div>
            )}
        </div>
    );
};
