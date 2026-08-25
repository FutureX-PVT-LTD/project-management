'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  PlayCircle,
  Calendar,
  Sparkles,
  CheckCircle2,
  Hourglass,
  Lock,
  ArrowRight,
  Inbox,
  Flame,
  Play,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { TaskStatus, TaskPriority } from '@futurex/shared';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';

export function TeamMemberDashboard() {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-work', 'dashboard'],
    queryFn: () => api.get('/tasks/my-work'),
  });

  const startTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.patch(`/tasks/${taskId}`, { status: TaskStatus.IN_PROGRESS, progress: 15 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
    },
  });

  const allTasks = (tasks as any[]) || [];
  const inProgressTasks = allTasks.filter((t: any) => t.status === TaskStatus.IN_PROGRESS);
  const readyTasks = allTasks.filter((t: any) => t.status === TaskStatus.READY);
  const waitingTasks = allTasks.filter((t: any) => t.status === TaskStatus.WAITING);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Task Slide-Over Detail Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* Header Greeting */}
      <div className="border-b border-fx-border pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
            {getGreeting()}, {user?.firstName}
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            Here is your current workload and next actionable tasks.
          </p>
        </div>
        <div className="text-xs text-fx-text-muted font-medium bg-fx-bg-subtle px-3 py-1.5 rounded-lg border border-fx-border w-fit">
          Role: <span className="font-semibold text-fx-text-primary uppercase tracking-wider">{user?.globalRole?.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Top Metric Summary Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Assigned */}
        <div className="bg-white p-3.5 rounded-lg border border-fx-border shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-text-muted font-medium block">Total Assigned</span>
            <span className="text-xl font-bold text-fx-text-primary mt-0.5 block">{allTasks.length}</span>
          </div>
          <Inbox className="w-5 h-5 text-fx-text-muted/60 shrink-0" />
        </div>

        {/* In Progress */}
        <div className="bg-white p-3.5 rounded-lg border border-blue-200/80 bg-blue-50/20 shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#205896] font-medium block">In Progress</span>
            <span className="text-xl font-bold text-[#205896] mt-0.5 block">{inProgressTasks.length}</span>
          </div>
          <PlayCircle className="w-5 h-5 text-[#3578C9] shrink-0" />
        </div>

        {/* Ready to Start */}
        <div className="bg-white p-3.5 rounded-lg border border-fx-green-700/30 bg-fx-green-50/40 shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-green-900 font-semibold block">Ready to Start</span>
            <span className="text-xl font-bold text-fx-green-900 mt-0.5 block">{readyTasks.length}</span>
          </div>
          <CheckSquare className="w-5 h-5 text-fx-green-700 shrink-0" />
        </div>

        {/* Waiting on Others */}
        <div className="bg-white p-3.5 rounded-lg border border-gray-200 bg-gray-50/60 shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-text-secondary font-medium block">Waiting</span>
            <span className="text-xl font-bold text-fx-text-primary mt-0.5 block">{waitingTasks.length}</span>
          </div>
          <Lock className="w-4 h-4 text-fx-text-muted shrink-0" />
        </div>

        {/* Blocked Work */}
        <div className="bg-white p-3.5 rounded-lg border border-red-200/80 bg-red-50/30 shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-semantic-danger font-medium block">Blocked</span>
            <span className="text-xl font-bold text-fx-semantic-danger mt-0.5 block">{blockedTasks.length}</span>
          </div>
          <AlertCircle className="w-5 h-5 text-fx-semantic-danger shrink-0" />
        </div>

        {/* Due Soon / Overdue */}
        <div className="bg-white p-3.5 rounded-lg border border-amber-200/80 bg-amber-50/30 shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-semantic-warning font-medium block">Due Soon / Overdue</span>
            <span className="text-xl font-bold text-fx-semantic-warning mt-0.5 block">
              {dueSoonTasks.length + overdueTasks.length}
            </span>
          </div>
          <Clock className="w-5 h-5 text-fx-semantic-warning shrink-0" />
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Primary Work Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: CURRENT WORK (In Progress) */}
          <Card padding="none" className="bg-white border border-fx-border shadow-subtle overflow-hidden">
            <div className="px-5 py-3.5 bg-fx-bg-subtle border-b border-fx-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-[#3578C9]" />
                <h2 className="text-sm font-bold text-fx-text-primary tracking-tight">
                  Current Work in Progress
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#205896] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                {inProgressTasks.length} active
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-fx-text-muted">Loading your work...</div>
            ) : inProgressTasks.length === 0 ? (
              <div className="p-7 text-center">
                <CheckCircle2 className="w-7 h-7 text-fx-green-700 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-fx-text-primary">No tasks currently in progress</p>
                <p className="text-[11px] text-fx-text-muted mt-0.5">
                  Select a ready task from below and click &quot;Start Work&quot; to begin.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-fx-border">
                {inProgressTasks.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-4 hover:bg-fx-bg-subtle cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-fx-text-muted text-[11px] shrink-0">
                          {task.humanId}
                        </span>
                        <span className="font-semibold text-fx-text-primary text-sm truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fx-text-secondary">
                        <span className="font-medium text-fx-text-primary">{task.project?.name}</span>
                        {task.milestone && <span>• {task.milestone.name}</span>}
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-fx-text-muted">
                            <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <div className="w-28 hidden sm:block">
                        <Progress value={task.progress} showLabel={true} size="sm" />
                      </div>
                      <PriorityBadge priority={task.priority} />
                      <StatusPill status={task.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Section 2: READY TO START (Unblocked) */}
          <Card padding="none" className="bg-white border border-[#C6E4D3] shadow-subtle overflow-hidden">
            <div className="px-5 py-3.5 bg-fx-green-50/50 border-b border-[#C6E4D3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-fx-green-700" />
                <h2 className="text-sm font-bold text-fx-green-900 tracking-tight">
                  Ready to Start
                </h2>
              </div>
              <span className="text-xs font-semibold text-fx-green-900 bg-white px-2 py-0.5 rounded border border-[#C6E4D3]">
                {readyTasks.length} unblocked
              </span>
            </div>

            {readyTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-fx-text-muted">
                No new unblocked tasks ready to start right now.
              </div>
            ) : (
              <div className="divide-y divide-fx-border">
                {readyTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-fx-green-50/20 cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-fx-text-muted text-[11px] shrink-0">
                          {task.humanId}
                        </span>
                        <span className="font-semibold text-fx-text-primary text-sm truncate">
                          {task.title}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-fx-green-100 text-fx-green-900">
                          Unlocked
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fx-text-muted">
                        <span className="text-fx-text-secondary font-medium">{task.project?.name}</span>
                        {task.estimatedHours && <span>Est: {task.estimatedHours}h</span>}
                        {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <Button
                        size="xs"
                        variant="primary"
                        className="gap-1.5 text-xs font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          startTaskMutation.mutate(task.id);
                        }}
                        disabled={startTaskMutation.isPending}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Start Work
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Section 3: WAITING ON OTHERS (Dependency Locked) */}
          <Card padding="none" className="bg-white border border-fx-border shadow-subtle overflow-hidden">
            <div className="px-5 py-3.5 bg-fx-bg-subtle border-b border-fx-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-fx-text-muted" />
                <h2 className="text-sm font-bold text-fx-text-primary tracking-tight">
                  Waiting on Prerequisites ({waitingTasks.length})
                </h2>
              </div>
              <span className="text-[11px] text-fx-text-muted">
                Unlocks automatically when prerequisites finish
              </span>
            </div>

            {waitingTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-fx-text-muted">
                You have no tasks currently waiting on predecessor dependencies.
              </div>
            ) : (
              <div className="divide-y divide-fx-border">
                {waitingTasks.map((task: any) => {
                  const unfinishedDeps = (task.blockedBy || []).filter(
                    (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                  );

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-4 hover:bg-fx-bg-subtle cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs opacity-90"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-fx-text-muted text-[11px] shrink-0">
                            {task.humanId}
                          </span>
                          <span className="font-medium text-fx-text-secondary text-[13px] truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-fx-text-muted">
                          <span>{task.project?.name}</span>
                          {unfinishedDeps.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-fx-text-secondary bg-gray-100 px-2 py-0.5 rounded border border-gray-200/60 font-medium">
                              <Lock className="w-3 h-3 text-fx-text-muted shrink-0" />
                              Waiting for: {unfinishedDeps.map((d: any) => `${d.predecessorTask.humanId} (${d.predecessorTask.title})`).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <PriorityBadge priority={task.priority} />
                        <StatusPill status={TaskStatus.WAITING} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Section 4: MANUALLY BLOCKED ITEMS */}
          {blockedTasks.length > 0 && (
            <Card padding="none" className="bg-white border border-red-200/80 shadow-subtle overflow-hidden">
              <div className="px-5 py-3.5 bg-red-50/40 border-b border-red-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-fx-semantic-danger" />
                  <h2 className="text-sm font-bold text-fx-semantic-danger tracking-tight">
                    Manually Blocked Work ({blockedTasks.length})
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-fx-border">
                {blockedTasks.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-4 hover:bg-red-50/20 cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-fx-semantic-danger text-[11px] shrink-0">
                          {task.humanId}
                        </span>
                        <span className="font-semibold text-fx-text-primary text-[13px] truncate">
                          {task.title}
                        </span>
                      </div>
                      {task.manualBlockReason && (
                        <p className="text-[11px] text-fx-semantic-danger font-medium">
                          Block Reason: {task.manualBlockReason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <StatusPill status={TaskStatus.BLOCKED} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Sidebar Deadlines & Reviews Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upcoming Deadlines */}
          <Card padding="none" className="bg-white border border-fx-border shadow-subtle overflow-hidden">
            <div className="px-4 py-3.5 bg-fx-bg-subtle border-b border-fx-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fx-text-primary">
                Immediate Deadlines
              </h3>
              <Calendar className="w-4 h-4 text-fx-text-muted" />
            </div>

            {dueSoonTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-fx-text-muted">
                No immediate deadlines in the next 3 days.
              </div>
            ) : (
              <div className="divide-y divide-fx-border">
                {overdueTasks.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="p-3.5 hover:bg-red-50/30 cursor-pointer text-xs space-y-1 bg-red-50/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-fx-semantic-danger text-[11px]">
                        {t.humanId}
                      </span>
                      <span className="text-[10px] font-bold text-fx-semantic-danger uppercase bg-red-100 px-1.5 py-0.5 rounded">
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
                      <span className="text-[11px] text-fx-semantic-warning font-semibold">
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
            <Card padding="none" className="bg-white border border-amber-200/80 shadow-subtle overflow-hidden">
              <div className="px-4 py-3.5 bg-amber-50/40 border-b border-amber-200/80 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A5200]">
                  Submitted for Review
                </h3>
                <Hourglass className="w-4 h-4 text-fx-semantic-warning" />
              </div>
              <div className="divide-y divide-fx-border">
                {inReviewTasks.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="p-3.5 hover:bg-amber-50/20 cursor-pointer text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-fx-text-muted text-[11px]">
                        {t.humanId}
                      </span>
                      <StatusPill status={TaskStatus.IN_REVIEW} size="xs" />
                    </div>
                    <p className="font-semibold text-fx-text-primary line-clamp-1">{t.title}</p>
                    <p className="text-[11px] text-fx-text-muted">Awaiting Manager Signoff</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recently Completed */}
          {doneTasks.length > 0 && (
            <Card padding="none" className="bg-white border border-fx-border shadow-subtle overflow-hidden">
              <div className="px-4 py-3.5 bg-fx-bg-subtle border-b border-fx-border flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-fx-text-primary">
                  Recently Completed
                </h3>
                <CheckCircle2 className="w-4 h-4 text-fx-green-700" />
              </div>
              <div className="divide-y divide-fx-border">
                {doneTasks.slice(0, 5).map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="p-3 hover:bg-fx-bg-subtle cursor-pointer text-xs flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-fx-text-secondary truncate line-through decoration-fx-text-muted/60">
                        {t.title}
                      </p>
                      <span className="text-[10px] font-mono text-fx-text-muted">{t.humanId}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-fx-green-900 bg-fx-green-50 px-1.5 py-0.5 rounded shrink-0">
                      Done
                    </span>
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
