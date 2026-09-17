'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Calendar,
  AlertCircle,
  Play,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { TaskStatus, TaskPriority } from '@futurex/shared';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { formatDate, formatTaskId, cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { canStartTask, canUpdateTaskProgress } from '@/lib/permissions';
import { useDebounce } from '@/hooks/useDebounce';
import { MyWorkSkeleton } from '@/components/ui/Skeleton';

function MyWorkContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'ALL';
  const queryClient = useQueryClient();

  const [selectedTab, setSelectedTab] = useState<string>(initialTab);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'workflow' | 'project' | 'priority' | 'none'>('workflow');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const debouncedSearch = useDebounce(search, 250);

  // Fetch tasks with debounced search
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['my-work', selectedTab, debouncedSearch, projectFilter, priorityFilter],
    queryFn: ({ signal }) =>
      api.get(
        `/tasks/my-work?tab=${selectedTab}&search=${encodeURIComponent(debouncedSearch)}&projectId=${projectFilter}&priority=${priorityFilter}`,
        { signal },
      ),
    staleTime: 15000,
  });

  // Fetch projects for filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
    staleTime: 45000,
  });

  // Start Work Mutation with Optimistic UI
  const startWorkMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.patch(`/tasks/${taskId}`, { status: TaskStatus.IN_PROGRESS }),
    onMutate: async (taskId: string) => {
      setActionMessage(null);
      const qKey = ['my-work', selectedTab, debouncedSearch, projectFilter, priorityFilter];
      await queryClient.cancelQueries({ queryKey: qKey });
      const previousTasks = queryClient.getQueryData(qKey);
      queryClient.setQueryData(qKey, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((t: any) =>
          t.id === taskId ? { ...t, status: TaskStatus.IN_PROGRESS } : t,
        );
      });
      return { previousTasks, qKey };
    },
    onError: (error: any, _vars, context: any) => {
      if (context?.previousTasks && context?.qKey) {
        queryClient.setQueryData(context.qKey, context.previousTasks);
      }
      setActionMessage({ type: 'error', text: error?.message || 'This checklist could not be started.' });
    },
    onSuccess: () => setActionMessage({ type: 'success', text: 'Checklist started. You can update its status from Doing.' }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const allProjects = asArray<any>(projectsData);
  const allTasks = [...asArray<any>(tasksData)].sort((a, b) => {
    if (a.workstream === 'MARKETING' && b.workstream === 'MARKETING') {
      const aOrder = Number(String(a.checklistCode || '').match(/(\d+)$/)?.[1]) || Number.MAX_SAFE_INTEGER;
      const bOrder = Number(String(b.checklistCode || '').match(/(\d+)$/)?.[1]) || Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    }
    return 0;
  });

  // Canonical default grouping: NEEDS ATTENTION -> IN PROGRESS -> READY TO START -> WAITING -> UPCOMING -> COMPLETED
  const groupedTasks = useMemo(() => {
    const now = new Date();
    if (groupBy === 'none') {
      return [{ groupName: 'Assigned Work', items: allTasks }];
    }

    if (groupBy === 'workflow') {
      const needsAttention = allTasks.filter(
        (t) =>
          t.status === TaskStatus.BLOCKED ||
          (t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED),
      );

      const attentionIds = new Set(needsAttention.map((t) => t.id));

      const inProgress = allTasks.filter(
        (t) => (t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW) && !attentionIds.has(t.id),
      );
      const ready = allTasks.filter(
        (t) => t.status === TaskStatus.READY && !attentionIds.has(t.id),
      );
      const waiting = allTasks.filter(
        (t) => t.status === TaskStatus.WAITING && !attentionIds.has(t.id),
      );
      const done = allTasks.filter((t) => t.status === TaskStatus.DONE);
      const upcoming = allTasks.filter(
        (t) =>
          !attentionIds.has(t.id) &&
          t.status !== TaskStatus.IN_PROGRESS &&
          t.status !== TaskStatus.IN_REVIEW &&
          t.status !== TaskStatus.READY &&
          t.status !== TaskStatus.WAITING &&
          t.status !== TaskStatus.DONE &&
          t.status !== TaskStatus.BLOCKED,
      );

      const groups = [];
      if (needsAttention.length > 0)
        groups.push({ groupName: 'Needs Attention', items: needsAttention, dotColor: 'bg-[#B54747]' });
      if (inProgress.length > 0)
        groups.push({ groupName: 'In Progress', items: inProgress, dotColor: 'bg-[#245EC7]' });
      if (ready.length > 0)
        groups.push({ groupName: 'Ready to Start', items: ready, dotColor: 'bg-[#237A57]' });
      if (waiting.length > 0)
        groups.push({ groupName: 'Waiting on Prerequisites', items: waiting, dotColor: 'bg-[#9A6515]' });
      if (upcoming.length > 0)
        groups.push({ groupName: 'Upcoming', items: upcoming, dotColor: 'bg-[#8C939E]' });
      if (done.length > 0)
        groups.push({ groupName: 'Completed', items: done, dotColor: 'bg-[#26715A]' });

      return groups.length > 0 ? groups : [{ groupName: 'Assigned Work', items: [] }];
    }

    const map = new Map<string, any[]>();
    allTasks.forEach((task: any) => {
      let key = 'Other';
      if (groupBy === 'project') {
        key = task.project?.name || 'Unassigned Project';
      } else if (groupBy === 'priority') {
        key = `${task.priority} Priority`;
      }

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(task);
    });

    return Array.from(map.entries()).map(([groupName, items]) => ({
      groupName,
      items,
    }));
  }, [allTasks, groupBy]);

  const now = new Date();
  const workflowColumns = [
    {
      id: 'ready',
      title: 'Ready',
      subtitle: 'Start these next',
      color: 'bg-[#237A57]',
      border: 'hover:border-[#237A57]',
      items: allTasks.filter((t) => t.status === TaskStatus.READY),
      empty: 'No ready tasks',
      icon: <Play className="w-3.5 h-3.5" />,
    },
    {
      id: 'doing',
      title: 'Doing',
      subtitle: 'Active work',
      color: 'bg-[#245EC7]',
      border: 'hover:border-[#2463EB]',
      items: allTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS),
      empty: 'Nothing in progress',
      icon: <Calendar className="w-3.5 h-3.5" />,
    },
    {
      id: 'review',
      title: 'Review',
      subtitle: 'Submitted to Admin',
      color: 'bg-[#6D52A3]',
      border: 'hover:border-[#6D52A3]',
      items: allTasks.filter((t) => t.status === TaskStatus.IN_REVIEW),
      empty: 'No submitted work',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'waiting',
      title: 'Waiting',
      subtitle: 'Locked by dependencies',
      color: 'bg-[#9A6515]',
      border: 'hover:border-[#9A6515]',
      items: allTasks.filter((t) => t.status === TaskStatus.WAITING || t.status === TaskStatus.BLOCKED),
      empty: 'No blocked work',
      icon: <Lock className="w-3.5 h-3.5" />,
    },
    {
      id: 'done',
      title: 'Done',
      subtitle: 'Completed work',
      color: 'bg-[#26715A]',
      border: 'hover:border-[#26715A]',
      items: allTasks.filter((t) => t.status === TaskStatus.DONE),
      empty: 'No completed tasks',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
  ];

  const tabs = [
    { id: 'ALL', label: 'All' },
    { id: 'READY', label: 'Ready' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'WAITING', label: 'Waiting' },
    { id: 'BLOCKED', label: 'Blocked' },
    { id: 'REVIEW', label: 'Review' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  if (isLoading && allTasks.length === 0) {
    return (
      <AppShell>
        <MyWorkSkeleton />
      </AppShell>
    );
  }

  // Render single dominant action per task card
  const renderTaskAction = (task: any) => {
    switch (task.status) {
      case TaskStatus.READY:
        if (canStartTask(user, task)) {
          return (
            <Button
              size="xs"
              variant="primary"
              loading={startWorkMutation.isPending && startWorkMutation.variables === task.id}
              onClick={(e) => {
                e.stopPropagation();
                startWorkMutation.mutate(task.id);
              }}
              leftIcon={<Play className="w-3 h-3 fill-white" />}
            >
              {task.workstream === 'MARKETING' ? 'Start Checklist' : 'Start Work'}
            </Button>
          );
        }
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
          >
            View Details
          </Button>
        );
      case TaskStatus.IN_PROGRESS:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
          >
            {task.workstream === 'MARKETING' ? 'Update Status' : canUpdateTaskProgress(user, task) ? 'Update Progress' : 'View Progress'}
          </Button>
        );
      case TaskStatus.IN_REVIEW:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
          >
            View Submission
          </Button>
        );
      case TaskStatus.WAITING:
        return (
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
        );
      case TaskStatus.BLOCKED:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
          >
            View Blocker
          </Button>
        );
      case TaskStatus.DONE:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
          >
            View Details
          </Button>
        );
      default:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
          >
            Open Task
          </Button>
        );
    }
  };

  const renderKanbanTaskCard = (task: any) => {
    const isOverdue =
      task.dueDate && new Date(task.dueDate) < now && task.status !== TaskStatus.DONE;
    const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
    const progressValue = Math.min(Math.max(Number(task.progress || 0), 0), 100);

    return (
      <div
        key={task.id}
        onClick={() => setSelectedTaskId(task.id)}
        className="rounded-[10px] bg-white border border-[#E8EBEF] p-3 hover:border-[#2463EB] cursor-pointer transition-colors space-y-2.5"
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-medium text-[#8C939E] px-1.5 py-0.5 bg-[#F8F9FB] rounded-[4px] border border-[#E8EBEF] truncate">
              {cleanId}
            </span>
            <PriorityBadge priority={task.priority} compact />
          </div>
          <p className="text-[13px] font-medium text-[#17191C] leading-snug line-clamp-2">
            {task.title}
          </p>
          <p className="text-[11px] text-[#60666F] truncate">
            {task.project?.name || 'Project'} · {(task.workstream || 'DEVELOPMENT') === 'MARKETING' ? 'Marketing' : 'Development'}
          </p>
          {task.workstream === 'MARKETING' && task.checklistPhase && (
            <p className="text-[11px] font-medium text-[#245EC7] truncate">Phase: {task.checklistPhase}</p>
          )}
        </div>

        {task.workstream !== 'MARKETING' && (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.IN_REVIEW) && (
          <Progress value={progressValue} showLabel size="xs" />
        )}

        <div className="flex items-center justify-between gap-2">
          {task.dueDate ? (
            <span
              className={cn(
                'text-[11px] font-mono',
                isOverdue ? 'text-[#B54747] font-medium' : 'text-[#8C939E]',
              )}
            >
              {isOverdue ? 'Overdue ' : 'Due '}
              {formatDate(task.dueDate)}
            </span>
          ) : (
            <span className="text-[11px] text-[#8C939E]">No due date</span>
          )}
          <StatusPill status={task.status} size="xs" />
        </div>

        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          {renderTaskAction(task)}
        </div>
      </div>
    );
  };

  const waitingCount = allTasks.filter((t) => t.status === TaskStatus.WAITING).length;
  const inProgressCount = allTasks.filter(
    (t) => t.status === TaskStatus.IN_PROGRESS,
  ).length;
  const readyCount = allTasks.filter((t) => t.status === TaskStatus.READY).length;

  const subtitle = isLoading
    ? 'Loading your assigned deliverables...'
    : `${allTasks.length} assigned deliverable${allTasks.length === 1 ? '' : 's'} · ${
        readyCount > 0
          ? `${readyCount} ready to start`
          : inProgressCount > 0
            ? `${inProgressCount} in progress`
            : waitingCount > 0
              ? `${waitingCount} waiting on prerequisites`
              : 'All work complete'
      }`;

  return (
    <AppShell>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="border-b border-[#E8EBEF] pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
            My Work
          </h1>
          <p className="text-xs text-[#60666F] mt-1">
            {subtitle}
          </p>
        </div>

        {actionMessage && (
          <div role={actionMessage.type === 'error' ? 'alert' : 'status'} className={cn('rounded-[8px] border px-3 py-2 text-xs', actionMessage.type === 'error' ? 'border-[#B54747]/25 bg-[#FFF2F2] text-[#9F3535]' : 'border-[#237A57]/25 bg-[#EFF8F3] text-[#237A57]')}>
            {actionMessage.text}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="border-b border-[#E8EBEF] pb-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-[6px] transition-colors',
                  isActive
                    ? 'bg-[#EEF4FF] text-[#2463EB] font-semibold'
                    : 'text-[#60666F] hover:text-[#17191C] hover:bg-[#F8F9FB]',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search, Filter & Grouping Controls Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-[#8C939E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks by title, ID, or description..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FB] border border-[#E8EBEF] rounded-[9px] text-[#17191C] placeholder:text-[#8C939E] focus:outline-none focus:bg-white focus:border-[#2463EB] transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 rounded-[9px] border border-[#E8EBEF] bg-[#F8F9FB] px-2.5 text-xs text-[#17191C] focus:bg-white focus:outline-none focus:border-[#2463EB]"
            >
              <option value="">All Projects</option>
              {allProjects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 rounded-[9px] border border-[#E8EBEF] bg-[#F8F9FB] px-2.5 text-xs text-[#17191C] focus:bg-white focus:outline-none focus:border-[#2463EB]"
            >
              <option value="">All Priorities</option>
              <option value={TaskPriority.URGENT}>Urgent</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.LOW}>Low</option>
            </select>

            {/* Group By Selector */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="h-8 rounded-[9px] border border-[#E8EBEF] bg-[#F8F9FB] px-2.5 text-xs text-[#17191C] focus:bg-white focus:outline-none focus:border-[#2463EB]"
            >
              <option value="workflow">Group: Workflow</option>
              <option value="project">Group: Project</option>
              <option value="priority">Group: Priority</option>
              <option value="none">Group: None</option>
            </select>
          </div>
        </div>

        {/* Task Groups / List - De-boxed open rows */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#8C939E]">
            Loading assigned tasks...
          </div>
        ) : allTasks.length === 0 ? (
          <div className="py-16 text-center space-y-2 max-w-sm mx-auto">
            <CheckCircle2 className="w-6 h-6 text-[#26715A] mx-auto" />
            <h3 className="text-sm font-semibold text-[#17191C]">No tasks in this view</h3>
            <p className="text-xs text-[#60666F]">
              {selectedTab === 'ALL'
                ? 'No tasks are currently assigned to you.'
                : `No tasks found under the ${tabs.find((t) => t.id === selectedTab)?.label} tab.`}
            </p>
          </div>
        ) : groupBy === 'workflow' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-start">
            {workflowColumns.map((column) => (
              <section
                key={column.id}
                className="rounded-[10px] border border-[#E8EBEF] bg-[#F8F9FB] min-h-[260px]"
              >
                <div className="px-3 py-2.5 border-b border-[#E8EBEF] bg-white rounded-t-[10px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', column.color)} />
                      <div className="min-w-0">
                        <h2 className="text-[13px] font-semibold text-[#17191C] truncate">
                          {column.title}
                        </h2>
                        <p className="text-[11px] text-[#8C939E] truncate">
                          {column.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-[#60666F]">
                      {column.items.length}
                    </span>
                  </div>
                </div>

                <div className="p-2 space-y-2">
                  {column.items.length === 0 ? (
                    <div className="h-20 rounded-[8px] border border-dashed border-[#D8DCE2] bg-white/60 flex items-center justify-center text-[11px] text-[#8C939E]">
                      {column.empty}
                    </div>
                  ) : (
                    column.items.map((task: any) => renderKanbanTaskCard(task))
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTasks.map((group: any) => {
              if (group.items.length === 0) return null;

              return (
                <div key={group.groupName} className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E8EBEF]">
                    {group.dotColor && (
                      <span className={cn('w-2 h-2 rounded-full', group.dotColor)} />
                    )}
                    <h2 className="text-[13px] font-semibold text-[#17191C]">
                      {group.groupName}
                    </h2>
                    <span className="text-xs font-mono text-[#8C939E]">
                      ({group.items.length})
                    </span>
                  </div>

                  <div className="divide-y divide-[#E8EBEF]">
                    {group.items.map((task: any) => {
                      const isOverdue =
                        task.dueDate && new Date(task.dueDate) < now && task.status !== TaskStatus.DONE;
                      const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
                      const unfinishedDeps = (task.blockedBy || []).filter(
                        (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                      );

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="py-3 hover:bg-[#F8F9FB] -mx-2 px-2 rounded-[8px] cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-[#8C939E] text-[11px] shrink-0 px-1.5 py-0.5 bg-[#F8F9FB] rounded-[4px] border border-[#E8EBEF]">
                                {cleanId}
                              </span>
                              <span className="font-medium text-xs text-[#17191C] hover:text-[#2463EB] truncate transition-colors">
                                {task.title}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-[#60666F]">
                              <span>{task.project?.name}</span>
                              {task.milestone && <span>• {task.milestone.name}</span>}
                              {task.dueDate && (
                                <span
                                  className={cn(
                                    'flex items-center gap-1 font-mono',
                                    isOverdue ? 'text-[#B54747] font-medium' : 'text-[#8C939E]',
                                  )}
                                >
                                  <Calendar className="w-3 h-3" />
                                  {isOverdue ? 'Overdue: ' : 'Due '}
                                  {formatDate(task.dueDate)}
                                </span>
                              )}
                              {task.status === TaskStatus.WAITING && unfinishedDeps.length > 0 && (
                                <span className="text-[#9A6515] font-medium">
                                  Waiting for: {unfinishedDeps.map((b: any) => formatTaskId(b.predecessorTask?.humanId)).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                            {task.status === TaskStatus.IN_PROGRESS && (
                              <div className="w-20 hidden sm:block">
                                <Progress value={task.progress} showLabel={true} size="xs" />
                              </div>
                            )}
                            <PriorityBadge priority={task.priority} />
                            <StatusPill status={task.status} size="xs" />
                            {renderTaskAction(task)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function MyWorkPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <MyWorkSkeleton />
        </AppShell>
      }
    >
      <MyWorkContent />
    </Suspense>
  );
}
