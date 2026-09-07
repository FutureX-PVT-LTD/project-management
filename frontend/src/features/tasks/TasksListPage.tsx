'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Inbox,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TaskStatus, TaskPriority } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { canCreateTask } from '@/lib/permissions';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export function TasksListPage() {
  const { user } = useAuth();
  const canCreate = canCreateTask(user);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', search, projectFilter, statusFilter, priorityFilter],
    queryFn: () =>
      api.get(
        `/tasks?search=${encodeURIComponent(search)}&projectId=${projectFilter}&status=${statusFilter}&priority=${priorityFilter}`,
      ),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const tasks = (tasksData as any[]) || [];
  const projects = (projectsData as any[]) || [];

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
              Task Registry
            </h1>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Comprehensive index of all deliverables across FutureX game studios.
            </p>
          </div>

          {canCreate && (
            <Link href="/projects">
              <Button size="sm" variant="primary" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Create from Project
              </Button>
            </Link>
          )}

        </div>

        {/* Filter Toolbar */}
        <div className="bg-white border border-fx-border rounded-lg p-2.5 flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search by title, ID or assignee..."
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
            className="h-8 rounded-md border border-fx-border bg-fx-bg px-2 text-xs text-fx-text-primary focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-fx-border bg-fx-bg px-2 text-xs text-fx-text-primary focus:border-[#2563EB] focus:outline-none"
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
            className="h-8 rounded-md border border-fx-border bg-fx-bg px-2 text-xs text-fx-text-primary focus:border-[#2563EB] focus:outline-none"
          >
            <option value="">All Priorities</option>
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>
                {p} Priority
              </option>
            ))}
          </select>
        </div>

        {/* Master Tasks Table */}
        {isLoading ? (
          <div className="bg-white border border-fx-border rounded-[8px] p-10 text-center text-xs text-fx-text-muted shadow-none">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-6 h-6 text-[#2563EB]" />}
            title="No tasks found"
            description="No deliverables match your search and filter criteria."
          />
        ) : (
          <div className="bg-white border border-fx-border rounded-[8px] overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">

                <thead>
                  <tr className="bg-fx-bg text-fx-text-secondary font-medium border-b border-fx-border">
                    <th className="py-2.5 px-4">Task ID & Title</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-4 text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60 text-fx-text-primary">
                  {tasks.map((task: any) => (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="hover:bg-fx-bg-hover cursor-pointer fx-transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-fx-text-muted shrink-0">
                            {task.humanId}
                          </span>
                          <span className="font-semibold text-fx-text-primary truncate max-w-sm">
                            {task.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-fx-text-secondary truncate max-w-[140px]">
                        {task.project?.name || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <StatusPill status={task.status} size="xs" />
                      </td>
                      <td className="py-3 px-3 text-fx-text-secondary">
                        {task.assignee
                          ? `${task.assignee.firstName} ${task.assignee.lastName}`
                          : 'Unassigned'}
                      </td>
                      <td className="py-3 px-3">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-3 px-3 w-28">
                        <Progress value={task.progress || 0} showLabel={true} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-fx-text-secondary">
                        {task.dueDate ? formatDate(task.dueDate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
