'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Calendar,
  Lock,
  Clock,
  CheckCircle2,
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
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { DashboardGreeting } from './DashboardGreeting';
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
      if (a.workstream === 'MARKETING' && b.workstream === 'MARKETING') {
        const aOrder = Number(String(a.checklistCode || '').match(/(\d+)$/)?.[1]) || Number.MAX_SAFE_INTEGER;
        const bOrder = Number(String(b.checklistCode || '').match(/(\d+)$/)?.[1]) || Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const sortedInProgressTasks = sortTasks(inProgressTasks);
  const sortedReadyTasks = sortTasks(readyTasks);
  const sortedWaitingTasks = sortTasks(waitingTasks);

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

  const upNextDeadlines = tasks
    .filter((t) => t.dueDate && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const recentDailyUpdates = tasks
    .flatMap((t) => (t.dailyUpdates || []).map((u: any) => ({ ...u, task: t })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const firstName = user?.firstName || 'there';

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
    <div className="space-y-8">
      {/* SlideOver Task Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* Greeting Area & Workload Summary */}
      <div className="border-b border-[#E8EBEF] pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="fx-page-title">
              <DashboardGreeting userName={firstName} />
            </h1>
            <p className="text-[13px] text-[#60666F] mt-1">
              {getGreetingSubtitle()}
            </p>
          </div>
          <span className="text-[12px] text-[#8B929B] font-medium shrink-0" suppressHydrationWarning>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Action-First Workload Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/my-work?tab=ALL"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs fx-transition border',
                activeTasksCount > 0
                  ? 'bg-[#EEF4FF] border-[#2463EB]/20 text-[#2463EB] font-medium hover:bg-[#E0ECFF]'
                  : 'bg-[#F8F9FB] border-[#E8EBEF] text-[#60666F] hover:text-[#17191C]',
              )}
            >
              <span className="text-[#60666F]">Active:</span>
              <span className="font-semibold font-mono text-[#17191C]">{activeTasksCount}</span>
            </Link>

            <Link
              href="/my-work?tab=READY"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs fx-transition border',
                readyTasks.length > 0
                  ? 'bg-[#EFF8F3] border-[#237A57]/20 text-[#237A57] font-medium'
                  : 'bg-[#F8F9FB] border-[#E8EBEF] text-[#8B929B] hover:text-[#17191C]',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  readyTasks.length > 0 ? 'bg-[#237A57]' : 'bg-[#8B929B]',
                )}
              />
              <span>Ready:</span>
              <span className="font-semibold font-mono">{readyTasks.length}</span>
            </Link>

            <Link
              href="/my-work?tab=WAITING"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs fx-transition border',
                waitingTasks.length > 0
                  ? 'bg-[#FFF7E8] border-[#9A6515]/20 text-[#9A6515] font-medium'
                  : 'bg-[#F8F9FB] border-[#E8EBEF] text-[#8B929B] hover:text-[#17191C]',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  waitingTasks.length > 0 ? 'bg-[#9A6515]' : 'bg-[#8B929B]',
                )}
              />
              <span>Waiting:</span>
              <span className="font-semibold font-mono">{waitingTasks.length}</span>
            </Link>
          </div>

          {completedTasks.length > 0 && (
            <Link
              href="/my-work?tab=COMPLETED"
              className="inline-flex items-center gap-1.5 text-xs text-[#60666F] hover:text-[#2463EB] fx-transition font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#26715A]" />
              <span>{completedTasks.length} Completed</span>
              <ArrowRight className="w-3 h-3 text-[#8B929B]" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Work Layout: 70% primary work / 30% utility sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">

        {/* PRIMARY WORK COLUMN */}
        <div className="space-y-8 min-w-0">

          {/* DYNAMIC HERO SECTION: Clean surface */}
          {heroType === 'CURRENT_FOCUS' && heroTask && (
            <div className="rounded-[12px] bg-white border border-[#E8EBEF] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#245EC7] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2463EB]" />
                  Current Focus
                </span>
                <span className="text-xs text-[#8B929B]">In Progress</span>
              </div>

              <div
                onClick={() => setSelectedTaskId(heroTask.id)}
                className="cursor-pointer group space-y-1"
              >
                <h2 className="text-xl sm:text-[22px] font-semibold text-[#17191C] group-hover:text-[#2463EB] leading-tight tracking-tight fx-transition">
                  {heroTask.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#60666F] pt-0.5">
                  <span className="font-medium text-[#17191C]">{heroTask.project?.name}</span>
                  <span>•</span>
                  <span className="font-mono text-[#8B929B] px-1.5 py-0.5 bg-[#F8F9FB] rounded-[5px] border border-[#E8EBEF]">
                    {formatTaskId(heroTask.humanId, heroTask.project?.key, heroTask.project?.name)}
                  </span>
                  {heroTask.milestone && (
                    <>
                      <span>•</span>
                      <span className="text-[#6D52A3] font-medium">{heroTask.milestone.name}</span>
                    </>
                  )}
                </div>
              </div>

              {heroTask.workstream !== 'MARKETING' && <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#60666F]">Execution Progress</span>
                  <span className="font-mono font-semibold text-[#2463EB]">{heroTask.progress}% complete</span>
                </div>
                <Progress value={heroTask.progress} showLabel={false} size="sm" />
              </div>}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E8EBEF]">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#60666F]">
                  {heroTask.dueDate && (
                    <span
                      className={cn(
                        'flex items-center gap-1 font-medium text-xs',
                        new Date(heroTask.dueDate) < now
                          ? 'text-[#B54747] font-semibold'
                          : 'text-[#60666F]',
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

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setSelectedTaskId(heroTask.id)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="w-full sm:w-auto"
                >
                  {heroTask.status === TaskStatus.IN_REVIEW ? 'View Submission' : heroTask.workstream === 'MARKETING' ? 'Update Status' : 'Update Progress'}
                </Button>
              </div>
            </div>
          )}

          {heroType === 'READY_TO_START' && heroTask && (
            <div className="rounded-[12px] bg-white border border-[#E8EBEF] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#237A57] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#237A57]" />
                  Ready to Start
                </span>
                <span className="text-xs text-[#237A57]">All prerequisites clear</span>
              </div>

              <div
                onClick={() => setSelectedTaskId(heroTask.id)}
                className="cursor-pointer group space-y-1"
              >
                <h2 className="text-xl sm:text-[22px] font-semibold text-[#17191C] group-hover:text-[#2463EB] leading-tight tracking-tight fx-transition">
                  {heroTask.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#60666F] pt-0.5">
                  <span className="font-medium text-[#17191C]">{heroTask.project?.name}</span>
                  <span>•</span>
                  <span className="font-mono text-[#8B929B] px-1.5 py-0.5 bg-[#F8F9FB] rounded-[5px] border border-[#E8EBEF]">
                    {formatTaskId(heroTask.humanId, heroTask.project?.key, heroTask.project?.name)}
                  </span>
                </div>
              </div>

              {heroTask.description && (
                <p className="text-xs sm:text-[13px] text-[#60666F] line-clamp-2 max-w-2xl leading-relaxed">
                  {heroTask.description}
                </p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E8EBEF]">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#60666F]">
                  {heroTask.dueDate && (
                    <span
                      className={cn(
                        'flex items-center gap-1 font-medium text-xs',
                        new Date(heroTask.dueDate) < now
                          ? 'text-[#B54747] font-semibold'
                          : 'text-[#60666F]',
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
                      {heroTask.workstream === 'MARKETING' ? 'Start Checklist' : 'Start Work'}
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
            <div className="rounded-[12px] bg-white border border-[#E8EBEF] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A6515] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9A6515]" />
                  Waiting on Prerequisites
                </span>
                <span className="text-xs text-[#9A6515]">Pending other work</span>
              </div>

              <div
                onClick={() => setSelectedTaskId(heroTask.id)}
                className="cursor-pointer group space-y-1"
              >
                <h2 className="text-xl sm:text-[22px] font-semibold text-[#17191C] group-hover:text-[#2463EB] leading-tight tracking-tight fx-transition">
                  {heroTask.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#60666F] pt-0.5">
                  <span className="font-medium text-[#17191C]">{heroTask.project?.name}</span>
                  <span>•</span>
                  <span className="font-mono text-[#8B929B] px-1.5 py-0.5 bg-[#F8F9FB] rounded-[5px] border border-[#E8EBEF]">
                    {formatTaskId(heroTask.humanId, heroTask.project?.key, heroTask.project?.name)}
                  </span>
                </div>
              </div>

              {heroTask.blockedBy && heroTask.blockedBy.length > 0 && (
                <div className="p-3 rounded-[8px] bg-[#FFF7E8] text-xs text-[#9A6515] flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#9A6515] shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-medium text-[11px] block text-[#9A6515]">
                      Waiting for prerequisite deliverables:
                    </span>
                    {heroTask.blockedBy.map((b: any) => (
                      <div key={b.id || b.predecessorTaskId} className="text-xs text-[#17191C]">
                        <span className="font-mono text-[#60666F]">{formatTaskId(b.predecessorTask?.humanId)}</span> · {b.predecessorTask?.title}
                        {b.predecessorTask?.assignee && (
                          <span className="text-[#60666F]"> (assigned to {b.predecessorTask.assignee.firstName} {b.predecessorTask.assignee.lastName})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E8EBEF]">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#60666F]">
                  {heroTask.dueDate && (
                    <span className="flex items-center gap-1 font-medium text-[#60666F]">
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
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EFF8F3] text-[#237A57] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-[#17191C]">
                  You're all caught up
                </h2>
                <p className="text-xs text-[#60666F] max-w-sm mx-auto">
                  No active deliverables require your attention right now.
                </p>
              </div>
            </div>
          )}

          {/* OTHER ACTIVE WORK: Calm open rows */}
          {otherActiveTasks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8EBEF]">
                <h3 className="fx-section-title">
                  Other Active Work ({otherActiveTasks.length})
                </h3>
              </div>

              <div className="divide-y divide-[#E8EBEF]">
                {otherActiveTasks.map((task: any) => {
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-3 hover:bg-[#F8F9FB] -mx-2 px-2 rounded-[8px] fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[#8B929B] px-1.5 py-0.5 bg-[#F8F9FB] rounded-[5px] border border-[#E8EBEF]">
                            {cleanId}
                          </span>
                          <span className="font-medium text-sm text-[#17191C] hover:text-[#2463EB] truncate fx-transition">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[#60666F]">
                          <span>{task.project?.name}</span>
                          {task.dueDate && (
                            <span className="text-[#8B929B] font-mono">· Due {formatDate(task.dueDate)}</span>
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
                          Update
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* READY TO START */}
          {otherReadyTasks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8EBEF]">
                <h3 className="fx-section-title">
                  Ready to Start ({otherReadyTasks.length})
                </h3>
              </div>

              <div className="divide-y divide-[#E8EBEF]">
                {otherReadyTasks.map((task: any) => {
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-3 hover:bg-[#F8F9FB] -mx-2 px-2 rounded-[8px] fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[#8B929B] px-1.5 py-0.5 bg-[#F8F9FB] rounded-[5px] border border-[#E8EBEF]">
                            {cleanId}
                          </span>
                          <span className="font-medium text-sm text-[#17191C] hover:text-[#2463EB] truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[#60666F]">
                          <span>{task.project?.name}</span>
                          {task.dueDate && (
                            <span className="text-[#8B929B] font-mono">· Due {formatDate(task.dueDate)}</span>
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
                            leftIcon={<Play className="w-3 h-3 text-[#2463EB] fill-[#2463EB]" />}
                          >
                            {task.workstream === 'MARKETING' ? 'Start Checklist' : 'Start Work'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* RECENT DAILY UPDATES */}
          {recentDailyUpdates.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8EBEF]">
                <h3 className="fx-section-title">
                  Recent Daily Updates
                </h3>
              </div>

              <div className="divide-y divide-[#E8EBEF]">
                {recentDailyUpdates.map((update: any) => {
                  const task = update.task || {};
                  const cleanId = formatTaskId(task.humanId);

                  return (
                    <div
                      key={update.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-2.5 hover:bg-[#F8F9FB] -mx-2 px-2 rounded-[8px] cursor-pointer fx-transition flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#8B929B] text-[11px] px-1.5 py-0.5 bg-[#F8F9FB] rounded-[5px] border border-[#E8EBEF]">
                            {cleanId}
                          </span>
                          <span className="font-medium text-[#17191C] truncate">{task.title}</span>
                          <span className="text-[#2463EB] font-mono font-medium">{update.progress}%</span>
                        </div>

                        {update.completedToday && (
                          <p className="text-[#60666F] text-xs line-clamp-1">
                            {update.completedToday}
                          </p>
                        )}
                      </div>

                      <span className="font-mono text-[11px] text-[#8B929B] shrink-0">
                        {formatTimeAgo(update.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>

        {/* UTILITY COLUMN: Up Next & Calendar */}
        <div className="space-y-8 min-w-0">

          {/* UP NEXT DEADLINES */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8B929B]">
                Up Next
              </h3>
              <Link
                href="/my-work?tab=ALL"
                className="text-[11px] font-medium text-[#2463EB] hover:text-[#1D4ED8] flex items-center gap-0.5 fx-transition"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {upNextDeadlines.length === 0 ? (
              <p className="text-xs text-[#8B929B] py-1">No upcoming deadlines.</p>
            ) : (
              <div className="divide-y divide-[#E8EBEF]">
                {upNextDeadlines.map((task: any) => {
                  const isOverdue = new Date(task.dueDate) < now;
                  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-2.5 cursor-pointer hover:bg-[#F8F9FB] rounded-[6px] px-1 -mx-1 fx-transition text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[#17191C] truncate hover:text-[#2463EB] fx-transition">
                          {task.title}
                        </span>
                        <span
                          className={cn(
                            'font-mono text-[11px] shrink-0 font-medium',
                            isOverdue ? 'text-[#B54747]' : 'text-[#60666F]',
                          )}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#8B929B]">
                        <span className="font-mono">{cleanId} · {task.project?.name}</span>
                        <StatusPill status={task.status} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CALENDAR */}
          <CalendarWidget
            tasks={tasks}
            projects={projects}
            onSelectTask={(id) => setSelectedTaskId(id)}
            borderless={true}
            title="Schedule"
          />

        </div>

      </div>
    </div>
  );
}
