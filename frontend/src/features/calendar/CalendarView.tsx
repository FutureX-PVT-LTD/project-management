'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/layout/AppShell';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flag,
  FolderKanban,
  Search,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { TaskPriority, TaskStatus } from '@futurex/shared';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'calendar'],
    queryFn: () => api.get('/tasks'),
  });

  // Fetch projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const allTasks = (tasksData as any[]) || [];
  const projects = (projectsData as any[]) || [];

  // Filter tasks
  const tasks = allTasks.filter((t) => {
    if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.humanId?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const today = new Date();

  // Get tasks for a given date
  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter((t) => t.dueDate && t.dueDate.startsWith(dateStr));
  };

  // Build Month Grid
  const buildMonthDays = () => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({ date, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  };

  // Build Week Days
  const buildWeekDays = () => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day; // start on Sunday
    const startOfWeek = new Date(curr.setDate(diff));

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(startOfWeek);
      nextDate.setDate(startOfWeek.getDate() + i);
      weekDays.push({ date: nextDate, isCurrentMonth: true });
    }
    return weekDays;
  };

  const displayedDays = viewMode === 'month' ? buildMonthDays() : buildWeekDays();

  return (
    <AppShell fullWidth>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      <div className="space-y-5 max-w-[1600px] mx-auto">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-[#181B20]">
              Project Calendar
            </h1>
            <p className="text-sm text-[#626A73] mt-1">
              Deliverable milestones, task target deadlines, and project schedules.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Toggle */}
            <div className="flex items-center gap-1 border border-[#E3E7EC] rounded-[8px] p-0.5 bg-[#F7F8FA]">
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md fx-transition',
                  viewMode === 'month' ? 'bg-white text-[#2563EB] font-semibold shadow-xs' : 'text-[#626A73] hover:text-[#181B20]',
                )}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md fx-transition',
                  viewMode === 'week' ? 'bg-white text-[#2563EB] font-semibold shadow-xs' : 'text-[#626A73] hover:text-[#181B20]',
                )}
              >
                Week
              </button>
            </div>

            {/* Month/Week Navigation */}
            <div className="flex items-center gap-1.5 bg-[#F7F8FA] border border-[#E3E7EC] rounded-[8px] px-2 py-1">
              <button
                onClick={prevPeriod}
                className="p-1 rounded text-fx-text-muted hover:text-fx-text-primary hover:bg-fx-bg-hover fx-transition"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-fx-text-primary min-w-[120px] text-center">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={nextPeriod}
                className="p-1 rounded text-fx-text-muted hover:text-fx-text-primary hover:bg-fx-bg-hover fx-transition"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 bg-[#F7F8FA] border border-[#E3E7EC] rounded-[8px] text-xs font-medium text-[#626A73] hover:text-[#181B20] hover:bg-[#F2F4F7] fx-transition"
            >
              Today
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="border-y border-[#E3E7EC] py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fx-text-muted" />
              <input
                type="text"
                placeholder="Search calendar events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F7F8FA] border border-[#E3E7EC] rounded-[10px] text-[#181B20] placeholder:text-[#929AA3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-[#F7F8FA] border border-[#E3E7EC] rounded-[10px] text-[#181B20] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-[#F7F8FA] border border-[#E3E7EC] rounded-[10px] text-[#181B20] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
            >
              <option value="ALL">All Statuses</option>
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.READY}>Ready to Start</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.WAITING}>Waiting on Prerequisite</option>
              <option value={TaskStatus.BLOCKED}>Blocked</option>
              <option value={TaskStatus.DONE}>Completed</option>
            </select>
          </div>

          <div className="text-xs text-fx-text-muted">
            Showing <span className="font-semibold text-fx-text-primary">{tasks.length}</span> scheduled deliverables
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white border border-[#E3E7EC] rounded-[12px] overflow-hidden shadow-none">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-[#E3E7EC] bg-[#F7F8FA] text-center text-xs font-semibold text-fx-text-muted py-2.5 select-none">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
              <div key={d} className="truncate px-1">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d.slice(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div
            className={cn(
              'grid grid-cols-7 divide-x divide-y divide-fx-border/70',
              viewMode === 'week' ? 'min-h-[500px]' : 'min-h-[700px]',
            )}
          >
            {displayedDays.map((cell, idx) => {
              const isToday = isSameDay(cell.date, today);
              const dayTasks = getTasksForDate(cell.date);

              return (
                <div
                  key={idx}
                  className={cn(
                    'p-1.5 sm:p-2 flex flex-col justify-between fx-transition min-h-[110px] sm:min-h-[130px]',
                    !cell.isCurrentMonth && 'bg-fx-bg/40 text-fx-text-muted/40',
                    cell.isCurrentMonth && 'bg-white hover:bg-fx-bg-hover/50',
                  )}
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full select-none',
                        isToday && 'bg-[#2563EB] text-white font-semibold',
                        !isToday && cell.isCurrentMonth && 'text-fx-text-primary',
                        !isToday && !cell.isCurrentMonth && 'text-fx-text-muted/40',
                      )}
                    >
                      {cell.date.getDate()}
                    </span>

                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-mono text-fx-text-muted bg-fx-bg px-1.5 py-0.2 rounded border border-[#E3E7EC]/60">
                        {dayTasks.length} {dayTasks.length === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>

                  {/* Tasks List in Cell */}
                  <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-24 no-scrollbar">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={cn(
                          'p-1.5 rounded-md border text-[11px] cursor-pointer fx-transition select-none truncate',
                          task.status === TaskStatus.DONE
                            ? 'bg-[#EDF8F2] border-[#237A57]/30 text-[#237A57]'
                            : task.status === TaskStatus.WAITING
                              ? 'bg-[#FFF6E5] border-[#A86B12]/30 text-[#A86B12]'
                              : task.status === TaskStatus.BLOCKED
                                ? 'bg-[#FDEEEE] border-[#C24141]/30 text-[#C24141]'
                                : 'bg-[#F7F8FA] border-[#E3E7EC] text-fx-text-primary hover:border-[#2563EB]/40 hover:bg-white',
                        )}
                        title={`${task.humanId}: ${task.title}`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-mono text-[9px] text-fx-text-muted shrink-0">
                            {task.humanId || 'FX'}
                          </span>
                          <span className="truncate font-medium">{task.title}</span>
                        </div>
                      </div>
                    ))}

                    {dayTasks.length > 3 && (
                      <p className="text-[10px] font-medium text-[#2563EB] text-center">
                        +{dayTasks.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
