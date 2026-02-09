import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';
import { Select } from '../../../ui/Select';

interface SelectFieldProps {
    field: FieldSchema;
    value: string | number;
    onChange: (value: string | number) => void;
    error?: string;
    id?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ field, value, onChange, error, id }) => {
    return (
        <div className="space-y-1">
            <Select
                id={id}
                label={
                    <span>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                }
                options={field.options?.map(opt => ({ ...opt, value: String(opt.value) })) || []}
                value={value ? String(value) : ''}
                onChange={(val) => onChange(val as string)}
                error={error}
                placeholder={field.placeholder || `Select ${field.label}`}
            />
            {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
        </div>
    );
};
