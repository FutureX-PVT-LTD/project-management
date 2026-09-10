'use client';

export function CalendarYearSelect({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const year = value.getFullYear();
  return (
    <select aria-label="Calendar year" title="Calendar year" value={year}
      onChange={(event) => onChange(new Date(Number(event.target.value), value.getMonth(), 1))}
      className="h-8 w-20 rounded border border-fx-border bg-white px-1 text-xs text-fx-text-primary">
      {Array.from({ length: 21 }, (_, index) => year - 10 + index).map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}
