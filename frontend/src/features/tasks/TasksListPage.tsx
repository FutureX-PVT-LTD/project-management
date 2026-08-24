'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  Search,
  Plus,
  Calendar,
  Link2,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TaskStatus, TaskPriority, UserRole } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { TaskCreateModal } from '@/features/tasks/TaskCreateModal';
import { formatDate, cn } from '@/lib/utils';

export function TasksListPage() {
  const { hasRole } = useAuth();
  const canCreateTask = hasRole(UserRole.OWNER, UserRole.ADMIN, UserRole.PROJECT_MANAGER);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['all-tasks', search, projectFilter, statusFilter, priorityFilter],
    queryFn: () =>
      api.get(
        `/tasks?search=${encodeURIComponent(search)}&projectId=${projectFilter}&status=${statusFilter}&priority=${priorityFilter}`,
      ),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const allTasks = (tasks as any[]) || [];
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fx-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">All Tasks</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-fx-green-50 text-fx-green-900 font-semibold border border-fx-green-100">
                {allTasks.length} {allTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Comprehensive task registry across all permitted projects.
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

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-fx-border shadow-card">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search by title, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="h-8 text-xs bg-fx-bg-subtle"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg-subtle px-2.5 text-xs text-fx-text-primary focus:border-fx-green-700 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.key} - {p.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg-subtle px-2.5 text-xs text-fx-text-primary focus:border-fx-green-700 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.values(TaskStatus).map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ')}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg-subtle px-2.5 text-xs text-fx-text-primary focus:border-fx-green-700 focus:outline-none"
            >
              <option value="">All Priorities</option>
              {Object.values(TaskPriority).map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Task Table */}
        <Card padding="none" className="bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-fx-text-muted">Loading tasks...</div>
          ) : allTasks.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-5 h-5 text-fx-green-700" />}
              title="No tasks found"
              description="No tasks match the active filters or you do not have permission to view them."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-fx-border bg-fx-bg-subtle/80 text-[11px] font-semibold uppercase tracking-wider text-fx-text-muted">
                    <th className="py-3 px-4 w-28">Task ID</th>
                    <th className="py-3 px-4">Task Name</th>
                    <th className="py-3 px-4 hidden md:table-cell">Project</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Priority</th>
                    <th className="py-3 px-4 hidden lg:table-cell w-28">Progress</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Due Date</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60">
                  {allTasks.map((task: any) => {
                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate) < now &&
                      task.status !== TaskStatus.DONE;

                    return (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="hover:bg-fx-bg-subtle cursor-pointer fx-transition"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-fx-text-muted text-[11px] whitespace-nowrap">
                          {task.humanId}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-fx-text-primary text-[13px] line-clamp-1">
                            {task.title}
                          </p>
                          {task.milestone && (
                            <p className="text-[11px] text-fx-text-muted">{task.milestone.title}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell text-fx-text-secondary whitespace-nowrap">
                          <span className="font-medium">{task.project?.name}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={task.assignee.avatarUrl}
                                firstName={task.assignee.firstName}
                                lastName={task.assignee.lastName}
                                size="xs"
                              />
                              <span className="text-fx-text-primary font-medium">
                                {task.assignee.firstName} {task.assignee.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-fx-text-muted italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell whitespace-nowrap">
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell whitespace-nowrap">
                          <Progress value={task.progress} showLabel={true} size="xs" />
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell whitespace-nowrap">
                          <span
                            className={cn(
                              'text-[11px]',
                              isOverdue
                                ? 'text-fx-semantic-danger font-bold'
                                : 'text-fx-text-secondary',
                            )}
                          >
                            {formatDate(task.dueDate)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <StatusPill status={task.status} size="xs" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
