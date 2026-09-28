'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Flag,
  ArrowRight,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import Link from 'next/link';
import { calendarDateKey } from './calendar-date';
import { CalendarYearSelect } from './CalendarYearSelect';

interface CalendarWidgetProps {
  tasks?: any[];
  milestones?: any[];
  projects?: any[];
  onSelectTask?: (taskId: string) => void;
  className?: string;
  borderless?: boolean;
  title?: string;
}

export function CalendarWidget({
  tasks = [],
  milestones = [],
  projects = [],
  onSelectTask,
  className,
  borderless = false,
  title,
}: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const today = new Date();

  // Pre-index deliverables by YYYY-MM-DD string into a map: O(N) once rather than O(N * 42 cells)
  const deliverablesMap = useMemo(() => {
    const map = new Map<string, { tasks: any[]; milestones: any[]; projects: any[]; totalCount: number }>();
    const getEntry = (key: string) => {
      let entry = map.get(key);
      if (!entry) {
        entry = { tasks: [], milestones: [], projects: [], totalCount: 0 };
        map.set(key, entry);
      }
      return entry;
    };

    tasks.forEach((t) => {
      if (t.dueDate) {
        const key = t.dueDate.split('T')[0];
        const e = getEntry(key);
        e.tasks.push(t);
        e.totalCount++;
      }
    });

    milestones.forEach((m) => {
      const d = m.targetDate || m.dueDate;
      if (d) {
        const key = d.split('T')[0];
        const e = getEntry(key);
        e.milestones.push(m);
        e.totalCount++;
      }
    });

    projects.forEach((p) => {
      if (p.targetDate) {
        const key = p.targetDate.split('T')[0];
        const e = getEntry(key);
        e.projects.push(p);
        e.totalCount++;
      }
    });

    return map;
  }, [tasks, milestones, projects]);

  const getDeliverablesForDate = (date: Date) => {
    const dateStr = calendarDateKey(date);
    return deliverablesMap.get(dateStr) || { tasks: [], milestones: [], projects: [], totalCount: 0 };
  };

  // Days grid construction memoized to avoid recomputing 42 cells on unrelated renders
  const calendarDays = useMemo(() => {
    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(year, month - 1, dayNum);
      const dateStr = calendarDateKey(date);
      days.push({
        date,
        dayNum,
        isCurrentMonth: false,
        deliverables: deliverablesMap.get(dateStr) || { tasks: [], milestones: [], projects: [], totalCount: 0 },
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayNum = i;
      const date = new Date(year, month, dayNum);
      const dateStr = calendarDateKey(date);
      days.push({
        date,
        dayNum,
        isCurrentMonth: true,
        deliverables: deliverablesMap.get(dateStr) || { tasks: [], milestones: [], projects: [], totalCount: 0 },
      });
    }

    // Next month padding days to complete 35 or 42 grid
    const remainingCells = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const dayNum = i;
      const date = new Date(year, month + 1, dayNum);
      const dateStr = calendarDateKey(date);
      days.push({
        date,
        dayNum,
        isCurrentMonth: false,
        deliverables: deliverablesMap.get(dateStr) || { tasks: [], milestones: [], projects: [], totalCount: 0 },
      });
    }

    return days;
  }, [year, month, firstDayIndex, daysInMonth, daysInPrevMonth, deliverablesMap]);

  const selectedDeliverables = getDeliverablesForDate(selectedDate);

  const containerClasses = cn(
    'space-y-4 bg-white',
    borderless ? 'p-0' : 'rounded-[12px] border border-[#E2E8F0] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
    className,
  );

  return (
    <div className={containerClasses}>
      {/* Widget Header */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div>
            {title && (
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                {title}
              </h2>
            )}
            <h3 className={cn(
              'text-[13px] font-semibold text-[#0F172A] tracking-tight',
              title && 'text-[11px] font-medium text-[#64748B]'
            )}>
              {monthNames[month]} {year}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <CalendarYearSelect value={currentDate} onChange={setCurrentDate} />
          <button
            type="button"
            onClick={prevMonth}
            className="w-6 h-6 rounded-[5px] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(new Date());
            }}
            className="px-2 py-0.5 text-[11px] font-medium text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-[5px] border border-[#DBEAFE]/80 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-6 h-6 rounded-[5px] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center transition-colors"
            title="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider select-none py-0.5">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((cell, idx) => {
          const isToday = isSameDay(cell.date, today);
          const isSelected = isSameDay(cell.date, selectedDate);
          const hasEvents = cell.deliverables.totalCount > 0;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedDate(cell.date)}
              className={cn(
                'h-7 w-7 mx-auto rounded-full flex flex-col items-center justify-center text-[11px] relative transition-colors select-none',
                !cell.isCurrentMonth && 'text-[#CBD5E1]',
                cell.isCurrentMonth && !isSelected && !isToday && 'text-[#0F172A] hover:bg-[#F1F5F9]',
                isToday && !isSelected && 'font-semibold text-[#2563EB] bg-[#EFF6FF]',
                isSelected && 'bg-[#2563EB] text-white font-medium shadow-xs',
              )}
            >
              <span>{cell.dayNum}</span>
              {hasEvents && (
                <span
                  className={cn(
                    'absolute bottom-0.5 w-1 h-1 rounded-full',
                    isSelected ? 'bg-white' : 'bg-[#2563EB]',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Agenda */}
      <div className="pt-3.5 border-t border-[#F1F5F9] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[12px] text-[#0F172A]">
            {selectedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              weekday: 'short',
            })}
          </span>
          <Link
            href="/calendar"
            className="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 group transition-colors"
          >
            <span>Full Calendar</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {selectedDeliverables.totalCount === 0 ? (
          <p className="text-[11.5px] text-[#94A3B8] py-2.5 text-center">No deadlines scheduled for this date.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
            {selectedDeliverables.tasks.map((task: any) => (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task.id)}
                className="p-2 rounded-[8px] hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] flex items-center justify-between gap-2.5 cursor-pointer transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[#64748B] bg-[#F1F5F9] px-1 py-0.2 rounded-[4px] border border-[#E2E8F0]">
                      {task.humanId || 'FX'}
                    </span>
                    <p className="text-[12px] font-medium text-[#0F172A] group-hover:text-[#2563EB] transition-colors truncate">
                      {task.title}
                    </p>
                  </div>
                  {task.project && (
                    <p className="text-[10.5px] text-[#64748B] truncate mt-0.5">
                      {task.project.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <PriorityBadge priority={task.priority} compact />
                  <StatusPill status={task.status} size="xs" />
                </div>
              </div>
            ))}

            {selectedDeliverables.milestones.map((m: any) => (
              <div
                key={m.id}
                className="p-2.5 rounded-[10px] bg-[#FAFAFD] border border-[#EDE9FE] hover:border-[#DDD6FE] flex items-center justify-between gap-2 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                    <p className="text-[12px] font-medium text-[#0F172A] truncate">
                      {m.title || m.name}
                    </p>
                  </div>
                  <p className="text-[10.5px] text-[#64748B] truncate mt-0.5 pl-5">
                    Milestone Target · {m.project?.name || 'Project'}
                  </p>
                </div>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] bg-white text-[#7C3AED] border border-[#DDD6FE] shrink-0">
                  Milestone
                </span>
              </div>
            ))}

            {selectedDeliverables.projects.map((p: any) => (
              <div
                key={p.id}
                className="p-2.5 rounded-[10px] bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] flex items-center justify-between gap-2.5 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.04)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                    <p className="text-[12px] font-semibold text-[#0F172A] truncate">
                      {p.name}
                    </p>
                  </div>
                  <p className="text-[10.5px] text-[#64748B] truncate mt-0.5 pl-3">
                    Project Target Launch
                  </p>
                </div>
                <span className="text-[10px] font-medium tracking-tight px-2 py-0.5 rounded-[5px] bg-[#EFF6FF] text-[#1D4ED8] border border-[#DBEAFE] shrink-0">
                  Project Deadline
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
