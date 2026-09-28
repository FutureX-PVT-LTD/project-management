'use client';

export function CalendarYearSelect({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const year = value.getFullYear();
  return (
    <select aria-label="Calendar year" title="Calendar year" value={year}
      onChange={(event) => onChange(new Date(Number(event.target.value), value.getMonth(), 1))}
      className="h-6 w-[70px] rounded-[5px] border border-[#E2E8F0] bg-white px-1 text-[11px] font-medium text-[#0F172A] hover:border-[#CBD5E1] focus:outline-none focus:border-[#2563EB] transition-colors cursor-pointer">
      {Array.from({ length: 21 }, (_, index) => year - 10 + index).map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}
