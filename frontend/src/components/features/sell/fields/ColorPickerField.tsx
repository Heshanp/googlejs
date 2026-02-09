import React from 'react';
import { FieldSchema } from '../../../../types/category-fields.types';
import { cn } from '../../../../lib/utils';
import { Check } from 'lucide-react';

interface ColorPickerFieldProps {
    field: FieldSchema;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

const COLOR_MAP: Record<string, string> = {
    'White': '#FFFFFF',
    'Silver': '#C0C0C0',
    'Black': '#000000',
    'Grey': '#808080',
    'Blue': '#0000FF',
    'Red': '#FF0000',
    'Green': '#008000',
    'Yellow': '#FFFF00',
    'Orange': '#FFA500',
    'Brown': '#A52A2A',
    'Gold': '#FFD700',
    'Purple': '#800080',
    'Pink': '#FFC0CB',
    'Beige': '#F5F5DC',
    'Multi-color': 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)'
};

export const ColorPickerField: React.FC<ColorPickerFieldProps> = ({ field, value, onChange, error }) => {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex flex-wrap gap-3">
                {field.options?.map((option) => {
                    const colorCode = COLOR_MAP[option.label] || '#CCCCCC';
                    const isSelected = value === option.value;
                    const isWhite = colorCode === '#FFFFFF' || colorCode === '#F5F5DC';

                    return (
                        <div
                            key={option.value}
                            onClick={() => onChange(option.value as string)}
                            className="flex flex-col items-center gap-1 cursor-pointer group"
                        >
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                                    isSelected
                                        ? "border-primary-600 scale-110"
                                        : "border-app-color group-hover:border-gray-300 dark:group-hover:border-neutral-600"
                                )}
                                style={{ background: colorCode }}
                                title={option.label}
                            >
                                {isSelected && (
                                    <Check className={cn("w-5 h-5", isWhite ? "text-black" : "text-white")} />
                                )}
                            </div>
                            <span className={cn(
                                "text-xs transition-colors",
                                isSelected ? "font-medium text-primary-600" : "text-gray-500"
                            )}>
                                {option.label}
                            </span>
                        </div>
                    );
                })}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
};
