/**
 * AI-Directed Fields Component
 * 
 * Renders form fields based on AI-determined relevant field IDs.
 * This replaces the category-based DynamicCategoryFields approach.
 */

import React, { useState } from 'react';
import { getFieldsByIds, getFieldById, FIELD_REGISTRY, DEFAULT_FALLBACK_FIELDS } from '../../../config/field-registry';
import { FieldType, FieldSchema } from '../../../types/category-fields.types';
import { TextField } from './fields/TextField';
import { TextAreaField } from './fields/TextAreaField';
import { NumberField } from './fields/NumberField';
import { SelectField } from './fields/SelectField';
import { RadioField } from './fields/RadioField';
import { CheckboxField } from './fields/CheckboxField';
import { MultiSelectField } from './fields/MultiSelectField';
import { RangeField } from './fields/RangeField';
import { ColorPickerField } from './fields/ColorPickerField';
import { SizeSelectorField } from './fields/SizeSelectorField';
import { VehicleMakeModelSelector } from './VehicleMakeModelSelector';
import { Plus, X, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AIDirectedFieldsProps {
    /** Field IDs returned by AI analysis */
    relevantFields: string[];
    /** Current field values */
    values: Record<string, any>;
    /** Callback when a field value changes */
    onChange: (fieldId: string, value: any) => void;
    /** Field validation errors */
    errors?: Record<string, string>;
    /** Callback to add a field manually */
    onAddField?: (fieldId: string) => void;
    /** Callback to remove a field */
    onRemoveField?: (fieldId: string) => void;
    /** Whether to show the "add field" UI */
    showAddField?: boolean;
}

export const AIDirectedFields: React.FC<AIDirectedFieldsProps> = ({
    relevantFields,
    values,
    onChange,
    errors,
    onAddField,
    onRemoveField,
    showAddField = true,
}) => {
    const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Get field schemas for the relevant field IDs
    // Fall back to default fields if AI returned nothing
    const activeFieldIds = relevantFields.length > 0 ? relevantFields : DEFAULT_FALLBACK_FIELDS;
    const fields = getFieldsByIds(activeFieldIds);

    // Check if we have vehicle make/model for special handling
    const hasMakeModel = activeFieldIds.includes('make') && activeFieldIds.includes('model');
    const makeField = hasMakeModel ? getFieldById('make') : undefined;
    const modelField = hasMakeModel ? getFieldById('model') : undefined;

    // Filter out make/model if using special selector
    const fieldsToRender = hasMakeModel && makeField && modelField
        ? fields.filter(f => f.id !== 'make' && f.id !== 'model')
        : fields;

    // Get available fields for manual addition (fields not already in use)
    const availableFields = Object.values(FIELD_REGISTRY)
        .filter(f => !activeFieldIds.includes(f.id))
        .filter(f =>
            searchTerm === '' ||
            f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.id.toLowerCase().includes(searchTerm.toLowerCase())
        );

    if (fields.length === 0) return null;

    const renderField = (field: FieldSchema) => {
        const commonProps = {
            field,
            value: values[field.id],
            onChange: (val: any) => onChange(field.id, val),
            error: typeof errors?.[field.id] === 'object'
                ? (errors?.[field.id] as any)?.message
                : errors?.[field.id],
            id: `ai-field-${field.id}`,
        };

        // Wrapper with optional remove button
        const FieldWrapper: React.FC<{ children: React.ReactNode; fullWidth?: boolean }> = ({
            children,
            fullWidth = false
        }) => (
            <div className={cn("relative group", fullWidth && "col-span-full")}>
                {children}
                {onRemoveField && (
                    <button
                        type="button"
                        onClick={() => onRemoveField(field.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove field"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
        );

        switch (field.type) {
            case FieldType.TEXT:
                return (
                    <FieldWrapper key={field.id}>
                        <TextField {...commonProps} />
                    </FieldWrapper>
                );
            case FieldType.TEXTAREA:
                return (
                    <FieldWrapper key={field.id} fullWidth>
                        <TextAreaField {...commonProps} />
                    </FieldWrapper>
                );
            case FieldType.NUMBER:
                return (
                    <FieldWrapper key={field.id}>
                        <NumberField {...commonProps} />
                    </FieldWrapper>
                );
            case FieldType.SELECT:
                return (
                    <FieldWrapper key={field.id}>
                        <SelectField {...commonProps} />
                    </FieldWrapper>
                );
            case FieldType.RADIO:
                return (
                    <FieldWrapper key={field.id} fullWidth>
                        <RadioField {...commonProps} />
                    </FieldWrapper>
                );
            case FieldType.CHECKBOX:
                return (
                    <FieldWrapper key={field.id}>
                        <CheckboxField {...commonProps} />
                    </FieldWrapper>
                );
            case FieldType.MULTI_SELECT:
                return (
                    <FieldWrapper key={field.id} fullWidth>
                        <MultiSelectField {...commonProps} />
                    </FieldWrapper>
                );
            case FieldType.RANGE:
                return (
                    <FieldWrapper key={field.id}>
                        <RangeField {...commonProps} />
                    </FieldWrapper>
                );
            case FieldType.COLOR_PICKER:
                return (
                    <FieldWrapper key={field.id}>
                        <ColorPickerField {...commonProps} />
                    </FieldWrapper>
                );
            case FieldType.SIZE_SELECTOR:
                return (
                    <FieldWrapper key={field.id}>
                        <SizeSelectorField {...commonProps} />
                    </FieldWrapper>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Item Details
                    </h3>
                </div>

                <div className="space-y-6">
                    {/* Special Vehicle Make/Model Selector */}
                    {hasMakeModel && makeField && modelField && (
                        <VehicleMakeModelSelector
                            makeField={makeField}
                            modelField={modelField}
                            values={values}
                            onChange={onChange}
                            errors={errors}
                        />
                    )}

                    {/* Dynamic Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {fieldsToRender.map(renderField)}
                    </div>

                    {/* Add Field UI */}
                    {showAddField && onAddField && (
                        <div className="pt-4 border-t border-app-color">
                            <button
                                type="button"
                                onClick={() => setIsAddFieldOpen(!isAddFieldOpen)}
                                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                            >
                                <Plus className="w-4 h-4" />
                                Add more details
                                <ChevronDown className={cn(
                                    "w-4 h-4 transition-transform",
                                    isAddFieldOpen && "rotate-180"
                                )} />
                            </button>

                            {isAddFieldOpen && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                                    <input
                                        type="text"
                                        placeholder="Search fields..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-3 py-2 mb-3 text-sm border border-app-color rounded-lg bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />

                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                        {availableFields.length > 0 ? (
                                            availableFields.map(field => (
                                                <button
                                                    key={field.id}
                                                    type="button"
                                                    onClick={() => {
                                                        onAddField(field.id);
                                                        setIsAddFieldOpen(false);
                                                        setSearchTerm('');
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                                >
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {field.label}
                                                    </span>
                                                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                                                        ({field.id})
                                                    </span>
                                                </button>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                                                No matching fields found
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
