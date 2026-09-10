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
import { CalendarSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { calendarDateKey, calendarRange } from './calendar-date';
import { CalendarYearSelect } from './CalendarYearSelect';
import { useAuth } from '@/features/auth/AuthContext';

export function CalendarView() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Range-bound tasks query to current month +/- 1 month padding
  const { startDate, endDate } = calendarRange(currentDate);

  // Fetch range-bounded tasks for calendar
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'calendar', user?.id, year, month],
    enabled: !!user,
    queryFn: () => api.get(`/tasks?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
    staleTime: 30000,
  });

  // Fetch projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
    staleTime: 60000,
  });

  const allTasks = (tasksData as any[]) || [];
  const projects = (projectsData as any[]) || [];

  if (tasksLoading && allTasks.length === 0) {
    return (
      <AppShell>
        <CalendarSkeleton />
      </AppShell>
    );
  }

  // Filter tasks
  const tasks = allTasks.filter((t) => {
    if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (debouncedSearch && !t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) && !t.humanId?.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

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
    const dateStr = calendarDateKey(date);
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
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
              Project Calendar
            </h1>
            <p className="text-xs text-[#60666F] mt-1">
              Deliverable milestones, task target deadlines, and project schedules.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Toggle */}
            <div className="flex items-center gap-1 border border-[#E8EBEF] rounded-[9px] p-0.5 bg-[#F8F9FB]">
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-[7px] transition-colors',
                  viewMode === 'month' ? 'bg-white text-[#2463EB] font-semibold shadow-xs' : 'text-[#60666F] hover:text-[#17191C]',
                )}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-[7px] transition-colors',
                  viewMode === 'week' ? 'bg-white text-[#2463EB] font-semibold shadow-xs' : 'text-[#60666F] hover:text-[#17191C]',
                )}
              >
                Week
              </button>
            </div>

            {/* Month/Week Navigation */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FB] border border-[#E8EBEF] rounded-[9px] px-2 py-1">
              <button
                onClick={prevPeriod}
                className="p-1 rounded text-[#8C939E] hover:text-[#17191C] hover:bg-white transition-colors"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-[#17191C] min-w-[120px] text-center">
                {monthNames[month]} {year}
              </span>
              <CalendarYearSelect value={currentDate} onChange={setCurrentDate} />
              <button
                onClick={nextPeriod}
                className="p-1 rounded text-[#8C939E] hover:text-[#17191C] hover:bg-white transition-colors"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 bg-[#F8F9FB] border border-[#E8EBEF] rounded-[9px] text-xs font-medium text-[#60666F] hover:text-[#17191C] hover:bg-[#F2F4F7] transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="border-y border-[#E8EBEF] py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C939E]" />
              <input
                type="text"
                placeholder="Search calendar events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FB] border border-[#E8EBEF] rounded-[9px] text-[#17191C] placeholder:text-[#8C939E] focus:bg-white focus:outline-none focus:border-[#2463EB]"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-[#F8F9FB] border border-[#E8EBEF] rounded-[9px] text-[#17191C] focus:bg-white focus:outline-none focus:border-[#2463EB]"
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
              className="h-8 px-2.5 text-xs bg-[#F8F9FB] border border-[#E8EBEF] rounded-[9px] text-[#17191C] focus:bg-white focus:outline-none focus:border-[#2463EB]"
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

          <div className="text-xs text-[#8C939E]">
            Showing <span className="font-semibold text-[#17191C]">{tasks.length}</span> scheduled deliverables
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white border border-[#E8EBEF] rounded-[10px] overflow-hidden shadow-none">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-[#E8EBEF] bg-[#F8F9FB] text-center text-xs font-medium text-[#8C939E] py-2.5 select-none">
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
              'grid grid-cols-7 divide-x divide-y divide-[#E8EBEF]',
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
                    'p-1.5 sm:p-2 flex flex-col justify-between transition-colors min-h-[110px] sm:min-h-[130px]',
                    !cell.isCurrentMonth && 'bg-[#F8F9FB]/40 text-[#8C939E]/40',
                    cell.isCurrentMonth && 'bg-white hover:bg-[#F8F9FB]/50',
                  )}
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full select-none',
                        isToday && 'bg-[#2463EB] text-white font-semibold',
                        !isToday && cell.isCurrentMonth && 'text-[#17191C]',
                        !isToday && !cell.isCurrentMonth && 'text-[#8C939E]/40',
                      )}
                    >
                      {cell.date.getDate()}
                    </span>

                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-mono text-[#8C939E] bg-[#F8F9FB] px-1.5 py-0.2 rounded border border-[#E8EBEF]">
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
                          'p-1.5 rounded-[6px] border text-[11px] cursor-pointer transition-colors select-none truncate',
                          task.status === TaskStatus.DONE
                            ? 'bg-[#EDF7F2] border-[#C6E6D6] text-[#26715A]'
                            : task.status === TaskStatus.WAITING
                              ? 'bg-[#FFF7E8] border-[#F0DFB7] text-[#9A6515]'
                              : task.status === TaskStatus.BLOCKED
                                ? 'bg-[#FCEEEE] border-[#F2C0C0] text-[#B54747]'
                                : 'bg-[#F8F9FB] border-[#E8EBEF] text-[#17191C] hover:border-[#2463EB] hover:bg-white',
                        )}
                        title={`${task.humanId}: ${task.title}`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-mono text-[9px] text-[#8C939E] shrink-0">
                            {task.humanId || 'FX'}
                          </span>
                          <span className="truncate font-medium">{task.title}</span>
                        </div>
                      </div>
                    ))}

                    {dayTasks.length > 3 && (
                      <p className="text-[10px] font-medium text-[#2463EB] text-center">
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
