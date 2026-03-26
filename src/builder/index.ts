import { SERVICE_SCHEMAS } from './schemas.js';
import { validateFields as _validateFields } from './validate.js';
import { buildUrl as _buildUrl } from './url-builder.js';
import { decomposeUrl as _decomposeUrl } from './url-decomposer.js';
import type {
  ServiceSchema,
  ServiceCategory,
  ServiceField,
  FieldType,
  FieldOption,
  FieldValidation,
  ValidationError,
  BuildUrlResult,
  DecomposeResult,
} from './types.js';

// Re-export all types
export type {
  ServiceSchema,
  ServiceCategory,
  ServiceField,
  FieldType,
  FieldOption,
  FieldValidation,
  ValidationError,
  BuildUrlResult,
  DecomposeResult,
};

/**
 * Get all service schemas.
 */
export function getServiceSchemas(): ServiceSchema[] {
  return SERVICE_SCHEMAS;
}

/**
 * Get the schema for a specific service by its registry key.
 */
export function getServiceSchema(service: string): ServiceSchema | undefined {
  return SERVICE_SCHEMAS.find(s => s.service === service);
}

/**
 * Search/filter schemas by label, description, category, or scheme.
 * Case-insensitive fuzzy match — returns schemas where the query appears
 * in any of the searchable fields.
 */
export function searchServices(query: string): ServiceSchema[] {
  const q = query.toLowerCase().trim();
  if (!q) return SERVICE_SCHEMAS;
  return SERVICE_SCHEMAS.filter(s =>
    s.label.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.category.toLowerCase().includes(q) ||
    s.schemes.some(scheme => scheme.toLowerCase().includes(q)) ||
    s.service.toLowerCase().includes(q),
  );
}

/**
 * Get all schemas belonging to a specific category.
 */
export function getServicesByCategory(category: ServiceCategory): ServiceSchema[] {
  return SERVICE_SCHEMAS.filter(s => s.category === category);
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  chat: 'Chat & Messaging',
  push: 'Push Notifications',
  email: 'Email',
  webhook: 'Custom Webhooks',
  'self-hosted': 'Self-Hosted',
};

/**
 * Get all categories with their display labels and service counts.
 */
export function getCategories(): { key: ServiceCategory; label: string; count: number }[] {
  const counts = new Map<ServiceCategory, number>();
  for (const schema of SERVICE_SCHEMAS) {
    counts.set(schema.category, (counts.get(schema.category) ?? 0) + 1);
  }
  return (Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map(key => ({
    key,
    label: CATEGORY_LABELS[key],
    count: counts.get(key) ?? 0,
  }));
}

/**
 * Validate field values against a service schema.
 * Returns an array of validation errors; empty array means valid.
 */
export function validateFields(
  service: string,
  fields: Record<string, string | number | boolean>,
): ValidationError[] {
  const schema = SERVICE_SCHEMAS.find(s => s.service === service);
  if (!schema) {
    return [{ field: 'service', message: `Unknown service: ${service}` }];
  }
  return _validateFields(schema, fields);
}

/**
 * Build a notifly URL from validated field values.
 * Validates first; returns errors if any required fields are missing or invalid.
 */
export function buildUrl(
  service: string,
  fields: Record<string, string | number | boolean>,
): BuildUrlResult {
  return _buildUrl(service, fields);
}

/**
 * Decompose an existing notifly URL back into its service key and field values.
 * Useful for editing an existing URL: decompose → display form → modify → rebuild.
 */
export function decomposeUrl(url: string): DecomposeResult {
  return _decomposeUrl(url);
}
