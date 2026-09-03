'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Calendar,
  Lock,
  AlertCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  Check,
  Layers,
  ChevronRight,
  Flame,
  FileCheck,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { TaskStatus } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { CalendarWidget } from '@/features/calendar/CalendarWidget';
import { formatDate, formatTimeAgo, formatProjectKey, formatTaskId, cn } from '@/lib/utils';
import Link from 'next/link';

export function TeamMemberDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch all tasks assigned to the current employee
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'my-work'],
    queryFn: () => api.get('/tasks/my-work?tab=ALL'),
  });

  // Fetch active projects the user belongs to
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const tasks = asArray<any>(tasksData);
  const projects = asArray<any>(projectsData);

  // Start Work Mutation
  const startWorkMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.patch(`/tasks/${taskId}`, { status: TaskStatus.IN_PROGRESS }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const now = new Date();

  // Distinct task categories
  const readyTasks = tasks.filter((t) => t.status === TaskStatus.READY);
  const inProgressTasks = tasks.filter(
    (t) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW,
  );
  const waitingTasks = tasks.filter((t) => t.status === TaskStatus.WAITING);
  const blockedTasks = tasks.filter((t) => t.status === TaskStatus.BLOCKED);
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE);
  const activeAssignedCount = readyTasks.length + inProgressTasks.length + waitingTasks.length + blockedTasks.length;

  // Ordering priority for NEXT TO WORK ON: Overdue -> Urgent -> High -> Due Soon -> Earliest Due Date
  const priorityWeight: Record<string, number> = {
    URGENT: 100,
    HIGH: 80,
    MEDIUM: 50,
    LOW: 20,
    NONE: 0,
  };

  const sortedReadyTasks = [...readyTasks].sort((a, b) => {
    const aOverdue = a.dueDate && new Date(a.dueDate) < now;
    const bOverdue = b.dueDate && new Date(b.dueDate) < now;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (pDiff !== 0) return pDiff;

    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const nextTask = sortedReadyTasks[0] || null;
  const remainingReadyTasks = sortedReadyTasks.slice(1);

  // Today / upcoming deadlines
  const todayUpcomingDeadlines = tasks
    .filter((t) => t.dueDate && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Recent updates across user's tasks
  const recentDailyUpdates = tasks
    .flatMap((t) => (t.dailyUpdates || []).map((u: any) => ({ ...u, task: t })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const firstName = user?.firstName || 'there';

  // Dynamic Workload Context Sentence
  const getHeroSubtitle = () => {
    if (tasksLoading || projectsLoading) {
      return 'Loading your active deliverables...';
    }
    if (tasks.length === 0) {
      if (projects.length > 0) {
        return `You're part of ${projects.length} active project${projects.length === 1 ? '' : 's'}, but no tasks are assigned to you yet.`;
      }
      return "You're all caught up. No tasks are currently assigned to you.";
    }

    const readyText = readyTasks.length === 1 ? '1 ready to start' : `${readyTasks.length} ready to start`;
    const inProgressText = inProgressTasks.length === 1 ? '1 in progress' : `${inProgressTasks.length} in progress`;
    const waitingText = waitingTasks.length === 1 ? '1 waiting on prerequisites' : `${waitingTasks.length} waiting on other work`;

    if (readyTasks.length > 0) {
      return `You have ${activeAssignedCount} assigned task${activeAssignedCount === 1 ? '' : 's'} · ${readyText}.`;
    }
    if (inProgressTasks.length > 0) {
      return `You have ${inProgressTasks.length} deliverable${inProgressTasks.length === 1 ? '' : 's'} in progress.${waitingTasks.length > 0 ? ` (${waitingText})` : ''}`;
    }
    if (waitingTasks.length > 0) {
      return `You have ${waitingTasks.length} deliverable${waitingTasks.length === 1 ? '' : 's'} waiting on prerequisite deliverables.`;
    }
    if (completedTasks.length > 0 && activeAssignedCount === 0) {
      return `All assigned work is complete (${completedTasks.length} completed). No active tasks pending.`;
    }
    return `You have ${activeAssignedCount} active deliverable${activeAssignedCount === 1 ? '' : 's'}.`;
  };

  return (
    <div className="space-y-6">
      {/* SlideOver Task Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* 1. Header & Secondary Clickable Badges */}
      <div className="border-b border-fx-border pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-fx-text-primary">
              Good morning, {firstName}
            </h1>
            <p className="text-sm text-fx-text-secondary mt-0.5">
              {getHeroSubtitle()}
            </p>
          </div>
          <span className="text-xs text-fx-text-muted font-medium shrink-0">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Secondary Clickable Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href="/my-work?tab=ALL"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-fx-border hover:border-fx-border-strong rounded-lg text-xs text-fx-text-secondary hover:text-fx-text-primary fx-transition"
          >
            <span className="text-fx-text-muted">Assigned:</span>
            <span className="font-semibold font-mono text-fx-text-primary">{tasks.length}</span>
          </Link>

          <Link
            href="/my-work?tab=READY"
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs fx-transition border',
              readyTasks.length > 0
                ? 'bg-fx-green-soft border-fx-green/30 text-fx-green-dark hover:bg-fx-green-soft/80 font-medium'
                : 'bg-white border-fx-border text-fx-text-muted hover:border-fx-border-strong',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-fx-green shrink-0" />
            <span>Ready to Start:</span>
            <span className="font-semibold font-mono">{readyTasks.length}</span>
          </Link>

          <Link
            href="/my-work?tab=IN_PROGRESS"
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs fx-transition border',
              inProgressTasks.length > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 font-medium'
                : 'bg-white border-fx-border text-fx-text-muted hover:border-fx-border-strong',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>In Progress:</span>
            <span className="font-semibold font-mono">{inProgressTasks.length}</span>
          </Link>

          <Link
            href="/my-work?tab=WAITING"
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs fx-transition border',
              waitingTasks.length > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 font-medium'
                : 'bg-white border-fx-border text-fx-text-muted hover:border-fx-border-strong',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Waiting:</span>
            <span className="font-semibold font-mono">{waitingTasks.length}</span>
          </Link>

          {blockedTasks.length > 0 && (
            <Link
              href="/my-work?tab=BLOCKED"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 hover:bg-red-100 font-medium fx-transition"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>Blocked:</span>
              <span className="font-semibold font-mono">{blockedTasks.length}</span>
            </Link>
          )}

          {completedTasks.length > 0 && (
            <Link
              href="/my-work?tab=COMPLETED"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-fx-border hover:border-fx-border-strong rounded-lg text-xs text-fx-text-secondary hover:text-fx-text-primary fx-transition ml-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-fx-green" />
              <span>{completedTasks.length} Completed</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Primary Layout: Asymmetrical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* HERO REGION: NEXT TO WORK ON (8 cols) */}
        <section className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-fx-green" />
              <span>Next to Work On</span>
            </h2>
            {readyTasks.length > 1 && (
              <span className="text-xs text-fx-text-muted">
                1 of {readyTasks.length} ready deliverables
              </span>
            )}
          </div>

          {tasksLoading ? (
            <div className="bg-white border border-fx-border rounded-xl p-6 text-center text-xs text-fx-text-muted">
              Analyzing task prerequisites...
            </div>
          ) : nextTask ? (
            /* Hero Ready Work Tile */
            <div className="bg-white border border-fx-green/50 rounded-xl p-5 sm:p-6 space-y-4 hover:border-fx-green fx-transition">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div
                  onClick={() => setSelectedTaskId(nextTask.id)}
                  className="space-y-2 flex-1 cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-fx-bg-secondary rounded text-fx-text-secondary border border-fx-border">
                      {formatTaskId(nextTask.humanId, nextTask.project?.key, nextTask.project?.name)}
                    </span>
                    <span className="text-xs font-semibold text-fx-text-muted">
                      {nextTask.project?.name}
                    </span>
                    {nextTask.milestone && (
                      <span className="text-xs text-fx-text-muted">
                        • {nextTask.milestone.name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-semibold text-fx-text-primary hover:text-fx-green leading-snug">
                    {nextTask.title}
                  </h3>

                  {nextTask.description && (
                    <p className="text-xs text-fx-text-secondary line-clamp-2 max-w-xl">
                      {nextTask.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-fx-text-secondary">
                    <PriorityBadge priority={nextTask.priority} />
                    <StatusPill status={nextTask.status} size="xs" />
                    {nextTask.dueDate && (
                      <span
                        className={cn(
                          'flex items-center gap-1 font-medium text-xs',
                          new Date(nextTask.dueDate) < now
                            ? 'text-red-600 font-semibold'
                            : 'text-fx-text-muted',
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(nextTask.dueDate) < now ? 'Overdue: ' : 'Due '}
                        {formatDate(nextTask.dueDate)}
                      </span>
                    )}
                    {nextTask.estimatedHours && (
                      <span className="text-xs text-fx-text-muted font-mono">
                        {nextTask.estimatedHours}h estimated
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-fx-green font-medium pt-1">
                    ✓ All prerequisite work is complete. You can start this deliverable now.
                  </p>
                </div>

                <div className="shrink-0 flex sm:flex-col justify-end gap-2 pt-2 sm:pt-0">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={startWorkMutation.isPending}
                    onClick={() => startWorkMutation.mutate(nextTask.id)}
                    leftIcon={<Play className="w-3.5 h-3.5 fill-white" />}
                    className="w-full sm:w-auto"
                  >
                    Start Work
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => setSelectedTaskId(nextTask.id)}
                    className="w-full sm:w-auto"
                  >
                    Details
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Minimal-Height Positive State */
            <div className="bg-white border border-fx-border rounded-xl px-4 py-3.5 flex items-center gap-3">
              <Check className="w-4 h-4 text-fx-green shrink-0" />
              <p className="text-xs text-fx-text-secondary">
                <span className="font-semibold text-fx-text-primary">
                  {inProgressTasks.length > 0 ? 'All new work started.' : 'No tasks ready to start.'}
                </span>{' '}
                {inProgressTasks.length > 0
                  ? `You have ${inProgressTasks.length} active deliverable${inProgressTasks.length === 1 ? '' : 's'} in progress below.`
                  : waitingTasks.length > 0
                    ? `You have ${waitingTasks.length} task${waitingTasks.length === 1 ? '' : 's'} waiting on prerequisite deliverables.`
                    : 'New task assignments will appear here.'}
              </p>
            </div>
          )}

          {/* Other Ready Tasks if > 1 */}
          {remainingReadyTasks.length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-xs font-semibold text-fx-text-muted uppercase tracking-wider px-1">
                Also Ready to Start ({remainingReadyTasks.length}):
              </p>
              <div className="bg-white border border-fx-border rounded-xl divide-y divide-fx-border overflow-hidden">
                {remainingReadyTasks.map((task: any) => {
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 hover:bg-fx-bg-hover fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div
                        onClick={() => setSelectedTaskId(task.id)}
                        className="space-y-0.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-fx-text-muted text-[11px] shrink-0">
                            {cleanId}
                          </span>
                          <span className="font-semibold text-fx-text-primary truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-fx-text-secondary">
                          <span>{task.project?.name}</span>
                          {task.dueDate && (
                            <span className="text-fx-text-muted">Due {formatDate(task.dueDate)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={task.priority} />
                        <Button
                          size="xs"
                          variant="secondary"
                          loading={startWorkMutation.isPending}
                          onClick={() => startWorkMutation.mutate(task.id)}
                          leftIcon={<Play className="w-3 h-3 text-fx-green fill-fx-green" />}
                        >
                          Start Work
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* UTILITY REGION: TODAY & CALENDAR (4 cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Today & Upcoming Deadlines */}
          <div className="bg-white border border-fx-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>Today & Upcoming</span>
              </h2>
              <Link
                href="/my-work?tab=ALL"
                className="text-[11px] text-fx-green font-medium hover:underline"
              >
                <span>My Work</span>
              </Link>
            </div>

            {todayUpcomingDeadlines.length === 0 ? (
              <p className="text-xs text-fx-text-muted py-1">No deadlines due in the near term.</p>
            ) : (
              <div className="divide-y divide-fx-border">
                {todayUpcomingDeadlines.map((task: any) => {
                  const isOverdue = new Date(task.dueDate) < now;
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-2.5 first:pt-1 last:pb-0 cursor-pointer hover:bg-fx-bg-hover rounded px-1 -mx-1 fx-transition text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-fx-text-primary truncate">
                          {task.title}
                        </span>
                        <span
                          className={cn(
                            'font-mono text-[11px] shrink-0',
                            isOverdue ? 'text-red-600 font-semibold' : 'text-fx-text-secondary',
                          )}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-fx-text-muted">
                        <span className="font-mono">{cleanId} · {task.project?.name}</span>
                        <StatusPill status={task.status} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mini Calendar Widget */}
          <div className="bg-white border border-fx-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>Delivery Calendar</span>
              </h2>
            </div>

            <CalendarWidget
              tasks={tasks}
              projects={projects}
              onSelectTask={(id) => setSelectedTaskId(id)}
            />
          </div>

        </div>

      </div>

      {/* 3. Mid Region: Current Work (6 cols) & Waiting on Other Work (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* CURRENT WORK (6 cols) */}
        <section className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Current Work</span>
              <span className="text-xs font-mono text-fx-text-muted font-normal">
                ({inProgressTasks.length})
              </span>
            </h2>
          </div>

          {inProgressTasks.length === 0 ? (
            <div className="bg-white border border-fx-border rounded-xl p-5 text-center text-xs text-fx-text-muted">
              No deliverables currently in progress. Start work on ready tasks above.
            </div>
          ) : (
            <div className="bg-white border border-fx-border rounded-xl divide-y divide-fx-border overflow-hidden">
              {inProgressTasks.map((task: any) => {
                const isInReview = task.status === TaskStatus.IN_REVIEW;
                const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);

                return (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-fx-bg-hover fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div
                      onClick={() => setSelectedTaskId(task.id)}
                      className="space-y-1 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-fx-text-muted text-[11px] shrink-0">
                          {cleanId}
                        </span>
                        <span className="font-semibold text-sm text-fx-text-primary truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-fx-text-secondary">
                        <span>{task.project?.name}</span>
                        {task.milestone && <span>• {task.milestone.name}</span>}
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-fx-text-muted">
                            <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                          </span>
                        )}
                        {isInReview && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                            Awaiting admin review
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                      <div className="w-20 hidden sm:block">
                        <Progress value={task.progress} showLabel={true} size="xs" />
                      </div>
                      <PriorityBadge priority={task.priority} />
                      <StatusPill status={task.status} size="xs" />
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        {isInReview ? 'View Submission' : 'Update Progress'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* WAITING ON OTHER WORK (6 cols) */}
        <section className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Waiting on Other Work</span>
              <span className="text-xs font-mono text-fx-text-muted font-normal">
                ({waitingTasks.length})
              </span>
            </h2>
          </div>

          {waitingTasks.length === 0 ? (
            <div className="bg-white border border-fx-border rounded-xl p-5 text-center text-xs text-fx-text-muted">
              No tasks are currently waiting on prerequisite work.
            </div>
          ) : (
            <div className="bg-white border border-fx-border rounded-xl divide-y divide-fx-border overflow-hidden">
              {waitingTasks.map((task: any) => {
                const blockers = task.blockedBy || [];
                const unfinishedBlockers = blockers.filter(
                  (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                );
                const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);

                return (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-fx-bg-hover fx-transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                  >
                    <div
                      onClick={() => setSelectedTaskId(task.id)}
                      className="space-y-1.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-fx-text-muted text-[11px] shrink-0">
                          {cleanId}
                        </span>
                        <span className="font-semibold text-sm text-fx-text-primary truncate">
                          {task.title}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-fx-text-secondary">
                        <span>{task.project?.name}</span>
                        {task.dueDate && (
                          <span className="text-fx-text-muted">Due {formatDate(task.dueDate)}</span>
                        )}
                      </div>

                      {/* Natural Language Prerequisite Explainer */}
                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-semibold text-[10px] text-amber-800 uppercase tracking-wider block">
                            Waiting for prerequisite:
                          </span>
                          {unfinishedBlockers.length > 0 ? (
                            unfinishedBlockers.map((b: any) => (
                              <div key={b.id || b.predecessorTaskId} className="text-xs text-amber-950 font-medium">
                                <span className="font-mono">{formatTaskId(b.predecessorTask?.humanId)}</span> · {b.predecessorTask?.title}
                                {b.predecessorTask?.assignee && (
                                  <span className="text-amber-800 font-normal"> (assigned to {b.predecessorTask.assignee.firstName} {b.predecessorTask.assignee.lastName})</span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-amber-950">Prerequisites resolving...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 justify-between pt-1 sm:pt-0">
                      <StatusPill status={task.status} size="xs" />
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        View Dependency
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* 4. Bottom Region: Recent Updates & Daily Logs (12 cols) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-fx-text-muted" />
            <span>Recent Daily Updates & Activity</span>
          </h2>
        </div>

        {recentDailyUpdates.length === 0 ? (
          <div className="bg-white border border-fx-border rounded-xl p-5 text-center text-xs text-fx-text-muted">
            No daily updates logged yet. As you log progress notes, daily deliverables will be summarized here.
          </div>
        ) : (
          <div className="bg-white border border-fx-border rounded-xl divide-y divide-fx-border overflow-hidden">
            {recentDailyUpdates.map((update: any) => {
              const task = update.task || {};
              const cleanId = formatTaskId(task.humanId);

              return (
                <div
                  key={update.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="p-3.5 sm:p-4 hover:bg-fx-bg-hover cursor-pointer fx-transition flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-fx-text-muted text-[11px]">{cleanId}</span>
                      <span className="font-semibold text-fx-text-primary truncate">{task.title}</span>
                      <span className="text-fx-green font-semibold font-mono">{update.progress}%</span>
                    </div>

                    {update.completedToday && (
                      <p className="text-fx-text-secondary text-xs line-clamp-1">
                        <span className="font-medium text-fx-text-primary">Completed:</span> {update.completedToday}
                      </p>
                    )}

                    {update.blockerNote && (
                      <p className="text-red-700 text-xs line-clamp-1">
                        <span className="font-medium">Blocker:</span> {update.blockerNote}
                      </p>
                    )}
                  </div>

                  <span className="font-mono text-[11px] text-fx-text-muted shrink-0">
                    {formatTimeAgo(update.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
