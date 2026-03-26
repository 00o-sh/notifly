import type { ServiceField, ServiceSchema, ValidationError } from './types.js';

function validateField(
  field: ServiceField,
  value: string | number | boolean | undefined,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check required
  if (field.required) {
    if (value === undefined || value === null || value === '') {
      errors.push({ field: field.key, message: `${field.label} is required` });
      return errors; // No further checks if missing
    }
  }

  if (value === undefined || value === null || value === '') {
    return errors; // Optional and empty — nothing to validate
  }

  // Type checks
  if (field.type === 'number') {
    const num = Number(value);
    if (isNaN(num)) {
      errors.push({ field: field.key, message: `${field.label} must be a number` });
      return errors;
    }
    if (field.validation?.min !== undefined && num < field.validation.min) {
      errors.push({ field: field.key, message: `${field.label} must be at least ${field.validation.min}` });
    }
    if (field.validation?.max !== undefined && num > field.validation.max) {
      errors.push({ field: field.key, message: `${field.label} must be at most ${field.validation.max}` });
    }
  }

  if (field.type === 'boolean') {
    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
      errors.push({ field: field.key, message: `${field.label} must be a boolean` });
    }
  }

  if (field.type === 'select' && field.options) {
    const validValues = field.options.map(o => o.value);
    if (!validValues.includes(String(value))) {
      errors.push({ field: field.key, message: `${field.label} must be one of: ${validValues.join(', ')}` });
    }
  }

  if (field.type === 'text' || field.type === 'select') {
    const str = String(value);
    if (field.validation?.minLength !== undefined && str.length < field.validation.minLength) {
      errors.push({ field: field.key, message: `${field.label} must be at least ${field.validation.minLength} characters` });
    }
    if (field.validation?.maxLength !== undefined && str.length > field.validation.maxLength) {
      errors.push({ field: field.key, message: `${field.label} must be at most ${field.validation.maxLength} characters` });
    }
    if (field.validation?.pattern) {
      const re = new RegExp(field.validation.pattern);
      if (!re.test(str)) {
        errors.push({ field: field.key, message: `${field.label} has an invalid format` });
      }
    }
  }

  return errors;
}

export function validateFields(
  schema: ServiceSchema,
  fields: Record<string, string | number | boolean>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const fieldDef of schema.fields) {
    const value = fields[fieldDef.key];
    errors.push(...validateField(fieldDef, value));
  }
  return errors;
}
