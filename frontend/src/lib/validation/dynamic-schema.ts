import { z } from 'zod';
import { FieldSchema, FieldType } from '../../types/category-fields.types';

export const generateCategorySchema = (fields: FieldSchema[]) => {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let schema: z.ZodTypeAny;
    const requiredMsg = `${field.label} is required`;

    // Base type validation
    switch (field.type) {
      case FieldType.NUMBER:
        schema = z.number({
          message: requiredMsg
        });
        if (field.validation?.min !== undefined) schema = (schema as z.ZodNumber).min(field.validation.min, `${field.label} must be at least ${field.validation.min}`);
        if (field.validation?.max !== undefined) schema = (schema as z.ZodNumber).max(field.validation.max, `${field.label} must be at most ${field.validation.max}`);
        break;

      case FieldType.MULTI_SELECT:
        schema = z.array(z.string(), {
          message: requiredMsg
        });
        if (field.required) schema = (schema as z.ZodArray<z.ZodString>).min(1, "Select at least one option");
        break;

      case FieldType.CHECKBOX:
        schema = z.boolean({
          message: requiredMsg
        });
        break;

      case FieldType.RANGE:
        schema = z.object({
          min: z.number().optional(),
          max: z.number().optional()
        });
        break;

      default: // TEXT, TEXTAREA, SELECT, RADIO, COLOR_PICKER, SIZE_SELECTOR
        schema = z.string({
          message: requiredMsg
        });

        if (field.validation?.minLength) schema = (schema as z.ZodString).min(field.validation.minLength, `${field.label} must be at least ${field.validation.minLength} characters`);
        if (field.validation?.maxLength) schema = (schema as z.ZodString).max(field.validation.maxLength, `${field.label} must be at most ${field.validation.maxLength} characters`);
        if (field.validation?.pattern) schema = (schema as z.ZodString).regex(new RegExp(field.validation.pattern), "Invalid format");
        break;
    }

    // Apply required/optional
    if (!field.required) {
      schema = schema.optional().or(z.literal(''));
    } else {
      // For strings, ensure non-empty
      if (field.type === FieldType.TEXT || field.type === FieldType.TEXTAREA || field.type === FieldType.SELECT || field.type === FieldType.RADIO || field.type === FieldType.COLOR_PICKER || field.type === FieldType.SIZE_SELECTOR) {
        schema = (schema as z.ZodString).min(1, requiredMsg);
      }
    }

    shape[field.id] = schema;
  });

  return z.object(shape);
};
