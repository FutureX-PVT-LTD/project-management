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

function MyWorkContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'ALL';
  const queryClient = useQueryClient();

  const [selectedTab, setSelectedTab] = useState<string>(initialTab);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'workflow' | 'project' | 'priority' | 'none'>('workflow');

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['my-work', selectedTab, search, projectFilter, priorityFilter],
    queryFn: () =>
      api.get(
        `/tasks/my-work?tab=${selectedTab}&search=${encodeURIComponent(search)}&projectId=${projectFilter}&priority=${priorityFilter}`,
      ),
  });

  // Fetch projects for filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  // Start Work Mutation
  const startWorkMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.patch(`/tasks/${taskId}`, { status: TaskStatus.IN_PROGRESS }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const allProjects = asArray<any>(projectsData);
  const allTasks = asArray<any>(tasksData);
  const now = new Date();

  const tabs = [
    { id: 'ALL', label: 'All' },
    { id: 'READY', label: 'Ready' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'WAITING', label: 'Waiting' },
    { id: 'BLOCKED', label: 'Blocked' },
    { id: 'REVIEW', label: 'Review' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  // Canonical default grouping: NEEDS ATTENTION -> IN PROGRESS -> READY TO START -> WAITING -> UPCOMING -> COMPLETED
  const groupedTasks = useMemo(() => {
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
        groups.push({ groupName: 'Needs Attention', items: needsAttention, dotColor: 'bg-[#C24141]' });
      if (inProgress.length > 0)
        groups.push({ groupName: 'In Progress', items: inProgress, dotColor: 'bg-[#0077E6]' });
      if (ready.length > 0)
        groups.push({ groupName: 'Ready to Start', items: ready, dotColor: 'bg-[#248A5B]' });
      if (waiting.length > 0)
        groups.push({ groupName: 'Waiting on Prerequisites', items: waiting, dotColor: 'bg-[#A96F12]' });
      if (upcoming.length > 0)
        groups.push({ groupName: 'Upcoming', items: upcoming, dotColor: 'bg-[#92979E]' });
      if (done.length > 0)
        groups.push({ groupName: 'Completed', items: done, dotColor: 'bg-[#248A5B]' });

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
  }, [allTasks, groupBy, now]);

  // Render single dominant action per task card
  const renderTaskAction = (task: any) => {
    switch (task.status) {
      case TaskStatus.READY:
        return (
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
            Update Progress
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

  const waitingCount = allTasks.filter((t) => t.status === TaskStatus.WAITING).length;
  const inProgressCount = allTasks.filter(
    (t) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW,
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

      <div className="space-y-8 w-full">
        {/* Header */}
        <div className="border-b border-[#E4E7EB] pb-6">
          <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-[#15171A]">
            My Work
          </h1>
          <p className="text-sm text-[#5F6368] mt-1">
            {subtitle}
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="border-b border-[#E4E7EB] pb-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={cn(
                  'px-3.5 py-2 text-xs font-medium whitespace-nowrap rounded-[6px] fx-transition',
                  isActive
                    ? 'bg-[#EEF4F7] text-[#0068CC] font-semibold'
                    : 'text-[#5F6368] hover:text-[#15171A] hover:bg-[#F8F9FA]',
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
              <Search className="w-3.5 h-3.5 text-[#92979E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks by title, ID, or description..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#E4E7EB] rounded-[10px] text-[#15171A] placeholder:text-[#92979E] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#0088FF] focus:border-[#0088FF] fx-transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 rounded-[8px] border border-[#E4E7EB] bg-[#F8F9FA] px-2.5 text-xs text-[#15171A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0088FF] focus:border-[#0088FF]"
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
              className="h-8 rounded-[8px] border border-[#E4E7EB] bg-[#F8F9FA] px-2.5 text-xs text-[#15171A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0088FF] focus:border-[#0088FF]"
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
              className="h-8 rounded-[8px] border border-[#E4E7EB] bg-[#F8F9FA] px-2.5 text-xs text-[#15171A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0088FF] focus:border-[#0088FF]"
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
          <div className="py-12 text-center text-xs text-[#92979E]">
            Loading assigned tasks...
          </div>
        ) : allTasks.length === 0 ? (
          <div className="py-16 text-center space-y-2 max-w-sm mx-auto">
            <CheckCircle2 className="w-6 h-6 text-[#248A5B] mx-auto" />
            <h3 className="text-sm font-semibold text-[#15171A]">No tasks in this view</h3>
            <p className="text-xs text-[#5F6368]">
              {selectedTab === 'ALL'
                ? 'No tasks are currently assigned to you.'
                : `No tasks found under the ${tabs.find((t) => t.id === selectedTab)?.label} tab.`}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedTasks.map((group: any) => {
              if (group.items.length === 0) return null;

              return (
                <div key={group.groupName} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E4E7EB]">
                    {group.dotColor && (
                      <span className={cn('w-2 h-2 rounded-full', group.dotColor)} />
                    )}
                    <h2 className="text-[14px] font-semibold text-[#15171A]">
                      {group.groupName}
                    </h2>
                    <span className="text-xs font-mono text-[#92979E]">
                      ({group.items.length})
                    </span>
                  </div>

                  <div className="divide-y divide-[#E4E7EB]">
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
                          className="py-3.5 hover:bg-[#F8F9FA] -mx-2 px-2 rounded-[8px] cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-[#92979E] text-[11px] shrink-0 px-1.5 py-0.5 bg-[#F8F9FA] rounded-[6px] border border-[#E4E7EB]">
                                {cleanId}
                              </span>
                              <span className="font-medium text-sm text-[#15171A] hover:text-[#0088FF] truncate fx-transition">
                                {task.title}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-[#5F6368]">
                              <span>{task.project?.name}</span>
                              {task.milestone && <span>• {task.milestone.name}</span>}
                              {task.dueDate && (
                                <span
                                  className={cn(
                                    'flex items-center gap-1 font-medium',
                                    isOverdue ? 'text-[#C24141] font-semibold' : 'text-[#92979E]',
                                  )}
                                >
                                  <Calendar className="w-3 h-3" />
                                  {isOverdue ? 'Overdue: ' : 'Due '}
                                  {formatDate(task.dueDate)}
                                </span>
                              )}
                              {task.status === TaskStatus.WAITING && unfinishedDeps.length > 0 && (
                                <span className="text-[#A96F12] font-medium">
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
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="h-6 w-6 border-2 border-[#0088FF] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MyWorkContent />
    </Suspense>
  );
}
