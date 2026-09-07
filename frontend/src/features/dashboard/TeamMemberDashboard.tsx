'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Calendar,
  Lock,
  Clock,
  CheckCircle2,
  Check,
  Activity,
  ArrowRight,
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
import { formatDate, formatTimeAgo, formatTaskId, cn } from '@/lib/utils';
import { canStartTask } from '@/lib/permissions';
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
    <div className="space-y-8">
      {/* SlideOver Task Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* 1. Header & Minimal Status Metrics */}
      <div className="border-b border-[#E3E7EC] pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-[#181B20]">
              Good morning, {firstName}
            </h1>
            <p className="text-sm text-[#626A73] mt-1">
              {getHeroSubtitle()}
            </p>
          </div>
          <span className="text-xs text-[#929AA3] font-medium shrink-0">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Minimal Workload Counters (Unboxed inline pill strip) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href="/my-work?tab=ALL"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F7F8FA] hover:bg-[#F2F4F7] border border-[#E3E7EC] rounded-[6px] text-xs text-[#626A73] hover:text-[#181B20] fx-transition"
          >
            <span className="text-[#929AA3]">Assigned:</span>
            <span className="font-semibold font-mono text-[#181B20]">{tasks.length}</span>
          </Link>

          <Link
            href="/my-work?tab=READY"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs fx-transition border',
              readyTasks.length > 0
                ? 'bg-[#EDF8F2] border-[#EDF8F2] text-[#237A57] hover:bg-[#E3F4EB] font-medium'
                : 'bg-[#F7F8FA] border-[#E3E7EC] text-[#929AA3] hover:text-[#181B20]',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#237A57] shrink-0" />
            <span>Ready:</span>
            <span className="font-semibold font-mono">{readyTasks.length}</span>
          </Link>

          <Link
            href="/my-work?tab=IN_PROGRESS"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs fx-transition border',
              inProgressTasks.length > 0
                ? 'bg-[#EEF4FF] border-[#EEF4FF] text-[#2563EB] hover:bg-[#E0ECFF] font-medium'
                : 'bg-[#F7F8FA] border-[#E3E7EC] text-[#929AA3] hover:text-[#181B20]',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
            <span>In Progress:</span>
            <span className="font-semibold font-mono">{inProgressTasks.length}</span>
          </Link>

          <Link
            href="/my-work?tab=WAITING"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs fx-transition border',
              waitingTasks.length > 0
                ? 'bg-[#FFF6E5] border-[#FFF6E5] text-[#A86B12] hover:bg-[#FEEFD4] font-medium'
                : 'bg-[#F7F8FA] border-[#E3E7EC] text-[#929AA3] hover:text-[#181B20]',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#A86B12] shrink-0" />
            <span>Waiting:</span>
            <span className="font-semibold font-mono">{waitingTasks.length}</span>
          </Link>

          {blockedTasks.length > 0 && (
            <Link
              href="/my-work?tab=BLOCKED"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FDEEEE] border border-[#FDEEEE] rounded-[6px] text-xs text-[#C24141] hover:bg-[#FADBD8] font-medium fx-transition"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C24141] shrink-0" />
              <span>Blocked:</span>
              <span className="font-semibold font-mono">{blockedTasks.length}</span>
            </Link>
          )}

          {completedTasks.length > 0 && (
            <Link
              href="/my-work?tab=COMPLETED"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F7F8FA] border border-[#E3E7EC] rounded-[6px] text-xs text-[#626A73] hover:text-[#181B20] fx-transition ml-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#237A57]" />
              <span>{completedTasks.length} Completed</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Independent Two-Column Layout (Desktop: minmax(0,1fr) 360px, Mobile/Tablet: 1 col) */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">

        {/* MAIN COLUMN: Open workspace flow */}
        <div className="flex flex-col gap-8 min-w-0">

          {/* SECTION 1: NEXT TO WORK ON */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
              <h2 className="text-[14px] font-semibold text-[#181B20] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                <span>Next to Work On</span>
              </h2>
              {readyTasks.length > 1 && (
                <span className="text-xs text-[#929AA3]">
                  1 of {readyTasks.length} ready deliverables
                </span>
              )}
            </div>

            {tasksLoading ? (
              <div className="py-6 text-center text-xs text-[#929AA3]">
                Analyzing task prerequisites...
              </div>
            ) : nextTask ? (
              /* Hero Ready Work Tile - Open, prominent on canvas */
              <div className="rounded-[16px] bg-white border border-[#E3E7EC] p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#2563EB]/50 fx-transition space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div
                    onClick={() => setSelectedTaskId(nextTask.id)}
                    className="space-y-2 flex-1 cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-[#F7F8FA] rounded-[6px] text-[#626A73] border border-[#E3E7EC]">
                        {formatTaskId(nextTask.humanId, nextTask.project?.key, nextTask.project?.name)}
                      </span>
                      <span className="text-xs font-medium text-[#626A73]">
                        {nextTask.project?.name}
                      </span>
                      {nextTask.milestone && (
                        <span className="text-xs text-[#7557B5] font-medium">
                          • {nextTask.milestone.name}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-[22px] font-semibold text-[#181B20] hover:text-[#2563EB] leading-snug tracking-tight fx-transition">
                      {nextTask.title}
                    </h3>

                    {nextTask.description && (
                      <p className="text-[13px] text-[#626A73] line-clamp-2 max-w-xl leading-relaxed">
                        {nextTask.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#626A73]">
                      <PriorityBadge priority={nextTask.priority} />
                      <StatusPill status={nextTask.status} size="xs" />
                      {nextTask.dueDate && (
                        <span
                          className={cn(
                            'flex items-center gap-1 font-medium text-xs',
                            new Date(nextTask.dueDate) < now
                              ? 'text-[#C24141] font-semibold'
                              : 'text-[#929AA3]',
                          )}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(nextTask.dueDate) < now ? 'Overdue: ' : 'Due '}
                          {formatDate(nextTask.dueDate)}
                        </span>
                      )}
                      {nextTask.estimatedHours && (
                        <span className="text-xs text-[#929AA3] font-mono">
                          {nextTask.estimatedHours}h estimated
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#237A57] font-medium pt-1 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#237A57]" />
                      <span>All prerequisite work is complete. You can start this deliverable now.</span>
                    </p>
                  </div>

                  <div className="shrink-0 flex sm:flex-col justify-end gap-2 pt-2 sm:pt-0">
                    {canStartTask(user, nextTask) && (
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
                    )}
                    <Button
                      size="sm"
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
              /* Minimal Positive State */
              <div className="bg-[#F7F8FA] border border-[#E3E7EC] rounded-[10px] px-4 py-3 flex items-center gap-3">
                <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                <p className="text-xs">
                  <span className="font-semibold text-[#181B20]">
                    {inProgressTasks.length > 0 ? 'All new work started.' : 'No tasks ready to start.'}
                  </span>{' '}
                  <span className="text-[#626A73]">
                    {inProgressTasks.length > 0
                      ? `You have ${inProgressTasks.length} active deliverable${inProgressTasks.length === 1 ? '' : 's'} in progress below.`
                      : waitingTasks.length > 0
                        ? `You have ${waitingTasks.length} task${waitingTasks.length === 1 ? '' : 's'} waiting on prerequisite deliverables.`
                        : 'New task assignments will appear here.'}
                  </span>
                </p>
              </div>
            )}

            {/* Other Ready Tasks if > 1 (Open list on canvas) */}
            {remainingReadyTasks.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold text-[#929AA3] uppercase tracking-wider">
                  Also Ready to Start ({remainingReadyTasks.length}):
                </p>
                <div className="space-y-2.5">
                  {remainingReadyTasks.map((task: any) => {
                    const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                    return (
                      <div
                        key={task.id}
                        className="p-3.5 rounded-[12px] bg-white border border-[#E3E7EC] hover:border-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.02)] fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div
                          onClick={() => setSelectedTaskId(task.id)}
                          className="space-y-0.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-[#929AA3] text-[11px] shrink-0 px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
                              {cleanId}
                            </span>
                            <span className="font-medium text-[#181B20] hover:text-[#2563EB] truncate">
                              {task.title}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-[#626A73] pt-0.5">
                            <span>{task.project?.name}</span>
                            {task.dueDate && (
                              <span className="text-[#929AA3] font-mono">Due {formatDate(task.dueDate)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <PriorityBadge priority={task.priority} />
                          {canStartTask(user, task) && (
                            <Button
                              size="xs"
                              variant="secondary"
                              loading={startWorkMutation.isPending}
                              onClick={() => startWorkMutation.mutate(task.id)}
                              leftIcon={<Play className="w-3 h-3 text-[#2563EB] fill-[#2563EB]" />}
                            >
                              Start Work
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: CURRENT WORK */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
              <h2 className="text-[14px] font-semibold text-[#181B20] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                <span>Current Work</span>
                <span className="text-xs font-mono text-[#929AA3] font-normal">
                  ({inProgressTasks.length})
                </span>
              </h2>
            </div>

            {inProgressTasks.length === 0 ? (
              <div className="py-5 text-center text-xs text-[#929AA3]">
                No deliverables currently in progress. Start work on ready tasks above.
              </div>
            ) : (
              /* Open deliverable list with hairline dividers */
              <div className="divide-y divide-[#E3E7EC]">
                {inProgressTasks.map((task: any) => {
                  const isInReview = task.status === TaskStatus.IN_REVIEW;
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);

                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-[12px] bg-white border border-[#E3E7EC] hover:border-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.02)] fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div
                        onClick={() => setSelectedTaskId(task.id)}
                        className="space-y-1 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-[#929AA3] text-[11px] shrink-0 px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
                            {cleanId}
                          </span>
                          <span className="font-medium text-sm text-[#181B20] hover:text-[#2563EB] truncate fx-transition">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-[#626A73] pt-0.5">
                          <span>{task.project?.name}</span>
                          {task.milestone && <span className="text-[#7557B5]">• {task.milestone.name}</span>}
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-[#929AA3] font-mono">
                              <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                            </span>
                          )}
                          {isInReview && (
                            <span className="px-1.5 py-0.5 rounded-[5px] bg-[#F4F0FC] text-[#7557B5] font-medium text-[10px]">
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

          {/* SECTION 3: WAITING ON OTHER WORK */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
              <h2 className="text-[14px] font-semibold text-[#181B20] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#A86B12]" />
                <span>Waiting on Other Work</span>
                <span className="text-xs font-mono text-[#929AA3] font-normal">
                  ({waitingTasks.length})
                </span>
              </h2>
            </div>

            {waitingTasks.length === 0 ? (
              /* Compact Positive State */
              <div className="bg-[#F7F8FA] border border-[#E3E7EC] rounded-[10px] px-4 py-3 flex items-center gap-3">
                <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                <p className="text-xs">
                  <span className="font-semibold text-[#181B20]">No tasks waiting on other work.</span>{' '}
                  <span className="text-[#626A73]">All prerequisite deliverables are clear.</span>
                </p>
              </div>
            ) : (
              /* Open list with hairline dividers */
              <div className="divide-y divide-[#E3E7EC]">
                {waitingTasks.map((task: any) => {
                  const blockers = task.blockedBy || [];
                  const unfinishedBlockers = blockers.filter(
                    (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                  );
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);

                  return (
                    <div
                      key={task.id}
                      className="py-3.5 hover:bg-[#F7F8FA] -mx-2 px-2 rounded-[8px] fx-transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                    >
                      <div
                        onClick={() => setSelectedTaskId(task.id)}
                        className="space-y-1.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-[#929AA3] text-[11px] shrink-0 px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
                            {cleanId}
                          </span>
                          <span className="font-medium text-sm text-[#181B20] hover:text-[#2563EB] truncate">
                            {task.title}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-[#626A73]">
                          <span>{task.project?.name}</span>
                          {task.dueDate && (
                            <span className="text-[#929AA3] font-mono">Due {formatDate(task.dueDate)}</span>
                          )}
                        </div>

                        {/* Natural Language Prerequisite Explainer */}
                        <div className="p-2.5 rounded-[8px] bg-[#FFF6E5] text-xs text-[#A86B12] flex items-start gap-2">
                          <Lock className="w-3.5 h-3.5 text-[#A86B12] shrink-0 mt-0.5" />
                          <div className="space-y-0.5 min-w-0">
                            <span className="font-semibold text-[10px] uppercase tracking-wider block text-[#A86B12]">
                              Waiting for prerequisite:
                            </span>
                            {unfinishedBlockers.length > 0 ? (
                              unfinishedBlockers.map((b: any) => (
                                <div key={b.id || b.predecessorTaskId} className="text-xs text-[#181B20] font-medium">
                                  <span className="font-mono text-[#626A73]">{formatTaskId(b.predecessorTask?.humanId)}</span> · {b.predecessorTask?.title}
                                  {b.predecessorTask?.assignee && (
                                    <span className="text-[#626A73] font-normal"> (assigned to {b.predecessorTask.assignee.firstName} {b.predecessorTask.assignee.lastName})</span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-[#181B20]">Prerequisites resolving...</span>
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

          {/* SECTION 4: RECENT DAILY UPDATES & ACTIVITY */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
              <h2 className="text-[14px] font-semibold text-[#181B20] flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#929AA3]" />
                <span>Recent Daily Updates & Activity</span>
              </h2>
            </div>

            {recentDailyUpdates.length === 0 ? (
              <div className="py-5 text-center text-xs text-[#929AA3]">
                No daily updates logged yet. As you log progress notes, daily deliverables will appear here.
              </div>
            ) : (
              <div className="divide-y divide-[#E3E7EC]">
                {recentDailyUpdates.map((update: any) => {
                  const task = update.task || {};
                  const cleanId = formatTaskId(task.humanId);

                  return (
                    <div
                      key={update.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-3 hover:bg-[#F7F8FA] -mx-2 px-2 rounded-[8px] cursor-pointer fx-transition flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#929AA3] text-[11px] px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">{cleanId}</span>
                          <span className="font-medium text-[#181B20] truncate">{task.title}</span>
                          <span className="text-[#2563EB] font-semibold font-mono">{update.progress}%</span>
                        </div>

                        {update.completedToday && (
                          <p className="text-[#626A73] text-xs line-clamp-1">
                            <span className="font-medium text-[#181B20]">Completed:</span> {update.completedToday}
                          </p>
                        )}

                        {update.blockerNote && (
                          <p className="text-[#C24141] text-xs line-clamp-1">
                            <span className="font-medium">Blocker:</span> {update.blockerNote}
                          </p>
                        )}
                      </div>

                      <span className="font-mono text-[11px] text-[#929AA3] shrink-0">
                        {formatTimeAgo(update.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* UTILITY COLUMN: Independent vertical stack */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Today & Upcoming Deadlines - Open section */}
          <div className="space-y-3 pb-6 border-b border-[#E3E7EC]">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[#181B20] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#929AA3]" />
                <span>Today & Upcoming</span>
              </h2>
              <Link
                href="/my-work?tab=ALL"
                className="text-xs text-[#2563EB] font-medium hover:text-[#1D4ED8] flex items-center gap-0.5"
              >
                <span>My Work</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {todayUpcomingDeadlines.length === 0 ? (
              <p className="text-xs text-[#929AA3] py-2">No deadlines due in the near term.</p>
            ) : (
              <div className="divide-y divide-[#E3E7EC]">
                {todayUpcomingDeadlines.map((task: any) => {
                  const isOverdue = new Date(task.dueDate) < now;
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-2.5 cursor-pointer hover:bg-[#F7F8FA] rounded-[8px] px-1 -mx-1 fx-transition text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[#181B20] truncate hover:text-[#2563EB] fx-transition">
                          {task.title}
                        </span>
                        <span
                          className={cn(
                            'font-mono text-[11px] shrink-0 font-medium',
                            isOverdue ? 'text-[#C24141] font-semibold' : 'text-[#626A73]',
                          )}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#929AA3]">
                        <span className="font-mono">{cleanId} · {task.project?.name}</span>
                        <StatusPill status={task.status} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delivery Calendar Widget - Standalone unboxed */}
          <CalendarWidget
            tasks={tasks}
            projects={projects}
            onSelectTask={(id) => setSelectedTaskId(id)}
            title="Delivery Calendar"
          />

        </div>

      </div>
    </div>
  );
}
