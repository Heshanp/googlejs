import React from 'react';
import { getFilterableFields } from '../../../config/category-fields/index';
import { FieldType } from '../../../types/category-fields.types';
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';
import { Checkbox } from '../../ui/Checkbox';
import { Button } from '../../ui/Button';
import { X } from 'lucide-react';

interface CategoryFiltersProps {
    categorySlug: string;
    values: Record<string, any>;
    onChange: (filters: Record<string, any>) => void;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
    categorySlug,
    values,
    onChange
}) => {
    const filterableFields = getFilterableFields(categorySlug);

    if (filterableFields.length === 0) return null;

    const handleFilterChange = (fieldId: string, value: any) => {
        const newFilters = { ...values, [fieldId]: value };
        // Remove empty values
        if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) {
            delete newFilters[fieldId];
        }
        onChange(newFilters);
    };

    const clearFilters = () => {
        onChange({});
    };

    const hasActiveFilters = Object.keys(values).length > 0;

    return (
        <div className="space-y-4 border-t border-app-color pt-4 mt-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Specific Filters</h3>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs text-primary-600">
                        Clear
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {filterableFields.map(field => {
                    const value = values[field.id];

                    switch (field.type) {
                        case FieldType.SELECT:
                        case FieldType.RADIO:
                            return (
                                <Select
                                    key={field.id}
                                    label={field.label}
                                    options={field.options?.map(opt => ({ ...opt, value: String(opt.value) })) || []}
                                    value={value || ''}
                                    onChange={(val) => handleFilterChange(field.id, val)}
                                    placeholder={`Any ${field.label}`}
                                />
                            );

                        case FieldType.MULTI_SELECT:
                            // For filters, multi-select usually means "match any"
                            // We can use the same Select component with multiple=true if supported, or just single select for simplicity for now
                            // Let's use single select for "Any X" for now to keep UI simple in sidebar
                            return (
                                <Select
                                    key={field.id}
                                    label={field.label}
                                    options={field.options?.map(opt => ({ ...opt, value: String(opt.value) })) || []}
                                    value={value || ''}
                                    onChange={(val) => handleFilterChange(field.id, val)}
                                    placeholder={`Any ${field.label}`}
                                />
                            );

                        case FieldType.NUMBER:
                        case FieldType.RANGE:
                            // Range inputs (min/max)
                            return (
                                <div key={field.id} className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Min"
                                            value={values[`${field.id}_min`] || ''}
                                            onChange={(e) => handleFilterChange(`${field.id}_min`, e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <Input
                                            type="number"
                                            placeholder="Max"
                                            value={values[`${field.id}_max`] || ''}
                                            onChange={(e) => handleFilterChange(`${field.id}_max`, e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                            );

                        case FieldType.CHECKBOX:
                            return (
                                <Checkbox
                                    key={field.id}
                                    label={field.label}
                                    checked={!!value}
                                    onChange={(e) => handleFilterChange(field.id, e.target.checked)}
                                />
                            );

                        default:
                            return null;
                    }
                })}
            </div>
        </div>
    );
};
