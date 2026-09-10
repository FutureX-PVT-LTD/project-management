export function calendarDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calendarRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    startDate: `${calendarDateKey(new Date(year, month - 1, 1))}T00:00:00.000Z`,
    endDate: `${calendarDateKey(new Date(year, month + 2, 0))}T23:59:59.999Z`,
  };
}
