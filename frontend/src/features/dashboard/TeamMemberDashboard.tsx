'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Play,
  Calendar,
  Lock,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Inbox,
  CheckCircle2,
  ListOrdered,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TaskStatus, TaskPriority } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { CalendarWidget } from '@/features/calendar/CalendarWidget';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';


export function TeamMemberDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch all tasks assigned to the current employee
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', 'my-work'],
    queryFn: () => api.get('/tasks/my-work?tab=ALL'),
  });

  const tasks = (tasksData as any[]) || [];

  // Start Work Mutation
  const startWorkMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.patch(`/tasks/${taskId}`, { status: TaskStatus.IN_PROGRESS }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const inProgressTasks = tasks.filter(
    (t) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW,
  );
  const readyTasks = tasks.filter((t) => t.status === TaskStatus.READY);
  const waitingTasks = tasks.filter((t) => t.status === TaskStatus.WAITING);
  const blockedTasks = tasks.filter((t) => t.status === TaskStatus.BLOCKED);
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE);

  const now = new Date();
  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);


  const dueSoonCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === TaskStatus.DONE) return false;
    const diff = new Date(t.dueDate).getTime() - now.getTime();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  }).length;

  const firstName = user?.firstName || 'there';

  return (
    <div className="space-y-6">
      {/* SlideOver Task Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* Greeting Header & Status Summary */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div>
            <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-fx-text-primary">
              Good morning, {firstName}
            </h1>
            <p className="text-sm text-fx-text-secondary mt-0.5">
              Here’s what needs your attention today.
            </p>
          </div>
          <span className="text-xs text-fx-text-muted font-medium">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Inline Segmented Summary Strip (No oversized cards) */}
        <div className="bg-white border border-fx-border rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-fx-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="text-fx-text-muted">Assigned:</span>
            <span className="font-semibold text-fx-text-primary font-mono">{tasks.length}</span>
          </div>
          <div className="h-3 w-px bg-fx-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-fx-text-muted">In Progress:</span>
            <span className="font-semibold text-fx-text-primary font-mono">{inProgressTasks.length}</span>
          </div>
          <div className="h-3 w-px bg-fx-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fx-green" />
            <span className="text-fx-text-muted">Ready to Start:</span>
            <span className="font-semibold text-fx-green font-mono">{readyTasks.length}</span>
          </div>
          <div className="h-3 w-px bg-fx-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-fx-text-muted">Waiting on Others:</span>
            <span className="font-semibold text-amber-700 font-mono">{waitingTasks.length}</span>
          </div>
          <div className="h-3 w-px bg-fx-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-fx-text-muted">Blocked:</span>
            <span className="font-semibold text-red-700 font-mono">{blockedTasks.length}</span>
          </div>

          {dueSoonCount > 0 && (
            <>
              <div className="h-3 w-px bg-fx-border hidden sm:block" />
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{dueSoonCount} Due Soon</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Execution Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Primary Column: Execution Queue (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. CURRENT WORK (In Progress Deliverables) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Current Work</span>
                <span className="text-[11px] font-mono text-fx-text-muted font-normal">
                  ({inProgressTasks.length})
                </span>
              </h2>
            </div>

            {isLoading ? (
              <div className="bg-white border border-fx-border rounded-lg p-6 text-center text-xs text-fx-text-muted">
                Loading assigned tasks...
              </div>
            ) : inProgressTasks.length === 0 ? (
              <div className="bg-white border border-fx-border rounded-lg p-5 text-center text-xs text-fx-text-muted">
                No tasks currently in progress. Start work from the ready queue below.
              </div>
            ) : (
              <div className="bg-white border border-fx-border rounded-lg divide-y divide-fx-border/70 overflow-hidden">
                {inProgressTasks.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-3.5 sm:p-4 hover:bg-fx-bg-hover cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-fx-text-muted text-[11px] shrink-0">
                          {task.humanId}
                        </span>
                        <span className="font-semibold text-[13px] text-fx-text-primary truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-fx-text-secondary">
                        <span className="font-medium text-fx-text-primary">{task.project?.name}</span>
                        {task.milestone && <span>• {task.milestone.name}</span>}
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-fx-text-muted">
                            <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                      <div className="w-24 hidden sm:block">
                        <Progress value={task.progress} showLabel={true} size="xs" />
                      </div>
                      <PriorityBadge priority={task.priority} />
                      <StatusPill status={task.status} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. READY TO START (Actionable Prerequisites Cleared) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fx-green" />
                <span>Ready to Start</span>
                <span className="text-[11px] font-mono text-fx-text-muted font-normal">
                  ({readyTasks.length})
                </span>
              </h2>
            </div>

            {readyTasks.length === 0 ? (
              <div className="bg-white border border-fx-border rounded-lg p-5 text-center text-xs text-fx-text-muted">
                No tasks currently waiting to be started.
              </div>
            ) : (
              <div className="bg-white border border-fx-border rounded-lg divide-y divide-fx-border/70 overflow-hidden">
                {readyTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-3.5 sm:p-4 hover:bg-fx-bg-hover fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div
                      onClick={() => setSelectedTaskId(task.id)}
                      className="space-y-1 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-fx-text-muted text-[11px] shrink-0">
                          {task.humanId}
                        </span>
                        <span className="font-semibold text-[13px] text-fx-text-primary truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-fx-text-secondary">
                        <span className="font-medium text-fx-text-primary">{task.project?.name}</span>
                        {task.milestone && <span>• {task.milestone.name}</span>}
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-fx-text-muted">
                            <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end">
                      <PriorityBadge priority={task.priority} />
                      <Button
                        size="xs"
                        variant="primary"
                        loading={startWorkMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          startWorkMutation.mutate(task.id);
                        }}
                        leftIcon={<Play className="w-3 h-3 fill-white" />}
                      >
                        Start Work
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. WAITING ON PREREQUISITES */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Waiting on Prerequisites</span>
                <span className="text-[11px] font-mono text-fx-text-muted font-normal">
                  ({waitingTasks.length})
                </span>
              </h2>
            </div>

            {waitingTasks.length === 0 ? (
              <div className="bg-white border border-fx-border rounded-lg p-4 text-center text-xs text-fx-text-muted">
                No tasks are waiting on incomplete dependencies.
              </div>
            ) : (
              <div className="bg-white border border-fx-border rounded-lg divide-y divide-fx-border/70 overflow-hidden">
                {waitingTasks.map((task: any) => {
                  const unfinishedDeps = (task.blockedBy || []).filter(
                    (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                  );

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-3.5 sm:p-4 hover:bg-fx-bg-hover cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-fx-text-muted text-[11px] shrink-0">
                            {task.humanId}
                          </span>
                          <span className="font-semibold text-[13px] text-fx-text-primary truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fx-text-secondary">
                          <span className="font-medium text-fx-text-primary">{task.project?.name}</span>
                          {unfinishedDeps.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60 font-medium">
                              <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                              Waiting for: {unfinishedDeps.map((d: any) => `${d.predecessorTask?.humanId} · ${d.predecessorTask?.title}`).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <PriorityBadge priority={task.priority} />
                        <StatusPill status={task.status} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. MANUALLY BLOCKED (If any) */}
          {blockedTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-semantic-danger flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Manually Blocked</span>
                  <span className="text-[11px] font-mono text-fx-text-muted font-normal">
                    ({blockedTasks.length})
                  </span>
                </h2>
              </div>

              <div className="bg-white border border-red-200/80 rounded-lg divide-y divide-red-100 overflow-hidden">
                {blockedTasks.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-3.5 sm:p-4 hover:bg-red-50/40 cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-red-600 text-[11px] shrink-0">
                          {task.humanId}
                        </span>
                        <span className="font-semibold text-[13px] text-fx-text-primary truncate">
                          {task.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-fx-semantic-danger">
                        {task.manualBlockReason ? `Blocker: ${task.manualBlockReason}` : 'Marked as blocked.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <StatusPill status={task.status} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Calendar & Deadlines (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Dashboard Calendar Widget */}
          <CalendarWidget
            tasks={tasks}
            onSelectTask={(id) => setSelectedTaskId(id)}
          />

          {/* Upcoming Deadlines */}
          <div className="bg-white border border-fx-border rounded-xl p-4 space-y-3 shadow-none">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-fx-text-muted" />
              <span>Upcoming Deadlines</span>
            </h3>


            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-fx-text-muted">No upcoming due dates scheduled.</p>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {upcomingDeadlines.map((task: any) => {
                  const isOverdue = new Date(task.dueDate).getTime() < now.getTime();
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-2.5 first:pt-0 last:pb-0 cursor-pointer hover:text-fx-green fx-transition"
                    >
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-fx-text-primary truncate">{task.title}</span>
                        <span
                          className={cn(
                            'text-[11px] font-mono shrink-0',
                            isOverdue ? 'text-fx-semantic-danger font-semibold' : 'text-fx-text-muted',
                          )}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                      <p className="text-[11px] text-fx-text-muted mt-0.5 truncate">{task.project?.name}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recently Completed Deliverables */}
          <div className="bg-white border border-fx-border rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-fx-green" />
              <span>Recently Completed</span>
            </h3>

            {completedTasks.length === 0 ? (
              <p className="text-xs text-fx-text-muted">No completed deliverables yet this cycle.</p>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {completedTasks.slice(0, 4).map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="py-2.5 first:pt-0 last:pb-0 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2 text-fx-text-muted">
                      <span className="font-mono text-[11px] shrink-0">{task.humanId}</span>
                      <span className="line-through truncate text-fx-text-secondary">{task.title}</span>
                    </div>
                    <p className="text-[11px] text-fx-text-muted mt-0.5 truncate">{task.project?.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
