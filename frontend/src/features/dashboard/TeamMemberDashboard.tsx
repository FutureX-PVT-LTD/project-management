'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  PlayCircle,
  Calendar,
  Sparkles,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  Inbox,
  Flame,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { TaskStatus, TaskPriority } from '@futurex/shared';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';

export function TeamMemberDashboard() {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-work', 'dashboard'],
    queryFn: () => api.get('/tasks/my-work'),
  });

  const allTasks = (tasks as any[]) || [];
  const inProgressTasks = allTasks.filter((t: any) => t.status === TaskStatus.IN_PROGRESS);
  const readyTasks = allTasks.filter((t: any) => t.status === TaskStatus.READY);
  const blockedTasks = allTasks.filter((t: any) => t.status === TaskStatus.BLOCKED);
  const inReviewTasks = allTasks.filter((t: any) => t.status === TaskStatus.IN_REVIEW);
  const doneTasks = allTasks.filter((t: any) => t.status === TaskStatus.DONE);

  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const overdueTasks = allTasks.filter(
    (t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE,
  );
  const dueSoonTasks = allTasks.filter(
    (t: any) =>
      t.dueDate &&
      new Date(t.dueDate) >= now &&
      new Date(t.dueDate) <= threeDaysFromNow &&
      t.status !== TaskStatus.DONE,
  );

  // Focus tasks: In Progress + High/Urgent Ready tasks
  const priorityQueue = allTasks.filter(
    (t: any) =>
      (t.status === TaskStatus.IN_PROGRESS ||
        t.status === TaskStatus.IN_REVIEW ||
        (t.status === TaskStatus.READY && (t.priority === TaskPriority.URGENT || t.priority === TaskPriority.HIGH))) &&
      t.status !== TaskStatus.DONE,
  );

  // Other ready to start tasks
  const otherReadyTasks = readyTasks.filter(
    (t: any) => !priorityQueue.some((p: any) => p.id === t.id),
  );

  const renderTaskRow = (task: any) => {
    const isOverdue =
      task.dueDate && new Date(task.dueDate) < now && task.status !== TaskStatus.DONE;
    const isBlocked = task.status === TaskStatus.BLOCKED;
    const unfinishedDeps = (task.blockedBy || []).filter(
      (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
    );

    return (
      <div
        key={task.id}
        onClick={() => setSelectedTaskId(task.id)}
        className={cn(
          'px-4 py-3.5 hover:bg-fx-bg-subtle cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-fx-border last:border-b-0',
          task.status === TaskStatus.READY && 'bg-fx-green-50/20',
          isOverdue && 'bg-red-50/25',
        )}
      >
        {/* Left: Task ID, Title, Project, Blocker Note */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-fx-text-muted text-[11px] shrink-0">
              {task.humanId}
            </span>
            <span className="font-semibold text-fx-text-primary text-[13px] truncate">
              {task.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-fx-text-muted">
            <span>{task.project?.name}</span>
            {task.milestone && <span>• {task.milestone.title}</span>}

            {/* Blocked Dependency Alert */}
            {isBlocked && (
              <span className="text-fx-semantic-danger font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {task.isManualBlocked
                  ? `Blocked: ${task.manualBlockReason || 'Manual block'}`
                  : unfinishedDeps.length > 0
                    ? `Waiting for ${unfinishedDeps[0].predecessorTask.humanId}: ${unfinishedDeps[0].predecessorTask.title}`
                    : 'Prerequisite dependencies incomplete'}
              </span>
            )}

            {task.status === TaskStatus.READY && (
              <span className="text-fx-green-900 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-fx-green-700" />
                Ready to start
              </span>
            )}
          </div>
        </div>

        {/* Right: Progress Track, Priority, Due Date, Status */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
          <div className="w-24 hidden md:block">
            <Progress value={task.progress} showLabel={true} size="xs" />
          </div>

          <PriorityBadge priority={task.priority} />

          <div className="flex items-center gap-1 text-[11px] min-w-[76px]">
            <Calendar className="w-3 h-3 text-fx-text-muted shrink-0" />
            <span
              className={cn(
                isOverdue
                  ? 'text-fx-semantic-danger font-bold'
                  : 'text-fx-text-secondary font-medium',
              )}
            >
              {formatDate(task.dueDate)}
            </span>
          </div>

          <StatusPill status={task.status} size="xs" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Task Slide-Over Detail Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* Header Greeting */}
      <div className="border-b border-fx-border pb-4">
        <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
          Good morning, {user?.firstName}
        </h1>
        <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
          Here’s what needs your attention today.
        </p>
      </div>

      {/* Top 5 KPI Summary Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Assigned */}
        <div className="bg-white p-3.5 rounded-[10px] border border-fx-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-text-muted font-medium block">Total Assigned</span>
            <span className="text-xl font-bold text-fx-text-primary mt-0.5 block">
              {allTasks.length}
            </span>
          </div>
          <Inbox className="w-5 h-5 text-fx-text-muted/60" />
        </div>

        {/* In Progress */}
        <div className="bg-white p-3.5 rounded-[10px] border border-fx-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#205896] font-medium block">In Progress</span>
            <span className="text-xl font-bold text-[#205896] mt-0.5 block">
              {inProgressTasks.length}
            </span>
          </div>
          <PlayCircle className="w-5 h-5 text-[#3578C9]" />
        </div>

        {/* Ready to Start */}
        <div className="bg-white p-3.5 rounded-[10px] border border-[#C6E4D3] bg-fx-green-50/50 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-green-900 font-semibold block">Ready to Start</span>
            <span className="text-xl font-bold text-fx-green-900 mt-0.5 block">
              {readyTasks.length}
            </span>
          </div>
          <CheckSquare className="w-5 h-5 text-fx-green-700" />
        </div>

        {/* Blocked Work */}
        <div className="bg-white p-3.5 rounded-[10px] border border-[#FAD3D3] bg-[#FDF2F2]/50 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-semantic-danger font-medium block">Blocked Work</span>
            <span className="text-xl font-bold text-fx-semantic-danger mt-0.5 block">
              {blockedTasks.length}
            </span>
          </div>
          <AlertCircle className="w-5 h-5 text-fx-semantic-danger" />
        </div>

        {/* Due Soon / Overdue */}
        <div className="bg-white p-3.5 rounded-[10px] border border-[#FCE6BD] bg-[#FEF6E6]/50 shadow-card flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[11px] text-fx-semantic-warning font-medium block">
              Due Soon / Overdue
            </span>
            <span className="text-xl font-bold text-fx-semantic-warning mt-0.5 block">
              {dueSoonTasks.length + overdueTasks.length}
            </span>
          </div>
          <Clock className="w-5 h-5 text-fx-semantic-warning" />
        </div>
      </div>

      {/* Main 65% / 35% Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (65% -> 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Priority Work Queue */}
          <Card padding="none" className="bg-white">
            <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#B76E00]" />
                <h2 className="text-sm font-semibold text-fx-text-primary tracking-tight">
                  Priority Work Queue
                </h2>
              </div>
              <span className="text-[11px] text-fx-text-muted font-mono font-medium">
                {priorityQueue.length} items
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-fx-text-muted">
                Loading your priority queue...
              </div>
            ) : priorityQueue.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-7 h-7 text-fx-green-700 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-fx-text-primary">
                  No urgent work in progress
                </p>
                <p className="text-[11px] text-fx-text-muted mt-0.5">
                  Pick a task from the Ready queue below to begin.
                </p>
              </div>
            ) : (
              <div>{priorityQueue.map(renderTaskRow)}</div>
            )}
          </Card>

          {/* Ready to Start Queue */}
          {otherReadyTasks.length > 0 && (
            <Card padding="none" className="bg-white">
              <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-fx-green-700" />
                  <h2 className="text-sm font-semibold text-fx-text-primary tracking-tight">
                    Ready to Start
                  </h2>
                </div>
                <span className="text-[11px] text-fx-green-900 font-semibold">
                  {otherReadyTasks.length} unblocked
                </span>
              </div>
              <div>{otherReadyTasks.map(renderTaskRow)}</div>
            </Card>
          )}

          {/* Blocked Work Section */}
          {blockedTasks.length > 0 && (
            <Card padding="none" className="bg-white">
              <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-fx-semantic-danger" />
                  <h2 className="text-sm font-semibold text-fx-text-primary tracking-tight">
                    Blocked Items ({blockedTasks.length})
                  </h2>
                </div>
              </div>
              <div>{blockedTasks.map(renderTaskRow)}</div>
            </Card>
          )}
        </div>

        {/* Right Column (35% -> 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upcoming Deadlines */}
          <Card padding="none" className="bg-white">
            <div className="px-4 py-3.5 border-b border-fx-border flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-muted">
                Upcoming Deadlines
              </h3>
              <Calendar className="w-3.5 h-3.5 text-fx-text-muted" />
            </div>

            {dueSoonTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-fx-text-muted">
                No immediate deadlines in the next 3 days.
              </div>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {overdueTasks.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="p-3.5 hover:bg-fx-bg-subtle cursor-pointer text-xs space-y-1 bg-red-50/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-fx-semantic-danger text-[11px]">
                        {t.humanId}
                      </span>
                      <span className="text-[10px] font-bold text-fx-semantic-danger uppercase">
                        Overdue
                      </span>
                    </div>
                    <p className="font-semibold text-fx-text-primary line-clamp-1">{t.title}</p>
                    <p className="text-[11px] text-fx-text-muted">{t.project?.name}</p>
                  </div>
                ))}

                {dueSoonTasks.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="p-3.5 hover:bg-fx-bg-subtle cursor-pointer text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-fx-text-muted text-[11px]">
                        {t.humanId}
                      </span>
                      <span className="text-[11px] text-fx-semantic-warning font-medium">
                        Due {formatDate(t.dueDate)}
                      </span>
                    </div>
                    <p className="font-semibold text-fx-text-primary line-clamp-1">{t.title}</p>
                    <p className="text-[11px] text-fx-text-muted">{t.project?.name}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Under Review Items */}
          {inReviewTasks.length > 0 && (
            <Card padding="none" className="bg-white">
              <div className="px-4 py-3.5 border-b border-fx-border flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-muted">
                  Submitted for Review
                </h3>
                <Hourglass className="w-3.5 h-3.5 text-fx-semantic-warning" />
              </div>
              <div className="divide-y divide-fx-border/60">
                {inReviewTasks.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="p-3.5 hover:bg-fx-bg-subtle cursor-pointer text-xs space-y-1 bg-[#FEF6E6]/25"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-fx-text-muted text-[11px]">
                        {t.humanId}
                      </span>
                      <StatusPill status={t.status} size="xs" />
                    </div>
                    <p className="font-semibold text-fx-text-primary line-clamp-1">{t.title}</p>
                    <p className="text-[11px] text-fx-text-muted">Pending Manager Approval</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
