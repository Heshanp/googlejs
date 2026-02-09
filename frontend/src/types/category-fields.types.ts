export enum FieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  RANGE = 'RANGE',
  COLOR_PICKER = 'COLOR_PICKER',
  SIZE_SELECTOR = 'SIZE_SELECTOR'
}

export interface FieldOption {
  label: string;
  value: string | number;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: boolean;
}

export interface FieldSchema {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  validation?: FieldValidation;
  dependsOn?: string; // ID of the field this depends on
  defaultValue?: any;
  filterable?: boolean;
  displayPriority?: number; // Lower number = higher priority
  unit?: string;
}

export interface CategoryFieldsConfig {
  categorySlug: string;
  fields: FieldSchema[];
  subcategoryOverrides?: {
    [subcategorySlug: string]: {
      add?: FieldSchema[];
      remove?: string[]; // IDs of fields to remove
      modify?: Partial<FieldSchema>[]; // Overrides for existing fields
    };
  };
}
