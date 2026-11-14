/**
 * A deliberately small JSON-schema-like validator. Writing it ourselves keeps the
 * framework dependency-free and makes contract failures easy to read.
 */
export type Schema =
  | { type: 'string'; pattern?: RegExp; enum?: readonly string[]; nullable?: boolean }
  | { type: 'number' | 'integer'; minimum?: number; nullable?: boolean }
  | { type: 'boolean'; nullable?: boolean }
  | { type: 'array'; items: Schema; nullable?: boolean }
  | { type: 'object'; properties: Record<string, Schema>; required?: readonly string[]; additionalProperties?: boolean; nullable?: boolean };

export function validate(value: unknown, schema: Schema, path = '$'): string[] {
  if (value === null && schema.nullable) return [];
  const errors: string[] = [];
  const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;

  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') return [`${path}: expected string, got ${actual}`];
      if (schema.pattern && !schema.pattern.test(value)) errors.push(`${path}: "${value}" does not match ${schema.pattern}`);
      if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: "${value}" not in [${schema.enum.join(', ')}]`);
      break;
    case 'number':
    case 'integer':
      if (typeof value !== 'number' || Number.isNaN(value)) return [`${path}: expected ${schema.type}, got ${actual}`];
      if (schema.type === 'integer' && !Number.isInteger(value)) errors.push(`${path}: expected integer, got ${value}`);
      if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: ${value} < minimum ${schema.minimum}`);
      break;
    case 'boolean':
      if (typeof value !== 'boolean') return [`${path}: expected boolean, got ${actual}`];
      break;
    case 'array':
      if (!Array.isArray(value)) return [`${path}: expected array, got ${actual}`];
      value.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`)));
      break;
    case 'object': {
      if (actual !== 'object') return [`${path}: expected object, got ${actual}`];
      const obj = value as Record<string, unknown>;
      for (const key of schema.required ?? []) {
        if (!(key in obj)) errors.push(`${path}.${key}: is required`);
      }
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in obj) errors.push(...validate(obj[key], sub, `${path}.${key}`));
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(obj)) {
          if (!(key in schema.properties)) errors.push(`${path}.${key}: unexpected property`);
        }
      }
      break;
    }
  }
  return errors;
}
