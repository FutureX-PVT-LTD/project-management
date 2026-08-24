'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  Search,
  Filter,
  Layers,
  Calendar,
  AlertCircle,
  Plus,
  Clock,
  Sparkles,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TaskStatus, TaskPriority, UserRole } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { TaskCreateModal } from '@/features/tasks/TaskCreateModal';
import { formatDate, cn } from '@/lib/utils';

export function MyWorkPage() {
  const { hasRole } = useAuth();
  const canCreateTask = hasRole(UserRole.OWNER, UserRole.ADMIN, UserRole.PROJECT_MANAGER);

  const [selectedTab, setSelectedTab] = useState<string>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'workflow' | 'status' | 'project' | 'priority' | 'none'>('workflow');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-work', selectedTab, search, projectFilter, priorityFilter],
    queryFn: () =>
      api.get(
        `/tasks/my-work?tab=${selectedTab}&search=${encodeURIComponent(search)}&projectId=${projectFilter}&priority=${priorityFilter}`,
      ),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const allTasks = (tasks as any[]) || [];

  const tabs = [
    { id: 'ALL', label: 'All Work' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'READY', label: 'Ready to Start' },
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
      const inProgress = allTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW);
      const ready = allTasks.filter((t) => t.status === TaskStatus.READY);
      const blocked = allTasks.filter((t) => t.status === TaskStatus.BLOCKED);
      const done = allTasks.filter((t) => t.status === TaskStatus.DONE);
      const other = allTasks.filter(
        (t) =>
          t.status !== TaskStatus.IN_PROGRESS &&
          t.status !== TaskStatus.IN_REVIEW &&
          t.status !== TaskStatus.READY &&
          t.status !== TaskStatus.BLOCKED &&
          t.status !== TaskStatus.DONE,
      );

      const groups = [];
      if (inProgress.length > 0) groups.push({ groupName: 'IN PROGRESS & REVIEW', items: inProgress, count: inProgress.length });
      if (ready.length > 0) groups.push({ groupName: 'READY TO START', items: ready, count: ready.length });
      if (blocked.length > 0) groups.push({ groupName: 'BLOCKED WORK', items: blocked, count: blocked.length });
      if (other.length > 0) groups.push({ groupName: 'UPCOMING / BACKLOG', items: other, count: other.length });
      if (done.length > 0) groups.push({ groupName: 'COMPLETED DELIVERABLES', items: done, count: done.length });
      return groups.length > 0 ? groups : [{ groupName: 'Assigned Work', items: [] }];
    }

    const map = new Map<string, any[]>();
    allTasks.forEach((task: any) => {
      let key = 'Other';
      if (groupBy === 'status') {
        key = task.status.replace('_', ' ');
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
      count: items.length,
    }));
  }, [allTasks, groupBy]);

  const now = new Date();

  return (
    <AppShell onOpenCreateTask={canCreateTask ? () => setCreateTaskOpen(true) : undefined}>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {canCreateTask && (
        <TaskCreateModal open={createTaskOpen} onOpenChange={setCreateTaskOpen} />
      )}

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fx-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">My Work</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-fx-green-50 text-fx-green-900 font-semibold border border-fx-green-100">
                {allTasks.length} {allTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Personal responsibilities, active assignments, and delivery deadlines.
            </p>
          </div>

          {canCreateTask && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setCreateTaskOpen(true)}
              className="gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> New Task
            </Button>
          )}
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-fx-border scrollbar-none text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap fx-transition select-none text-xs',
                selectedTab === tab.id
                  ? 'bg-fx-green-50 text-fx-green-900 font-semibold shadow-subtle'
                  : 'text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-subtle',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-fx-border shadow-card">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            {/* Search Input */}
            <div className="w-full sm:w-64">
              <Input
                placeholder="Filter tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="h-8 text-xs bg-fx-bg-subtle"
              />
            </div>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg-subtle px-2.5 text-xs text-fx-text-primary focus:border-fx-green-700 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg-subtle px-2.5 text-xs text-fx-text-primary focus:border-fx-green-700 focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Grouping Selector */}
          <div className="flex items-center gap-2 text-xs text-fx-text-muted">
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Group by:</span>
            <select
              value={groupBy}
              onChange={(e: any) => setGroupBy(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg-subtle px-2.5 text-xs text-fx-text-primary focus:border-fx-green-700 focus:outline-none"
            >
              <option value="workflow">Workflow Order</option>
              <option value="status">Status</option>
              <option value="project">Project</option>
              <option value="priority">Priority</option>
              <option value="none">Flat List</option>
            </select>
          </div>
        </div>

        {/* Task Groups / List */}
        {isLoading ? (
          <Card padding="lg" className="text-center text-xs text-fx-text-muted">
            Loading assigned tasks...
          </Card>
        ) : allTasks.length === 0 ? (
          <Card padding="none" className="bg-white">
            <EmptyState
              icon={<Inbox className="w-5 h-5 text-fx-green-700" />}
              title="No tasks match your filter"
              description="Everything assigned to you is currently complete, or no tasks matched your selected search criteria."
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedTasks.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-fx-text-muted">
                    {group.groupName}
                  </h2>
                  <span className="text-[11px] font-mono text-fx-text-muted font-medium">
                    {group.items?.length || 0}
                  </span>
                </div>

                <Card padding="none" className="bg-white">
                  <div className="divide-y divide-fx-border/60">
                    {group.items?.map((task: any) => {
                      const isOverdue =
                        task.dueDate &&
                        new Date(task.dueDate) < now &&
                        task.status !== TaskStatus.DONE;
                      const isBlocked = task.status === TaskStatus.BLOCKED;
                      const unfinishedDeps = (task.blockedBy || []).filter(
                        (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                      );

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className={cn(
                            'px-4 py-3.5 hover:bg-fx-bg-subtle cursor-pointer fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                            task.status === TaskStatus.READY && 'bg-fx-green-50/20',
                            isOverdue && 'bg-red-50/20',
                          )}
                        >
                          {/* Left: Task ID, Title, Project, Blocker */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-fx-text-muted text-[11px] shrink-0">
                                {task.humanId}
                              </span>
                              <span className="font-semibold text-fx-text-primary text-[13px] truncate">
                                {task.title}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-fx-text-muted">
                              <span>{task.project?.name}</span>
                              {task.milestone && <span>• {task.milestone.title}</span>}

                              {/* Blocker Alert */}
                              {isBlocked && (
                                <span className="text-fx-semantic-danger font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  {task.isManualBlocked
                                    ? `Blocked: ${task.manualBlockReason || 'Manual block'}`
                                    : unfinishedDeps.length > 0
                                      ? `Waiting for ${unfinishedDeps[0].predecessorTask.humanId}`
                                      : 'Prerequisites incomplete'}
                                </span>
                              )}

                              {task.status === TaskStatus.READY && (
                                <span className="text-fx-green-900 font-semibold flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-fx-green-700" />
                                  Ready to start
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Progress Track, Priority, Due Date, Status */}
                          <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
                            <div className="w-24 hidden md:block">
                              <Progress value={task.progress} showLabel={true} size="xs" />
                            </div>

                            <PriorityBadge priority={task.priority} />

                            <div className="flex items-center gap-1 text-[11px] min-w-[76px]">
                              <Calendar className="w-3 h-3 text-fx-text-muted shrink-0" />
                              <span
                                className={cn(
                                  isOverdue
                                    ? 'text-fx-semantic-danger font-bold'
                                    : 'text-fx-text-secondary font-medium',
                                )}
                              >
                                {formatDate(task.dueDate)}
                              </span>
                            </div>

                            <StatusPill status={task.status} size="xs" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
