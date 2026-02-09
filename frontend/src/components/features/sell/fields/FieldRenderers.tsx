import React, { useState, useEffect } from 'react';
import { FieldSchema, FieldOption } from '../../../../types/category-fields.types';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { cn } from '../../../../lib/utils';
import { getModelsForMake } from '../../../../data/vehicle-data';

interface FieldProps {
  schema: FieldSchema;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  formValues?: any; // For dependency handling
}

export const TextField: React.FC<FieldProps> = ({ schema, value, onChange, error }) => (
  <Input
    label={schema.label}
    placeholder={schema.placeholder}
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    error={error}
    helperText={schema.helpText}
  />
);

export const NumberField: React.FC<FieldProps> = ({ schema, value, onChange, error }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {schema.label} {schema.required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <input
        type="number"
        className={cn(
          "flex h-11 w-full rounded-xl border bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all",
          error ? "border-red-500" : "border-app-color",
          schema.unit ? "pr-12" : ""
        )}
        placeholder={schema.placeholder || '0'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      />
      {schema.unit && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium pointer-events-none">
          {schema.unit}
        </div>
      )}
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

export const SelectField: React.FC<FieldProps> = ({ schema, value, onChange, error, formValues }) => {
  const [options, setOptions] = useState<{label: string, value: string}[]>([]);

  useEffect(() => {
    // Handle Dependencies
    if (schema.dependsOn && schema.id === 'model' && formValues?.make) {
      const models = getModelsForMake(formValues.make);
      setOptions(models.map(m => ({ label: m, value: m })));
    } else if (schema.options) {
      // Normalize options to object format
      const opts = schema.options.map(opt => 
        typeof opt === 'string' ? { label: opt, value: opt } : { label: opt.label, value: String(opt.value) }
      );
      setOptions(opts);
    }
  }, [schema, formValues?.make]);

  // If it depends on something that isn't selected yet, disable it
  const isDisabled = schema.dependsOn && (!formValues || !formValues[schema.dependsOn]);

  return (
    <Select
      label={schema.label}
      options={options}
      value={value}
      onChange={onChange}
      error={error}
      disabled={isDisabled}
      placeholder={isDisabled ? `Select ${schema.dependsOn} first` : `Select ${schema.label}`}
      searchable={options.length > 10}
    />
  );
};

export const RadioField: React.FC<FieldProps> = ({ schema, value, onChange, error }) => {
  const options = schema.options?.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  ) || [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {schema.label} {schema.required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium border transition-all",
              value === opt.value
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border-app-color hover:border-primary-400"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export const MultiSelectField: React.FC<FieldProps> = ({ schema, value, onChange, error }) => {
  const selected = Array.isArray(value) ? value : [];
  const options = schema.options?.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  ) || [];

  const toggleOption = (val: string | number) => {
    if (selected.includes(val)) {
      onChange(selected.filter((item: any) => item !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {schema.label} {schema.required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((opt) => (
          <div 
            key={String(opt.value)}
            onClick={() => toggleOption(opt.value)}
            className={cn(
              "cursor-pointer px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2 select-none",
              selected.includes(opt.value)
                ? "bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300"
                : "bg-white dark:bg-neutral-800 border-app-color text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-700"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded border flex items-center justify-center",
              selected.includes(opt.value) ? "bg-primary-600 border-primary-600" : "border-gray-400"
            )}>
              {selected.includes(opt.value) && <span className="text-white text-[10px] font-bold">✓</span>}
            </div>
            {opt.label}
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export const YearField: React.FC<FieldProps> = ({ schema, value, onChange, error }) => {
  const currentYear = new Date().getFullYear() + 1;
  const startYear = schema.validation?.min || 1990;
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => {
    const year = String(currentYear - i);
    return { label: year, value: year };
  });

  return (
    <Select
      label={schema.label}
      options={years}
      value={value}
      onChange={onChange}
      error={error}
      searchable
    />
  );
};

export const CheckboxField: React.FC<FieldProps> = ({ schema, value, onChange, error }) => (
  <div>
    <Checkbox
      label={schema.label}
      checked={!!value}
      onChange={(e) => onChange(e.target.checked)}
    />
    {schema.helpText && <p className="text-xs text-gray-500 mt-1 ml-8">{schema.helpText}</p>}
    {error && <p className="text-xs text-red-500 mt-1 ml-8">{error}</p>}
  </div>
);