import React, { useEffect } from 'react';
import { getFieldsForCategory } from '../../../config/category-fields';
import { FieldType } from '../../../types/category-fields.types';
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

interface DynamicCategoryFieldsProps {
  categorySlug: string;
  subcategorySlug?: string;
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
}

export const DynamicCategoryFields: React.FC<DynamicCategoryFieldsProps> = ({
  categorySlug,
  subcategorySlug,
  values,
  onChange,
  errors
}) => {
  const fields = getFieldsForCategory(categorySlug, subcategorySlug);

  // Special handling for Vehicle Make/Model dependency
  const isVehicleCategory = categorySlug === 'vehicles';
  const makeField = fields.find(f => f.id === 'make');
  const modelField = fields.find(f => f.id === 'model');

  // Filter out make/model if we are using the special selector
  const fieldsToRender = isVehicleCategory && makeField && modelField
    ? fields.filter(f => f.id !== 'make' && f.id !== 'model')
    : fields;

  if (fields.length === 0) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-t border-app-color pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Specific Details
        </h3>

        <div className="space-y-6">
          {/* Special Vehicle Selector */}
          {isVehicleCategory && makeField && modelField && (
            <VehicleMakeModelSelector
              makeField={makeField}
              modelField={modelField}
              values={values}
              onChange={onChange}
              errors={errors}
            />
          )}

          {/* Dynamic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fieldsToRender.map((field) => {
              // Check dependencies
              if (field.dependsOn) {
                const dependencyValue = values[field.dependsOn];
                if (!dependencyValue) return null;
              }

              const commonProps = {
                field,
                value: values[field.id],
                onChange: (val: any) => onChange(field.id, val),
                // Extract error message if it's an object (FieldError) or string
                error: typeof errors?.[field.id] === 'object'
                  ? (errors?.[field.id] as any)?.message
                  : errors?.[field.id],
                id: `category-field-${field.id}`
              };

              // Render appropriate component based on type
              switch (field.type) {
                case FieldType.TEXT:
                  return <TextField key={field.id} {...commonProps} />;
                case FieldType.TEXTAREA:
                  return (
                    <div key={field.id} className="col-span-full">
                      <TextAreaField {...commonProps} />
                    </div>
                  );
                case FieldType.NUMBER:
                  return <NumberField key={field.id} {...commonProps} />;
                case FieldType.SELECT:
                  return <SelectField key={field.id} {...commonProps} />;
                case FieldType.RADIO:
                  return (
                    <div key={field.id} className="col-span-full">
                      <RadioField {...commonProps} />
                    </div>
                  );
                case FieldType.CHECKBOX:
                  return <CheckboxField key={field.id} {...commonProps} />;
                case FieldType.MULTI_SELECT:
                  return (
                    <div key={field.id} className="col-span-full">
                      <MultiSelectField {...commonProps} />
                    </div>
                  );
                case FieldType.RANGE:
                  return <RangeField key={field.id} {...commonProps} />;
                case FieldType.COLOR_PICKER:
                  return <ColorPickerField key={field.id} {...commonProps} />;
                case FieldType.SIZE_SELECTOR:
                  return <SizeSelectorField key={field.id} {...commonProps} />;
                default:
                  return null;
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
};