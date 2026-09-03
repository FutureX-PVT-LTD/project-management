'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Calendar,
  AlertCircle,
  Inbox,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TaskStatus, TaskPriority } from '@futurex/shared';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { formatDate, cn } from '@/lib/utils';

export function MyWorkPage() {
  const [selectedTab, setSelectedTab] = useState<string>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'workflow' | 'status' | 'project' | 'priority' | 'none'>('workflow');


  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-work', selectedTab, search, projectFilter, statusFilter, priorityFilter],
    queryFn: () =>
      api.get(
        `/tasks/my-work?tab=${selectedTab}&search=${encodeURIComponent(search)}&projectId=${projectFilter}&status=${statusFilter}&priority=${priorityFilter}`,
      ),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const allProjects = (projectsData as any[]) || [];
  const allTasks = (tasks as any[]) || [];

  const tabs = [
    { id: 'ALL', label: 'All Work' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'READY', label: 'Ready to Start' },
    { id: 'WAITING', label: 'Waiting on Others' },
    { id: 'REVIEW', label: 'In Review' },
    { id: 'BLOCKED', label: 'Blocked' },
    { id: 'DUE_SOON', label: 'Due Soon' },
    { id: 'OVERDUE', label: 'Overdue' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  // Grouping logic
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return [{ groupName: 'Assigned Work', items: allTasks }];
    }

    if (groupBy === 'workflow') {
      const inProgress = allTasks.filter(
        (t) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW,
      );
      const ready = allTasks.filter((t) => t.status === TaskStatus.READY);
      const waiting = allTasks.filter((t) => t.status === TaskStatus.WAITING);
      const blocked = allTasks.filter((t) => t.status === TaskStatus.BLOCKED);
      const done = allTasks.filter((t) => t.status === TaskStatus.DONE);
      const other = allTasks.filter(
        (t) =>
          t.status !== TaskStatus.IN_PROGRESS &&
          t.status !== TaskStatus.IN_REVIEW &&
          t.status !== TaskStatus.READY &&
          t.status !== TaskStatus.WAITING &&
          t.status !== TaskStatus.BLOCKED &&
          t.status !== TaskStatus.DONE,
      );

      const groups = [];
      if (inProgress.length > 0)
        groups.push({ groupName: 'IN PROGRESS & IN REVIEW', items: inProgress });
      if (ready.length > 0)
        groups.push({ groupName: 'READY TO START', items: ready });
      if (waiting.length > 0)
        groups.push({ groupName: 'WAITING ON PREREQUISITES', items: waiting });
      if (blocked.length > 0)
        groups.push({ groupName: 'MANUALLY BLOCKED', items: blocked });
      if (other.length > 0)
        groups.push({ groupName: 'UPCOMING / BACKLOG', items: other });
      if (done.length > 0)
        groups.push({ groupName: 'COMPLETED DELIVERABLES', items: done });

      return groups.length > 0 ? groups : [{ groupName: 'Assigned Work', items: [] }];
    }

    const map = new Map<string, any[]>();
    allTasks.forEach((task: any) => {
      let key = 'Other';
      if (groupBy === 'status') {
        key = task.status.replace(/_/g, ' ');
      } else if (groupBy === 'project') {
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

  return (
    <AppShell>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
            My Work
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            Your assigned deliverables across FutureX game projects.
          </p>
        </div>

        {/* Status Filter Tabs (Text + subtle active border) */}
        <div className="border-b border-fx-border flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px fx-transition',
                  isActive
                    ? 'border-fx-green text-fx-green-dark font-semibold'
                    : 'border-transparent text-fx-text-secondary hover:text-fx-text-primary hover:border-fx-border',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filter & Group Toolbar */}
        <div className="bg-white border border-fx-border rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            {/* Search Input */}
            <div className="w-full sm:w-60">
              <Input
                placeholder="Filter tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="h-8 text-xs bg-fx-bg"
              />
            </div>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg px-2 text-xs text-fx-text-primary focus:border-fx-green focus:outline-none"
            >
              <option value="">All Projects</option>
              {allProjects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg px-2 text-xs text-fx-text-primary focus:border-fx-green focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.values(TaskStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg px-2 text-xs text-fx-text-primary focus:border-fx-green focus:outline-none"
            >
              <option value="">All Priorities</option>
              {Object.values(TaskPriority).map((p) => (
                <option key={p} value={p}>
                  {p} Priority
                </option>
              ))}
            </select>
          </div>

          {/* Group By selector */}
          <div className="flex items-center gap-1.5 text-xs text-fx-text-secondary">
            <span className="text-[11px] text-fx-text-muted">Group by:</span>
            <select
              value={groupBy}
              onChange={(e: any) => setGroupBy(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg px-2 text-xs text-fx-text-primary font-medium focus:border-fx-green focus:outline-none"
            >
              <option value="workflow">Workflow Order</option>
              <option value="status">Status</option>
              <option value="project">Project</option>
              <option value="priority">Priority</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        {/* Task List Groups */}
        {isLoading ? (
          <div className="bg-white border border-fx-border rounded-lg p-10 text-center text-xs text-fx-text-muted">
            Loading assigned tasks...
          </div>
        ) : allTasks.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-6 h-6 text-fx-green" />}
            title="No assigned tasks found"
            description="No work matched your active search and filter criteria."
          />
        ) : (
          <div className="space-y-5">
            {groupedTasks.map((group) => (
              <div
                key={group.groupName}
                className="bg-white border border-fx-border rounded-lg overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-fx-bg border-b border-fx-border flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">
                    {group.groupName}
                  </h2>
                  <span className="text-[11px] font-mono font-medium text-fx-text-muted">
                    {group.items.length} tasks
                  </span>
                </div>

                <div className="divide-y divide-fx-border/60">
                  {group.items.map((task: any) => {
                    const isWaiting = task.status === TaskStatus.WAITING;
                    const unfinishedDeps = (task.blockedBy || []).filter(
                      (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                    );

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={cn(
                          'p-3.5 sm:p-4 hover:bg-fx-bg-hover cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                          isWaiting && 'hover:bg-amber-50/20',
                        )}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-fx-text-muted text-[11px] shrink-0">
                              {task.humanId}
                            </span>
                            <span
                              className={cn(
                                'font-semibold text-[13px] truncate',
                                task.status === TaskStatus.DONE
                                  ? 'line-through text-fx-text-muted'
                                  : 'text-fx-text-primary',
                              )}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fx-text-secondary">
                            <span className="font-medium text-fx-text-primary">
                              {task.project?.name}
                            </span>
                            {task.milestone && <span>• {task.milestone.name}</span>}
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-fx-text-muted">
                                <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                              </span>
                            )}
                            {isWaiting && unfinishedDeps.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60 font-medium">
                                <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                Waiting for: {unfinishedDeps.map((d: any) => `${d.predecessorTask?.humanId} · ${d.predecessorTask?.title}`).join(', ')}
                              </span>
                            )}
                            {task.status === TaskStatus.BLOCKED && (
                              <span className="text-fx-semantic-danger font-medium flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-200/60">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                {task.manualBlockReason ? `Blocked: ${task.manualBlockReason}` : 'Manually blocked'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side: Progress, Priority, Due Date, Status */}
                        <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                          {task.status === TaskStatus.IN_PROGRESS && (
                            <div className="w-20 hidden md:block">
                              <Progress value={task.progress} showLabel={true} size="xs" />
                            </div>
                          )}
                          <PriorityBadge priority={task.priority} />
                          <StatusPill status={task.status} size="xs" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
