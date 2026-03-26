export type FieldType = 'text' | 'number' | 'select' | 'boolean';

export type ServiceCategory = 'chat' | 'push' | 'email' | 'webhook' | 'self-hosted';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface ServiceField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  sensitive: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean;
  options?: FieldOption[];
  validation?: FieldValidation;
}

export interface ServiceSchema {
  service: string;
  label: string;
  description: string;
  schemes: string[];
  category: ServiceCategory;
  iconHint: string;
  fields: ServiceField[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface BuildUrlResult {
  url: string;
  errors: ValidationError[];
}

export interface DecomposeResult {
  service: string;
  fields: Record<string, string | number | boolean>;
}
