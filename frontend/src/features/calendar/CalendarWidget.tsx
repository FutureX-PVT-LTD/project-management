'use client';

import React, { useState } from 'react';
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

  // Find deliverables on dates
  const getDeliverablesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayTasks = tasks.filter((t) => t.dueDate && t.dueDate.startsWith(dateStr));
    const dayMilestones = milestones.filter(
      (m) => (m.targetDate || m.dueDate) && (m.targetDate || m.dueDate).startsWith(dateStr),
    );
    const dayProjects = projects.filter((p) => p.targetDate && p.targetDate.startsWith(dateStr));

    return {
      tasks: dayTasks,
      milestones: dayMilestones,
      projects: dayProjects,
      totalCount: dayTasks.length + dayMilestones.length + dayProjects.length,
    };
  };

  // Days grid construction
  const calendarDays = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const date = new Date(year, month - 1, dayNum);
    calendarDays.push({
      date,
      dayNum,
      isCurrentMonth: false,
      deliverables: getDeliverablesForDate(date),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dayNum = i;
    const date = new Date(year, month, dayNum);
    calendarDays.push({
      date,
      dayNum,
      isCurrentMonth: true,
      deliverables: getDeliverablesForDate(date),
    });
  }

  // Next month padding days to complete 35 or 42 grid
  const remainingCells = 35 - calendarDays.length > 0 ? 35 - calendarDays.length : 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const dayNum = i;
    const date = new Date(year, month + 1, dayNum);
    calendarDays.push({
      date,
      dayNum,
      isCurrentMonth: false,
      deliverables: getDeliverablesForDate(date),
    });
  }

  const selectedDeliverables = getDeliverablesForDate(selectedDate);

  const containerClasses = cn('space-y-4 bg-white rounded-[16px] border border-[#E4E7EB] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]', className);

  return (
    <div className={containerClasses}>
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          
          <div>
            {title && (
              <h2 className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-[#17191C]">
                {title}
              </h2>
            )}
            <h3 className={cn(
              'text-sm font-bold text-[#17191C] tracking-tight',
              title && 'text-[11px] font-normal text-[#62676D]'
            )}>
              {monthNames[month]} {year}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            className="w-6 h-6 rounded-[5px] text-[#62676D] hover:text-[#17191C] hover:bg-[#F3F5F7] flex items-center justify-center fx-transition"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(new Date());
            }}
            className="px-2 py-0.5 text-[11px] font-medium text-[#0077E6] bg-[#EAF5FF] hover:bg-[#D8ECFF] rounded-[6px] fx-transition"
          >
            Today
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-6 h-6 rounded-[5px] text-[#62676D] hover:text-[#17191C] hover:bg-[#F3F5F7] flex items-center justify-center fx-transition"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-[#92979D] select-none py-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
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
                'h-8 w-8 mx-auto rounded-full flex flex-col items-center justify-center text-xs relative fx-transition select-none',
                !cell.isCurrentMonth && 'text-[#92979D]/30',
                cell.isCurrentMonth && !isSelected && !isToday && 'text-[#17191C] hover:bg-[#F3F5F7]',
                isToday && !isSelected && 'font-semibold text-[#0077E6] ring-1 ring-[#0088FF]/30 bg-[#EAF5FF]',
                isSelected && 'bg-[#0088FF] text-white font-semibold shadow-xs',
              )}
            >
              <span>{cell.dayNum}</span>
              {hasEvents && (
                <span
                  className={cn(
                    'absolute bottom-1 w-1 h-1 rounded-full',
                    isSelected ? 'bg-white' : 'bg-[#0088FF]',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Agenda */}
      <div className="pt-4 border-t border-[#E8EBEF] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#17191C]">
            {selectedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              weekday: 'short',
            })}
          </span>
          <Link
            href="/calendar"
            className="text-[11px] font-semibold text-[#0077E6] hover:text-[#0068CC] flex items-center gap-1"
          >
            <span>Full Calendar</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {selectedDeliverables.totalCount === 0 ? (
          <p className="text-[12px] text-[#92979D] py-2 text-center">No deadlines scheduled for this date.</p>
        ) : (
          <div className="divide-y divide-[#E6E8EB] max-h-52 overflow-y-auto">
            {selectedDeliverables.tasks.map((task: any) => (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task.id)}
                className="py-2 flex items-center justify-between gap-2 cursor-pointer hover:text-[#0077E6] fx-transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[#92979D]">
                      {task.humanId || 'FX'}
                    </span>
                    <p className="text-xs font-semibold text-[#17191C] truncate">
                      {task.title}
                    </p>
                  </div>
                  {task.project && (
                    <p className="text-[10px] text-[#62676D] truncate mt-0.5">
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
                className="p-2.5 rounded-[8px] bg-[#F7F4FD] border border-[#EDE5FC] rounded-[10px] flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-[#7558B8] shrink-0" />
                    <p className="text-xs font-semibold text-[#17191C] truncate">
                      {m.title || m.name}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#7558B8] truncate mt-0.5">
                    Milestone Target · {m.project?.name || 'Project'}
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-white text-[#7558B8] border border-[#E6D8FF]">
                  Milestone
                </span>
              </div>
            ))}

            {selectedDeliverables.projects.map((p: any) => (
              <div
                key={p.id}
                className="p-2.5 rounded-[8px] bg-[#F5FAFF] border border-[#E0EFFF] rounded-[10px] flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#17191C] truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-[#0068CC] truncate mt-0.5">
                    Project Target Launch
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-white text-[#0068CC] border border-[#EDF4F8]">
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
