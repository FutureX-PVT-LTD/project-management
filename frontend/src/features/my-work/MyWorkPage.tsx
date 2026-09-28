'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Calendar,
  Play,
  CheckCircle2,
  LayoutList,
  Kanban,
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
import { canStartTask } from '@/lib/permissions';
import { useDebounce } from '@/hooks/useDebounce';
import { MyWorkSkeleton } from '@/components/ui/Skeleton';
import { compareTasksByWorkflowOrder } from '@/lib/task-order';
import { MyWorkBoardView } from './MyWorkBoardView';

function MyWorkContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'ALL';
  const initialViewParam = searchParams.get('view');
  const queryClient = useQueryClient();

  // View state: 'list' | 'board'
  const [viewMode, setViewMode] = useState<'list' | 'board'>(() => {
    if (initialViewParam === 'list' || initialViewParam === 'board') {
      return initialViewParam;
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('futurex_my_work_view');
      if (saved === 'list' || saved === 'board') return saved;
    }
    return 'list';
  });

  const [selectedTab, setSelectedTab] = useState<string>(initialTab);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [workstreamFilter, setWorkstreamFilter] = useState<'ALL' | 'DEVELOPMENT' | 'MARKETING'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'workflow' | 'project' | 'priority' | 'none'>('workflow');
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const debouncedSearch = useDebounce(search, 250);

  // In Board view, fetch ALL active statuses so all 5 Kanban columns are populated
  const queryTab = viewMode === 'board' ? 'ALL' : selectedTab;

  // Fetch tasks with debounced search
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['my-work', queryTab, debouncedSearch, projectFilter, priorityFilter],
    queryFn: ({ signal }) =>
      api.get(
        `/tasks/my-work?tab=${queryTab}&search=${encodeURIComponent(debouncedSearch)}&projectId=${projectFilter}&priority=${priorityFilter}`,
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
    mutationFn: ({ taskId }: { taskId: string; projectId?: string }) =>
      api.patch(`/tasks/${taskId}`, { status: TaskStatus.IN_PROGRESS }),
    onMutate: async ({ taskId }: { taskId: string; projectId?: string }) => {
      setActionMessage(null);
      const qKey = ['my-work', queryTab, debouncedSearch, projectFilter, priorityFilter];
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
      setActionMessage({
        type: 'error',
        text: error?.message || 'This deliverable could not be started.',
      });
    },
    onSuccess: () =>
      setActionMessage({
        type: 'success',
        text: 'Deliverable started. You can update its progress from In Progress.',
      }),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (variables?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      }
    },
  });

  const allProjects = asArray<any>(projectsData);
  const rawTasks = [...asArray<any>(tasksData)].sort(compareTasksByWorkflowOrder);

  // Filter tasks by Workstream
  const allTasks = useMemo(() => {
    if (workstreamFilter === 'ALL') return rawTasks;
    return rawTasks.filter((task: any) => {
      const stream = (task.workstream || 'DEVELOPMENT').toUpperCase();
      return stream === workstreamFilter;
    });
  }, [rawTasks, workstreamFilter]);

  // Ensure authorized projects include any present in task payloads
  const authorizedProjects = useMemo(() => {
    if (allProjects.length > 0) return allProjects;
    const pMap = new Map<string, any>();
    rawTasks.forEach((t: any) => {
      if (t.project?.id && !pMap.has(t.project.id)) {
        pMap.set(t.project.id, t.project);
      }
    });
    return Array.from(pMap.values());
  }, [allProjects, rawTasks]);

  // Canonical default grouping for List View
  const groupedTasks = useMemo(() => {
    const now = new Date();
    if (groupBy === 'none') {
      return [{ groupName: 'Assigned Work', items: allTasks }];
    }

    if (groupBy === 'workflow') {
      const needsAttention = allTasks.filter(
        (t) =>
          t.status === TaskStatus.BLOCKED ||
          (t.dueDate &&
            new Date(t.dueDate) < now &&
            t.status !== TaskStatus.DONE &&
            t.status !== TaskStatus.CANCELED),
      );

      const attentionIds = new Set(needsAttention.map((t) => t.id));

      const current = allTasks.filter(
        (t) => t.status === TaskStatus.IN_PROGRESS && !attentionIds.has(t.id),
      );
      const ready = allTasks.filter(
        (t) => t.status === TaskStatus.READY && !attentionIds.has(t.id),
      );
      const waiting = allTasks.filter(
        (t) => t.status === TaskStatus.WAITING && !attentionIds.has(t.id),
      );
      const blocked = allTasks.filter((t) => t.status === TaskStatus.BLOCKED);
      const inReview = allTasks.filter((t) => t.status === TaskStatus.IN_REVIEW);
      const completed = allTasks.filter((t) => t.status === TaskStatus.DONE);
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
      if (current.length > 0)
        groups.push({ groupName: 'Current', items: current, dotColor: 'bg-[#2563EB]' });
      if (ready.length > 0)
        groups.push({ groupName: 'Ready', items: ready, dotColor: 'bg-[#237A57]' });
      if (waiting.length > 0)
        groups.push({ groupName: 'Waiting', items: waiting, dotColor: 'bg-[#A86B12]' });
      if (blocked.length > 0)
        groups.push({ groupName: 'Blocked', items: blocked, dotColor: 'bg-[#C24141]' });
      if (inReview.length > 0)
        groups.push({ groupName: 'In Review', items: inReview, dotColor: 'bg-[#7557B5]' });
      if (needsAttention.length > 0 && blocked.length === 0)
        groups.push({
          groupName: 'Needs Attention',
          items: needsAttention,
          dotColor: 'bg-[#C24141]',
        });
      if (upcoming.length > 0)
        groups.push({ groupName: 'Upcoming', items: upcoming, dotColor: 'bg-[#929AA3]' });
      if (completed.length > 0)
        groups.push({ groupName: 'Completed', items: completed, dotColor: 'bg-[#237A57]' });

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

  const tabs = [
    { id: 'ALL', label: 'All' },
    { id: 'IN_PROGRESS', label: 'Current' },
    { id: 'READY', label: 'Ready' },
    { id: 'WAITING', label: 'Waiting' },
    { id: 'BLOCKED', label: 'Blocked' },
    { id: 'REVIEW', label: 'In Review' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  const handleViewChange = (mode: 'list' | 'board') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('futurex_my_work_view', mode);
    }
  };

  // Render single dominant action per task card in List view
  const renderTaskAction = (task: any) => {
    switch (task.status) {
      case TaskStatus.WAITING:
      case TaskStatus.READY:
        if (canStartTask(user, task)) {
          return (
            <Button
              size="xs"
              variant="primary"
              loading={
                startWorkMutation.isPending &&
                (startWorkMutation.variables as any)?.taskId === task.id
              }
              onClick={(e) => {
                e.stopPropagation();
                startWorkMutation.mutate({
                  taskId: task.id,
                  projectId: task.projectId || task.project?.id,
                });
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
            {task.workstream === 'MARKETING' ? 'Update Status' : 'Open Task'}
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

  if (isLoading && allTasks.length === 0) {
    return (
      <AppShell>
        <MyWorkSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      <div className="space-y-6 w-full">
        {/* Header with View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8EBEF] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
              My Work
            </h1>
            <p className="text-xs text-[#60666F] mt-1">{subtitle}</p>
          </div>

          {/* Segmented View Switcher: [List] [Board] */}
          <div className="flex items-center gap-1 bg-[#F0F2F5] p-0.5 rounded-[8px] border border-[#E3E7EC] shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] font-medium transition-all',
                viewMode === 'list'
                  ? 'bg-white text-[#181B20] shadow-sm font-semibold'
                  : 'text-[#626A73] hover:text-[#181B20]',
              )}
              aria-pressed={viewMode === 'list'}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('board')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] font-medium transition-all',
                viewMode === 'board'
                  ? 'bg-white text-[#181B20] shadow-sm font-semibold'
                  : 'text-[#626A73] hover:text-[#181B20]',
              )}
              aria-pressed={viewMode === 'board'}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>
        </div>

        {/* Action Notice Alert */}
        {actionMessage && (
          <div
            role={actionMessage.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'rounded-[8px] border px-3 py-2 text-xs flex items-center justify-between gap-2 transition-all',
              actionMessage.type === 'error'
                ? 'border-[#B54747]/25 bg-[#FFF2F2] text-[#9F3535]'
                : actionMessage.type === 'info'
                  ? 'border-[#2563EB]/25 bg-[#EFF6FF] text-[#1E40AF]'
                  : 'border-[#237A57]/25 bg-[#EFF8F3] text-[#237A57]',
            )}
          >
            <span>{actionMessage.text}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-current hover:opacity-75 font-semibold text-xs px-1"
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {/* Status Filter Tabs (List View Only) */}
        {viewMode === 'list' && (
          <div className="border-b border-[#E3E7EC] pb-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                      ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold'
                      : 'text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA]',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Search, Filter & Toolbar Controls Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-[#929AA3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search deliverables by title, ID, or description..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E3E7EC] rounded-[8px] text-[#181B20] placeholder:text-[#929AA3] focus:outline-none focus:border-[#2563EB] transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
              aria-label="Filter by project"
            >
              <option value="">All Projects</option>
              {authorizedProjects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Workstream Filter */}
            <select
              value={workstreamFilter}
              onChange={(e) => setWorkstreamFilter(e.target.value as any)}
              className="h-8 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
              aria-label="Filter by workstream"
            >
              <option value="ALL">All Workstreams</option>
              <option value="DEVELOPMENT">Development</option>
              <option value="MARKETING">Marketing</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
              aria-label="Filter by priority"
            >
              <option value="">All Priorities</option>
              <option value={TaskPriority.URGENT}>Urgent</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.LOW}>Low</option>
            </select>

            {/* Group By Selector (List View Only) */}
            {viewMode === 'list' && (
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="h-8 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
                aria-label="Group tasks by"
              >
                <option value="workflow">Group: Workflow</option>
                <option value="project">Group: Project</option>
                <option value="priority">Group: Priority</option>
                <option value="none">Group: None</option>
              </select>
            )}
          </div>
        </div>

        {/* View Mode: BOARD VIEW */}
        {viewMode === 'board' ? (
          isLoading ? (
            <div className="py-12 text-center text-xs text-[#929AA3]">
              Loading Kanban board...
            </div>
          ) : (
            <MyWorkBoardView
              tasks={allTasks}
              user={user}
              onSelectTask={setSelectedTaskId}
              onStartWork={(task) =>
                startWorkMutation.mutate({
                  taskId: task.id,
                  projectId: task.projectId || task.project?.id,
                })
              }
              isStartingTaskId={
                startWorkMutation.isPending
                  ? (startWorkMutation.variables as any)?.taskId
                  : null
              }
              onActionNotice={(notice) => setActionMessage(notice)}
            />
          )
        ) : (
          /* View Mode: LIST VIEW (Preserved and Refined) */
          <>
            {isLoading ? (
              <div className="py-12 text-center text-xs text-[#929AA3]">
                Loading assigned tasks...
              </div>
            ) : allTasks.length === 0 ? (
              <div className="py-16 text-center space-y-2 max-w-sm mx-auto">
                <CheckCircle2 className="w-6 h-6 text-[#237A57] mx-auto" />
                <h3 className="text-sm font-semibold text-[#181B20]">
                  No tasks in this view
                </h3>
                <p className="text-xs text-[#626A73]">
                  {selectedTab === 'ALL'
                    ? 'No tasks are currently assigned to you matching the selected filters.'
                    : `No tasks found under the ${tabs.find((t) => t.id === selectedTab)?.label} tab.`}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedTasks.map((group: any) => {
                  if (group.items.length === 0) return null;

                  return (
                    <div key={group.groupName} className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#E3E7EC]">
                        {group.dotColor && (
                          <span className={cn('w-2 h-2 rounded-full', group.dotColor)} />
                        )}
                        <h2 className="text-[13px] font-semibold text-[#181B20]">
                          {group.groupName}
                        </h2>
                        <span className="text-xs font-mono text-[#929AA3]">
                          ({group.items.length})
                        </span>
                      </div>

                      <div className="divide-y divide-[#E3E7EC]">
                        {group.items.map((task: any) => {
                          const isOverdue =
                            task.dueDate &&
                            new Date(task.dueDate) < now &&
                            task.status !== TaskStatus.DONE;
                          const cleanId = formatTaskId(
                            task.humanId,
                            task.project?.key,
                            task.project?.name,
                          );
                          const unfinishedDeps = (task.blockedBy || []).filter(
                            (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                          );

                          return (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTaskId(task.id)}
                              className="py-3 hover:bg-[#F7F8FA] -mx-2 px-2.5 rounded-[8px] cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-medium text-[#929AA3] text-[11px] shrink-0 px-1.5 py-0.5 bg-[#F7F8FA] rounded-[4px] border border-[#E3E7EC]">
                                    {cleanId}
                                  </span>
                                  <span className="font-medium text-xs text-[#181B20] hover:text-[#2563EB] truncate transition-colors">
                                    {task.title}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-[#626A73]">
                                  <span>{task.project?.name}</span>
                                  <span className="text-[#B0B7C1]">·</span>
                                  <span>
                                    {task.workstream === 'MARKETING'
                                      ? 'Marketing'
                                      : 'Development'}
                                  </span>
                                  {task.milestone && (
                                    <>
                                      <span className="text-[#B0B7C1]">·</span>
                                      <span>{task.milestone.name}</span>
                                    </>
                                  )}
                                  {task.dueDate && (
                                    <span
                                      className={cn(
                                        'flex items-center gap-1 font-mono',
                                        isOverdue
                                          ? 'text-[#C24141] font-medium'
                                          : 'text-[#929AA3]',
                                      )}
                                    >
                                      <Calendar className="w-3 h-3" />
                                      {isOverdue ? 'Overdue: ' : 'Due '}
                                      {formatDate(task.dueDate)}
                                    </span>
                                  )}
                                  {task.status === TaskStatus.WAITING &&
                                    unfinishedDeps.length > 0 && (
                                      <span className="text-[#A86B12] font-medium">
                                        Related:{' '}
                                        {unfinishedDeps
                                          .map((b: any) =>
                                            formatTaskId(b.predecessorTask?.humanId),
                                          )
                                          .join(', ')}
                                      </span>
                                    )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                                {task.status === TaskStatus.IN_PROGRESS && (
                                  <div className="w-20 hidden sm:block">
                                    <Progress
                                      value={task.progress}
                                      showLabel={true}
                                      size="xs"
                                    />
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
          </>
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
