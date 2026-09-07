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
  Sparkles,
  AlertCircle,
  ExternalLink,
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
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export function TeamMemberDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch all tasks assigned to current employee
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-work', 'dashboard'],
    queryFn: () => api.get('/tasks/my-work?tab=ALL'),
    staleTime: 20000,
  });

  // Fetch active projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
    staleTime: 45000,
  });

  const tasks = asArray<any>(tasksData);
  const projects = asArray<any>(projectsData);

  // Start Work Mutation with Optimistic UI
  const startWorkMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.patch(`/tasks/${taskId}`, { status: TaskStatus.IN_PROGRESS }),
    onMutate: async (taskId: string) => {
      await queryClient.cancelQueries({ queryKey: ['my-work'] });
      const previousTasks = queryClient.getQueryData(['my-work', 'dashboard']);
      queryClient.setQueryData(['my-work', 'dashboard'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((t: any) =>
          t.id === taskId ? { ...t, status: TaskStatus.IN_PROGRESS } : t,
        );
      });
      return { previousTasks };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['my-work', 'dashboard'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if ((tasksLoading || projectsLoading) && tasks.length === 0) {
    return <DashboardSkeleton />;
  }

  const now = new Date();

  // Distinct task categories
  const readyTasks = tasks.filter((t) => t.status === TaskStatus.READY);
  const inProgressTasks = tasks.filter(
    (t) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW,
  );
  const waitingTasks = tasks.filter((t) => t.status === TaskStatus.WAITING);
  const blockedTasks = tasks.filter((t) => t.status === TaskStatus.BLOCKED);
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE);
  const activeTasksCount = inProgressTasks.length + readyTasks.length + waitingTasks.length + blockedTasks.length;

  // Sorting priority: Overdue -> Urgent -> High -> Medium -> Low
  const priorityWeight: Record<string, number> = {
    URGENT: 100,
    HIGH: 80,
    MEDIUM: 50,
    LOW: 20,
    NONE: 0,
  };

  const sortTasks = (list: any[]) =>
    [...list].sort((a, b) => {
      const aOverdue = a.dueDate && new Date(a.dueDate) < now && a.status !== TaskStatus.DONE;
      const bOverdue = b.dueDate && new Date(b.dueDate) < now && b.status !== TaskStatus.DONE;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;

      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const sortedInProgressTasks = sortTasks(inProgressTasks);
  const sortedReadyTasks = sortTasks(readyTasks);
  const sortedWaitingTasks = sortTasks(waitingTasks);

  // Dynamic Hero Engine Determination
  // Priority: IN_PROGRESS -> READY -> WAITING -> BLOCKED -> ALL_CLEAR
  let heroType: 'CURRENT_FOCUS' | 'READY_TO_START' | 'WAITING' | 'BLOCKED' | 'ALL_CLEAR' = 'ALL_CLEAR';
  let heroTask: any = null;
  let otherActiveTasks: any[] = [];
  let otherReadyTasks: any[] = [];
  let otherWaitingTasks: any[] = [];

  if (sortedInProgressTasks.length > 0) {
    heroType = 'CURRENT_FOCUS';
    heroTask = sortedInProgressTasks[0];
    otherActiveTasks = sortedInProgressTasks.slice(1);
    otherReadyTasks = sortedReadyTasks;
    otherWaitingTasks = sortedWaitingTasks;
  } else if (sortedReadyTasks.length > 0) {
    heroType = 'READY_TO_START';
    heroTask = sortedReadyTasks[0];
    otherActiveTasks = [];
    otherReadyTasks = sortedReadyTasks.slice(1);
    otherWaitingTasks = sortedWaitingTasks;
  } else if (sortedWaitingTasks.length > 0) {
    heroType = 'WAITING';
    heroTask = sortedWaitingTasks[0];
    otherActiveTasks = [];
    otherReadyTasks = [];
    otherWaitingTasks = sortedWaitingTasks.slice(1);
  } else if (blockedTasks.length > 0) {
    heroType = 'BLOCKED';
    heroTask = blockedTasks[0];
  }

  // Up Next Deadlines (3 to 5 near-term actionable events)
  const upNextDeadlines = tasks
    .filter((t) => t.dueDate && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Recent Daily Updates (latest 3-4 items)
  const recentDailyUpdates = tasks
    .flatMap((t) => (t.dailyUpdates || []).map((u: any) => ({ ...u, task: t })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const firstName = user?.firstName || 'there';

  // Dynamic Greeting Subtitle based on real data
  const getGreetingSubtitle = () => {
    if (activeTasksCount === 0) {
      if (completedTasks.length > 0) {
        return `All assigned work is complete (${completedTasks.length} completed). No active tasks pending.`;
      }
      return "You're all caught up. No tasks are currently assigned to you.";
    }

    if (heroType === 'CURRENT_FOCUS') {
      const dueStr = heroTask?.dueDate ? ` · due ${formatDate(heroTask.dueDate)}` : '';
      if (inProgressTasks.length === 1) {
        return `You have 1 task in progress${dueStr}.`;
      }
      return `You have ${inProgressTasks.length} active tasks in progress today.`;
    }

    if (heroType === 'READY_TO_START') {
      if (readyTasks.length === 1) {
        return 'You have 1 deliverable ready to start.';
      }
      return `You have ${readyTasks.length} deliverables ready to start.`;
    }

    if (heroType === 'WAITING') {
      return `You have ${waitingTasks.length} task${waitingTasks.length === 1 ? '' : 's'} waiting on prerequisite deliverables.`;
    }

    return `You have ${activeTasksCount} active deliverable${activeTasksCount === 1 ? '' : 's'}.`;
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* SlideOver Task Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* 1. Greeting Area & Action-First Workload Summary */}
      <div className="border-b border-[#E3E7EC] pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-[#181B20]">
              Good morning, {firstName}
            </h1>
            <p className="text-sm text-[#626A73] mt-1">
              {getGreetingSubtitle()}
            </p>
          </div>
          <span className="text-xs text-[#929AA3] font-medium shrink-0">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Action-First Workload Summary (Clean & compact, non-competing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Active Work */}
            <Link
              href="/my-work?tab=ALL"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs fx-transition border',
                activeTasksCount > 0
                  ? 'bg-[#EEF4FF] border-[#2563EB]/20 text-[#2563EB] font-medium hover:bg-[#E0ECFF]'
                  : 'bg-[#F7F8FA] border-[#E3E7EC] text-[#626A73] hover:text-[#181B20]',
              )}
            >
              <span className="text-[#626A73]">Active Work:</span>
              <span className="font-semibold font-mono text-[#181B20]">{activeTasksCount}</span>
            </Link>

            {/* Ready (Only highlighted if tasks exist) */}
            <Link
              href="/my-work?tab=READY"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs fx-transition border',
                readyTasks.length > 0
                  ? 'bg-[#EDF8F2] border-[#237A57]/20 text-[#237A57] font-medium hover:bg-[#E3F4EB]'
                  : 'bg-[#F7F8FA] border-[#E3E7EC] text-[#929AA3] hover:text-[#181B20]',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  readyTasks.length > 0 ? 'bg-[#237A57]' : 'bg-[#929AA3]',
                )}
              />
              <span>Ready:</span>
              <span className="font-semibold font-mono">{readyTasks.length}</span>
            </Link>

            {/* Waiting (Only highlighted if tasks exist) */}
            <Link
              href="/my-work?tab=WAITING"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs fx-transition border',
                waitingTasks.length > 0
                  ? 'bg-[#FFF6E5] border-[#A86B12]/20 text-[#A86B12] font-medium hover:bg-[#FEEFD4]'
                  : 'bg-[#F7F8FA] border-[#E3E7EC] text-[#929AA3] hover:text-[#181B20]',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  waitingTasks.length > 0 ? 'bg-[#A86B12]' : 'bg-[#929AA3]',
                )}
              />
              <span>Waiting:</span>
              <span className="font-semibold font-mono">{waitingTasks.length}</span>
            </Link>
          </div>

          {/* Subdued Completed Link */}
          {completedTasks.length > 0 && (
            <Link
              href="/my-work?tab=COMPLETED"
              className="inline-flex items-center gap-1.5 text-xs text-[#626A73] hover:text-[#2563EB] fx-transition font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#237A57]" />
              <span>{completedTasks.length} Completed</span>
              <ArrowRight className="w-3 h-3 text-[#929AA3]" />
            </Link>
          )}
        </div>
      </div>

      {/* 2. Main Work Layout (Desktop: 70% primary work / 30% utility sidebar) */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">

        {/* PRIMARY WORK COLUMN (~70%) */}
        <div className="flex flex-col gap-8 min-w-0">

          {/* DYNAMIC HERO SECTION */}
          {heroType === 'CURRENT_FOCUS' && heroTask && (
            <div className="rounded-[16px] bg-white border border-[#E3E7EC] p-5 sm:p-6 shadow-xs hover:border-[#2563EB]/40 fx-transition space-y-4">
              {/* Eyebrow */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
                  Current Focus
                </span>
                <span className="text-xs text-[#929AA3] font-medium">In Progress</span>
              </div>

              {/* Task Title - Strongest Visual Element */}
              <div
                onClick={() => setSelectedTaskId(heroTask.id)}
                className="cursor-pointer group space-y-1"
              >
                <h2 className="text-xl sm:text-[24px] font-semibold text-[#181B20] group-hover:text-[#2563EB] leading-tight tracking-tight fx-transition">
                  {heroTask.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#626A73] pt-0.5">
                  <span className="font-medium text-[#181B20]">{heroTask.project?.name}</span>
                  <span>•</span>
                  <span className="font-mono text-[#929AA3] px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
                    {formatTaskId(heroTask.humanId, heroTask.project?.key, heroTask.project?.name)}
                  </span>
                  {heroTask.milestone && (
                    <>
                      <span>•</span>
                      <span className="text-[#7557B5] font-medium">{heroTask.milestone.name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#626A73] font-medium">Execution Progress</span>
                  <span className="font-mono font-bold text-[#2563EB]">{heroTask.progress}% complete</span>
                </div>
                <Progress value={heroTask.progress} showLabel={false} size="sm" />
              </div>

              {/* Metadata & Dominant Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E3E7EC]">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#626A73]">
                  {heroTask.dueDate && (
                    <span
                      className={cn(
                        'flex items-center gap-1 font-medium text-xs',
                        new Date(heroTask.dueDate) < now
                          ? 'text-[#C24141] font-semibold'
                          : 'text-[#626A73]',
                      )}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(heroTask.dueDate) < now ? 'Overdue: ' : 'Due '}
                      {formatDate(heroTask.dueDate)}
                    </span>
                  )}
                  <PriorityBadge priority={heroTask.priority} />
                  <StatusPill status={heroTask.status} size="xs" />
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setSelectedTaskId(heroTask.id)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="w-full sm:w-auto"
                  >
                    {heroTask.status === TaskStatus.IN_REVIEW ? 'View Submission' : 'Update Progress'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {heroType === 'READY_TO_START' && heroTask && (
            <div className="rounded-[16px] bg-white border border-[#E3E7EC] p-5 sm:p-6 shadow-xs hover:border-[#237A57]/40 fx-transition space-y-4">
              {/* Eyebrow */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#237A57] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#237A57]" />
                  Ready to Start
                </span>
                <span className="text-xs text-[#237A57] font-medium">All prerequisites clear</span>
              </div>

              {/* Task Title */}
              <div
                onClick={() => setSelectedTaskId(heroTask.id)}
                className="cursor-pointer group space-y-1"
              >
                <h2 className="text-xl sm:text-[24px] font-semibold text-[#181B20] group-hover:text-[#2563EB] leading-tight tracking-tight fx-transition">
                  {heroTask.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#626A73] pt-0.5">
                  <span className="font-medium text-[#181B20]">{heroTask.project?.name}</span>
                  <span>•</span>
                  <span className="font-mono text-[#929AA3] px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
                    {formatTaskId(heroTask.humanId, heroTask.project?.key, heroTask.project?.name)}
                  </span>
                  {heroTask.milestone && (
                    <>
                      <span>•</span>
                      <span className="text-[#7557B5] font-medium">{heroTask.milestone.name}</span>
                    </>
                  )}
                </div>
              </div>

              {heroTask.description && (
                <p className="text-xs sm:text-[13px] text-[#626A73] line-clamp-2 max-w-2xl leading-relaxed">
                  {heroTask.description}
                </p>
              )}

              {/* Metadata & Primary Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E3E7EC]">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#626A73]">
                  {heroTask.dueDate && (
                    <span
                      className={cn(
                        'flex items-center gap-1 font-medium text-xs',
                        new Date(heroTask.dueDate) < now
                          ? 'text-[#C24141] font-semibold'
                          : 'text-[#626A73]',
                      )}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(heroTask.dueDate) < now ? 'Overdue: ' : 'Due '}
                      {formatDate(heroTask.dueDate)}
                    </span>
                  )}
                  <PriorityBadge priority={heroTask.priority} />
                  <StatusPill status={heroTask.status} size="xs" />
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {canStartTask(user, heroTask) && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={startWorkMutation.isPending}
                      onClick={() => startWorkMutation.mutate(heroTask.id)}
                      leftIcon={<Play className="w-3.5 h-3.5 fill-white" />}
                      className="w-full sm:w-auto"
                    >
                      Start Work
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedTaskId(heroTask.id)}
                    className="w-full sm:w-auto"
                  >
                    Details
                  </Button>
                </div>
              </div>
            </div>
          )}

          {heroType === 'WAITING' && heroTask && (
            <div className="rounded-[16px] bg-white border border-[#E3E7EC] p-5 sm:p-6 shadow-xs hover:border-[#A86B12]/40 fx-transition space-y-4">
              {/* Eyebrow */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A86B12] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#A86B12]" />
                  Waiting on Other Work
                </span>
                <span className="text-xs text-[#A86B12] font-medium">Pending prerequisite</span>
              </div>

              {/* Task Title */}
              <div
                onClick={() => setSelectedTaskId(heroTask.id)}
                className="cursor-pointer group space-y-1"
              >
                <h2 className="text-xl sm:text-[24px] font-semibold text-[#181B20] group-hover:text-[#2563EB] leading-tight tracking-tight fx-transition">
                  {heroTask.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#626A73] pt-0.5">
                  <span className="font-medium text-[#181B20]">{heroTask.project?.name}</span>
                  <span>•</span>
                  <span className="font-mono text-[#929AA3] px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
                    {formatTaskId(heroTask.humanId, heroTask.project?.key, heroTask.project?.name)}
                  </span>
                </div>
              </div>

              {/* Prerequisite explainer box */}
              {heroTask.blockedBy && heroTask.blockedBy.length > 0 && (
                <div className="p-3 rounded-[10px] bg-[#FFF6E5] text-xs text-[#A86B12] flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-[#A86B12] shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0">
                    <span className="font-semibold text-[10px] uppercase tracking-wider block text-[#A86B12]">
                      Waiting for prerequisite deliverables:
                    </span>
                    {heroTask.blockedBy.map((b: any) => (
                      <div key={b.id || b.predecessorTaskId} className="text-xs text-[#181B20] font-medium">
                        <span className="font-mono text-[#626A73]">{formatTaskId(b.predecessorTask?.humanId)}</span> · {b.predecessorTask?.title}
                        {b.predecessorTask?.assignee && (
                          <span className="text-[#626A73] font-normal"> (assigned to {b.predecessorTask.assignee.firstName} {b.predecessorTask.assignee.lastName})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E3E7EC]">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#626A73]">
                  {heroTask.dueDate && (
                    <span className="flex items-center gap-1 font-medium text-[#626A73]">
                      <Calendar className="w-3.5 h-3.5" /> Due {formatDate(heroTask.dueDate)}
                    </span>
                  )}
                  <PriorityBadge priority={heroTask.priority} />
                  <StatusPill status={heroTask.status} size="xs" />
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedTaskId(heroTask.id)}
                  className="w-full sm:w-auto"
                >
                  View Dependency
                </Button>
              </div>
            </div>
          )}

          {heroType === 'ALL_CLEAR' && (
            <div className="rounded-[16px] bg-white border border-[#E3E7EC] p-6 sm:p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#EDF8F2] text-[#237A57] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-semibold text-[#181B20]">
                  You're all caught up
                </h2>
                <p className="text-xs sm:text-sm text-[#626A73] max-w-md mx-auto">
                  No active work is assigned right now. You can check studio project directories or review previous deliverables.
                </p>
              </div>

              {projects.length > 0 && (
                <div className="pt-4 border-t border-[#E3E7EC] max-w-lg mx-auto text-left">
                  <p className="text-[11px] font-semibold text-[#929AA3] uppercase tracking-wider mb-2.5">
                    My Studio Projects ({projects.length})
                  </p>
                  <div className="space-y-2">
                    {projects.map((p: any) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className="flex items-center justify-between p-3 rounded-[10px] bg-[#F7F8FA] hover:bg-[#F2F4F7] border border-[#E3E7EC] fx-transition text-xs group"
                      >
                        <span className="font-medium text-[#181B20] group-hover:text-[#2563EB] fx-transition">
                          {p.name}
                        </span>
                        <span className="text-[#2563EB] flex items-center gap-1 font-medium">
                          Browse <ArrowRight className="w-3 h-3" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OTHER ACTIVE WORK (Rendered ONLY if multiple in-progress tasks exist) */}
          {otherActiveTasks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
                <h3 className="text-[13px] font-semibold text-[#181B20] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                  <span>Other Active Work</span>
                  <span className="text-xs font-mono text-[#929AA3] font-normal">
                    ({otherActiveTasks.length})
                  </span>
                </h3>
              </div>

              <div className="space-y-2">
                {otherActiveTasks.map((task: any) => {
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-3.5 rounded-[12px] bg-white border border-[#E3E7EC] hover:border-[#2563EB] shadow-xs fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-medium text-[#929AA3] px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
                            {cleanId}
                          </span>
                          <span className="font-medium text-sm text-[#181B20] hover:text-[#2563EB] truncate fx-transition">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-[#626A73]">
                          <span>{task.project?.name}</span>
                          {task.dueDate && (
                            <span className="text-[#929AA3] font-mono">Due {formatDate(task.dueDate)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-16 hidden sm:block">
                          <Progress value={task.progress} showLabel={true} size="xs" />
                        </div>
                        <PriorityBadge priority={task.priority} />
                        <StatusPill status={task.status} size="xs" />
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskId(task.id);
                          }}
                        >
                          Update Progress
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* READY TO START (Rendered ONLY if ready tasks exist and not already hero) */}
          {otherReadyTasks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
                <h3 className="text-[13px] font-semibold text-[#181B20] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#237A57]" />
                  <span>Ready to Start</span>
                  <span className="text-xs font-mono text-[#929AA3] font-normal">
                    ({otherReadyTasks.length})
                  </span>
                </h3>
              </div>

              <div className="space-y-2">
                {otherReadyTasks.map((task: any) => {
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-3.5 rounded-[12px] bg-white border border-[#E3E7EC] hover:border-[#237A57] shadow-xs fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-medium text-[#929AA3] px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
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
                            onClick={(e) => {
                              e.stopPropagation();
                              startWorkMutation.mutate(task.id);
                            }}
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
            </section>
          )}

          {/* WAITING ON OTHER WORK (Rendered ONLY if waiting tasks exist and not already hero) */}
          {otherWaitingTasks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
                <h3 className="text-[13px] font-semibold text-[#181B20] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A86B12]" />
                  <span>Waiting on Other Work</span>
                  <span className="text-xs font-mono text-[#929AA3] font-normal">
                    ({otherWaitingTasks.length})
                  </span>
                </h3>
              </div>

              <div className="divide-y divide-[#E3E7EC]">
                {otherWaitingTasks.map((task: any) => {
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                  const blockers = task.blockedBy || [];
                  const unfinishedBlockers = blockers.filter(
                    (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                  );

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-3 hover:bg-[#F7F8FA] -mx-2 px-2 rounded-[8px] fx-transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-medium text-[#929AA3] px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
                            {cleanId}
                          </span>
                          <span className="font-medium text-sm text-[#181B20] hover:text-[#2563EB] truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-[#626A73]">
                          <span>{task.project?.name}</span>
                          {task.dueDate && <span>• Due {formatDate(task.dueDate)}</span>}
                          {unfinishedBlockers.length > 0 && (
                            <span className="text-[#A86B12] font-medium">
                              Waiting for: {unfinishedBlockers.map((b: any) => formatTaskId(b.predecessorTask?.humanId)).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusPill status={task.status} size="xs" />
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskId(task.id);
                          }}
                        >
                          View Dependency
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* RECENT DAILY UPDATES (Rendered ONLY if updates exist, collapsed otherwise) */}
          {recentDailyUpdates.length > 0 && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
                <h3 className="text-[13px] font-semibold text-[#181B20] uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#929AA3]" />
                  <span>Recent Updates</span>
                </h3>
              </div>

              <div className="divide-y divide-[#E3E7EC]">
                {recentDailyUpdates.map((update: any) => {
                  const task = update.task || {};
                  const cleanId = formatTaskId(task.humanId);

                  return (
                    <div
                      key={update.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-2.5 hover:bg-[#F7F8FA] -mx-2 px-2 rounded-[8px] cursor-pointer fx-transition flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#929AA3] text-[11px] px-1.5 py-0.5 bg-[#F7F8FA] rounded-[6px] border border-[#E3E7EC]">
                            {cleanId}
                          </span>
                          <span className="font-medium text-[#181B20] truncate">{task.title}</span>
                          <span className="text-[#2563EB] font-semibold font-mono">{update.progress}%</span>
                        </div>

                        {update.completedToday && (
                          <p className="text-[#626A73] text-xs line-clamp-1">
                            <span className="font-medium text-[#181B20]">Completed:</span> {update.completedToday}
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
            </section>
          )}

        </div>

        {/* UTILITY COLUMN (~30%): Up Next & Calendar */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* UP NEXT DEADLINES */}
          <div className="space-y-3 pb-6 border-b border-[#E3E7EC]">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#181B20] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#929AA3]" />
                <span>Up Next</span>
              </h3>
              <Link
                href="/my-work?tab=ALL"
                className="text-xs text-[#2563EB] font-medium hover:text-[#1D4ED8] flex items-center gap-0.5 fx-transition"
              >
                <span>View all work</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {upNextDeadlines.length === 0 ? (
              <p className="text-xs text-[#929AA3] py-2">No upcoming deadlines scheduled.</p>
            ) : (
              <div className="divide-y divide-[#E3E7EC]">
                {upNextDeadlines.map((task: any) => {
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

          {/* MINI DELIVERY CALENDAR */}
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
