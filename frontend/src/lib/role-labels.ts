type RoleRecord = {
  name?: string;
  functionalRole?: RoleRecord;
};

export function roleNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value
      .map((entry) => {
        const record = entry as RoleRecord;
        return record.functionalRole?.name || record.name || '';
      })
      .filter(Boolean),
  )];
}

export function roleLabel(value: unknown, emptyLabel = 'No functional role assigned'): string {
  const names = roleNames(value);
  return names.length ? names.join(', ') : emptyLabel;
}
