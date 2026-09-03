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
}

export function CalendarWidget({
  tasks = [],
  milestones = [],
  projects = [],
  onSelectTask,
  className,
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
    const date = new Date(year, month, i);
    calendarDays.push({
      date,
      dayNum: i,
      isCurrentMonth: true,
      deliverables: getDeliverablesForDate(date),
    });
  }

  // Next month padding days to complete 35 or 42 grid
  const remainingCells = 35 - calendarDays.length > 0 ? 35 - calendarDays.length : 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const date = new Date(year, month + 1, i);
    calendarDays.push({
      date,
      dayNum: i,
      isCurrentMonth: false,
      deliverables: getDeliverablesForDate(date),
    });
  }

  const selectedDeliverables = getDeliverablesForDate(selectedDate);

  return (
    <div className={cn('bg-white border border-fx-border rounded-xl p-4 sm:p-5 space-y-4', className)}>
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-fx-green-soft text-fx-green-dark border border-fx-green/20 flex items-center justify-center">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-semibold text-fx-text-primary tracking-tight">
            {monthNames[month]} {year}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-md text-fx-text-muted hover:text-fx-text-primary hover:bg-fx-bg-hover fx-transition"
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
            className="px-2 py-0.5 text-[11px] font-medium text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-hover rounded fx-transition"
          >
            Today
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-md text-fx-text-muted hover:text-fx-text-primary hover:bg-fx-bg-hover fx-transition"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-fx-text-muted select-none">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="py-1">
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
                'h-8 rounded-md flex flex-col items-center justify-center text-xs relative fx-transition select-none',
                !cell.isCurrentMonth && 'text-fx-text-muted/40',
                cell.isCurrentMonth && !isSelected && 'text-fx-text-primary hover:bg-fx-bg-hover',
                isToday && !isSelected && 'font-semibold text-fx-green',
                isSelected && 'bg-fx-green text-white font-medium shadow-sm',
              )}
            >
              <span>{cell.dayNum}</span>
              {hasEvents && (
                <span
                  className={cn(
                    'absolute bottom-1 w-1 h-1 rounded-full',
                    isSelected ? 'bg-white' : 'bg-fx-green',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Agenda */}
      <div className="pt-3 border-t border-fx-border/70 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-fx-text-primary">
            {selectedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              weekday: 'short',
            })}
          </span>
          <Link
            href="/calendar"
            className="text-[11px] font-medium text-fx-green hover:underline flex items-center gap-1"
          >
            <span>Full Calendar</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {selectedDeliverables.totalCount === 0 ? (
          <p className="text-[11px] text-fx-text-muted py-2 text-center bg-fx-bg-subtle rounded-md">
            No deadlines scheduled for this date.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {selectedDeliverables.tasks.map((task: any) => (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task.id)}
                className="p-2 rounded-lg bg-fx-bg-subtle border border-fx-border/60 hover:border-fx-border hover:bg-fx-bg-hover flex items-center justify-between gap-2 cursor-pointer fx-transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-fx-text-muted">
                      {task.humanId || 'FX'}
                    </span>
                    <p className="text-xs font-medium text-fx-text-primary truncate">
                      {task.title}
                    </p>
                  </div>
                  {task.project && (
                    <p className="text-[10px] text-fx-text-secondary truncate mt-0.5">
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
                className="p-2 rounded-lg bg-purple-50/60 border border-purple-200/60 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Flag className="w-3 h-3 text-purple-600 shrink-0" />
                    <p className="text-xs font-semibold text-purple-900 truncate">
                      {m.title || m.name}
                    </p>
                  </div>
                  <p className="text-[10px] text-purple-700 truncate mt-0.5">
                    Milestone Target · {m.project?.name || 'Project'}
                  </p>
                </div>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-purple-100/80 text-purple-800 border border-purple-200">
                  Milestone
                </span>
              </div>
            ))}

            {selectedDeliverables.projects.map((p: any) => (
              <div
                key={p.id}
                className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-emerald-950 truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-emerald-800 truncate mt-0.5">
                    Project Target Launch
                  </p>
                </div>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-100/80 text-emerald-800 border border-emerald-200">
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
