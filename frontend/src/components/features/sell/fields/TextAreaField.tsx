import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';
import { TextArea } from '../../../ui/TextArea';

interface TextAreaFieldProps {
    field: FieldSchema;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({ field, value, onChange, error }) => {
    return (
        <TextArea
            label={field.label}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            helperText={field.helpText}
            required={field.required}
            rows={4}
        />
    );
};
