import React, { useState, useEffect } from 'react';
import { FieldSchema } from '../../../types/category-fields.types';
import { VEHICLE_MAKES, getModelsForMake } from '../../../data/vehicle-makes-models';
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';

interface VehicleMakeModelSelectorProps {
    makeField: FieldSchema;
    modelField: FieldSchema;
    values: Record<string, any>;
    onChange: (fieldId: string, value: any) => void;
    errors?: Record<string, string>;
}

export const VehicleMakeModelSelector: React.FC<VehicleMakeModelSelectorProps> = ({
    makeField,
    modelField,
    values,
    onChange,
    errors
}) => {
    const [modelOptions, setModelOptions] = useState<{ label: string; value: string }[]>([]);
    const [isCustomModel, setIsCustomModel] = useState(false);

    const selectedMake = values[makeField.id];
    const selectedModel = values[modelField.id];

    const prevMakeRef = React.useRef(selectedMake);

    // Update model options when make changes
    useEffect(() => {
        if (selectedMake && selectedMake !== 'Other') {
            const models = getModelsForMake(selectedMake);
            setModelOptions(models.map(m => ({ label: m, value: m })));

            // Check if current model value is a custom value (not in the predefined list)
            // This handles AI-provided model names that don't match exactly
            if (selectedModel && !models.includes(selectedModel) && selectedModel !== 'Other') {
                setIsCustomModel(true);
            }
        } else {
            setModelOptions([]);
        }

        // Reset model if make changes (and it's not the initial mount)
        if (prevMakeRef.current !== selectedMake && prevMakeRef.current !== undefined) {
            onChange(modelField.id, '');
            setIsCustomModel(false);
            prevMakeRef.current = selectedMake;
        } else {
            prevMakeRef.current = selectedMake;
        }
    }, [selectedMake, selectedModel, onChange, modelField.id]);

    // Handle make change
    const handleMakeChange = (make: string) => {
        onChange(makeField.id, make);
    };

    // Handle model change
    const handleModelChange = (model: string) => {
        if (model === 'Other') {
            setIsCustomModel(true);
            onChange(modelField.id, '');
        } else {
            setIsCustomModel(false);
            onChange(modelField.id, model);
        }
    };

    // Helper to extract error message
    const getError = (fieldId: string) => {
        const error = errors?.[fieldId];
        return typeof error === 'object' ? (error as any)?.message : error;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
                id={`category-field-${makeField.id}`}
                label={
                    <span>
                        {makeField.label}
                        {makeField.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                }
                options={makeField.options?.map(opt => ({ ...opt, value: String(opt.value) })) || []}
                value={selectedMake || ''}
                onChange={handleMakeChange}
                error={getError(makeField.id)}
                placeholder="Select Make"
            />

            {selectedMake && (
                selectedMake === 'Other' || isCustomModel ? (
                    <div className="relative">
                        <Input
                            id={`category-field-${modelField.id}`}
                            label={
                                <span>
                                    {modelField.label}
                                    {modelField.required && <span className="text-red-500 ml-1">*</span>}
                                </span>
                            }
                            value={selectedModel || ''}
                            onChange={(e) => onChange(modelField.id, e.target.value)}
                            error={getError(modelField.id)}
                            required={modelField.required}
                            placeholder="Enter Model Name"
                        />
                        {selectedMake !== 'Other' && (
                            <button
                                type="button"
                                onClick={() => setIsCustomModel(false)}
                                className="absolute right-0 top-0 text-xs text-primary-600 hover:underline"
                            >
                                Select from list
                            </button>
                        )}
                    </div>
                ) : (
                    <Select
                        id={`category-field-${modelField.id}`}
                        label={
                            <span>
                                {modelField.label}
                                {modelField.required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                        }
                        options={modelOptions}
                        value={selectedModel || ''}
                        onChange={handleModelChange}
                        error={getError(modelField.id)}
                        placeholder="Select Model"
                        disabled={!selectedMake}
                    />
                )
            )}
        </div>
    );
};
