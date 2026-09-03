export function asArray<T = any>(value: unknown, key?: string): T[] {
  if (Array.isArray(value)) return value as T[];

  if (key && value && typeof value === 'object') {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as T[];
  }

  return [];
}

export function asRecord<T extends Record<string, any> = Record<string, any>>(
  value: unknown,
): T {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as T)
    : ({} as T);
}
