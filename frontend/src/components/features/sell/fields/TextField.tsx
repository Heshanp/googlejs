import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';
import { Input } from '../../../ui/Input';

interface TextFieldProps {
    field: FieldSchema;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    id?: string;
}

export const TextField: React.FC<TextFieldProps> = ({ field, value, onChange, error, id }) => {
    return (
        <Input
            id={id}
            label={
                <span>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                </span>
            }
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            helperText={field.helpText}
            required={field.required}
        />
    );
};
