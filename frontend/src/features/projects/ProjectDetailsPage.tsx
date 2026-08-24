'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  FolderKanban,
  CheckSquare,
  LayoutGrid,
  Calendar,
  Paperclip,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Upload,
  Link2,
  Users,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
  Search,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import {
  TaskStatus,
  TaskPriority,
  ProjectHealth,
  ProjectStatus,
  UserRole,
} from '@futurex/shared';
import { HealthBadge } from '@/components/ui/HealthBadge';
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
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';

export function ProjectDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();

  const projectId = params.id as string;
  const initialTaskId = searchParams.get('taskId');

  const [selectedTab, setSelectedTab] = useState<'overview' | 'tasks' | 'board' | 'timeline' | 'files'>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [newUpdateNote, setNewUpdateNote] = useState('');
  const [newUpdateHealth, setNewUpdateHealth] = useState<ProjectHealth>(ProjectHealth.ON_TRACK);
  const [taskSearch, setTaskSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch Project Details
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  // Fetch Project Tasks
  const { data: tasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ['projectTasks', projectId, taskSearch, statusFilter],
    queryFn: () =>
      api.get(
        `/tasks?projectId=${projectId}&search=${encodeURIComponent(taskSearch)}&status=${statusFilter}`,
      ),
    enabled: !!projectId,
  });

  // Fetch Project Files
  const { data: files } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => api.get(`/files/project/${projectId}`),
    enabled: !!projectId && selectedTab === 'files',
  });

  // Post Project Update Mutation
  const postUpdateMutation = useMutation({
    mutationFn: (dto: any) => api.post(`/projects/${projectId}/updates`, dto),
    onSuccess: () => {
      setNewUpdateNote('');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const allTasks = (tasks as any[]) || [];
  const blockedTasks = allTasks.filter((t: any) => t.status === TaskStatus.BLOCKED);
  const inProgressTasks = allTasks.filter((t: any) => t.status === TaskStatus.IN_PROGRESS);
  const completedTasks = allTasks.filter((t: any) => t.status === TaskStatus.DONE);
  const now = new Date();
  const overdueTasks = allTasks.filter(
    (t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE,
  );

  const canManage =
    hasRole(UserRole.OWNER, UserRole.ADMIN) ||
    (user?.globalRole === UserRole.PROJECT_MANAGER && project?.projectManagerId === user?.id);

  const boardColumns = [
    { id: TaskStatus.BACKLOG, title: 'Backlog' },
    { id: TaskStatus.TODO, title: 'To Do' },
    { id: TaskStatus.READY, title: 'Ready' },
    { id: TaskStatus.IN_PROGRESS, title: 'In Progress' },
    { id: TaskStatus.IN_REVIEW, title: 'In Review' },
    { id: TaskStatus.BLOCKED, title: 'Blocked' },
    { id: TaskStatus.DONE, title: 'Done' },
  ];

  if (isProjectLoading || !project) {
    return (
      <AppShell>
        <div className="p-16 text-center text-xs text-fx-text-muted">
          Loading project workspace...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell onOpenCreateTask={canManage ? () => setCreateTaskOpen(true) : undefined}>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {canManage && (
        <TaskCreateModal
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          defaultProjectId={projectId}
        />
      )}

      <div className="space-y-6">
        {/* Project Header */}
        <div className="bg-white rounded-[10px] border border-fx-border p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-md bg-fx-green-700 text-white font-bold text-sm flex items-center justify-center font-mono shrink-0 shadow-subtle">
                {project.key}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
                    {project.name}
                  </h1>
                  <HealthBadge health={project.health} reason={project.healthReason} />
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-fx-bg-subtle text-fx-text-secondary border border-fx-border uppercase tracking-wider">
                    {project.status}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-fx-text-secondary max-w-3xl leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setCreateTaskOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </Button>
              </div>
            )}
          </div>

          {/* Sub Header Meta Info */}
          <div className="pt-3.5 border-t border-fx-border/60 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-6 text-fx-text-secondary">
              <div className="flex items-center gap-2">
                <span className="text-fx-text-muted">Manager:</span>
                <Avatar
                  src={project.projectManager?.avatarUrl}
                  firstName={project.projectManager?.firstName}
                  lastName={project.projectManager?.lastName}
                  size="xs"
                />
                <span className="font-semibold text-fx-text-primary">
                  {project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : 'Unassigned'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>{project.members?.length || 0} Team Members</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>Target: {formatDate(project.targetDate)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-48">
              <span className="text-fx-text-muted font-medium shrink-0">Progress:</span>
              <Progress value={project.progress} size="xs" showLabel={true} />
            </div>
          </div>
        </div>

        {/* Project Horizontal Underline Tabs */}
        <div className="border-b border-fx-border flex gap-6 text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSelectedTab('overview')}
            className={cn(
              'pb-3 border-b-2 fx-transition flex items-center gap-1.5 whitespace-nowrap text-xs',
              selectedTab === 'overview'
                ? 'border-fx-green-700 text-fx-green-900 font-bold'
                : 'border-transparent text-fx-text-muted hover:text-fx-text-primary',
            )}
          >
            <FolderKanban className="w-3.5 h-3.5" /> Overview
          </button>
          <button
            onClick={() => setSelectedTab('tasks')}
            className={cn(
              'pb-3 border-b-2 fx-transition flex items-center gap-1.5 whitespace-nowrap text-xs',
              selectedTab === 'tasks'
                ? 'border-fx-green-700 text-fx-green-900 font-bold'
                : 'border-transparent text-fx-text-muted hover:text-fx-text-primary',
            )}
          >
            <CheckSquare className="w-3.5 h-3.5" /> Tasks List ({allTasks.length})
          </button>
          <button
            onClick={() => setSelectedTab('board')}
            className={cn(
              'pb-3 border-b-2 fx-transition flex items-center gap-1.5 whitespace-nowrap text-xs',
              selectedTab === 'board'
                ? 'border-fx-green-700 text-fx-green-900 font-bold'
                : 'border-transparent text-fx-text-muted hover:text-fx-text-primary',
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Board
          </button>
          <button
            onClick={() => setSelectedTab('timeline')}
            className={cn(
              'pb-3 border-b-2 fx-transition flex items-center gap-1.5 whitespace-nowrap text-xs',
              selectedTab === 'timeline'
                ? 'border-fx-green-700 text-fx-green-900 font-bold'
                : 'border-transparent text-fx-text-muted hover:text-fx-text-primary',
            )}
          >
            <Calendar className="w-3.5 h-3.5" /> Timeline
          </button>
          <button
            onClick={() => setSelectedTab('files')}
            className={cn(
              'pb-3 border-b-2 fx-transition flex items-center gap-1.5 whitespace-nowrap text-xs',
              selectedTab === 'files'
                ? 'border-fx-green-700 text-fx-green-900 font-bold'
                : 'border-transparent text-fx-text-muted hover:text-fx-text-primary',
            )}
          >
            <Paperclip className="w-3.5 h-3.5" /> Files
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* 4 Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-[10px] border border-fx-border shadow-card">
                <span className="text-[11px] text-fx-text-muted font-medium block">Total Tasks</span>
                <span className="text-xl font-bold text-fx-text-primary mt-0.5 block">
                  {allTasks.length}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-[10px] border border-[#C6E4D3] bg-fx-green-50/50 shadow-card">
                <span className="text-[11px] text-fx-green-900 font-semibold block">Completed</span>
                <span className="text-xl font-bold text-fx-green-900 mt-0.5 block">
                  {completedTasks.length}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-[10px] border border-[#FAD3D3] bg-[#FDF2F2]/50 shadow-card">
                <span className="text-[11px] text-fx-semantic-danger font-semibold block">Blocked Tasks</span>
                <span className="text-xl font-bold text-fx-semantic-danger mt-0.5 block">
                  {blockedTasks.length}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-[10px] border border-fx-border shadow-card">
                <span className="text-[11px] text-fx-text-muted font-medium block">Overdue Tasks</span>
                <span className="text-xl font-bold text-fx-semantic-danger mt-0.5 block">
                  {overdueTasks.length}
                </span>
              </div>
            </div>

            {/* Blocked Tasks Callout Alert */}
            {blockedTasks.length > 0 && (
              <div className="p-4 bg-[#FDF2F2]/70 border border-[#FAD3D3] rounded-[10px] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-fx-semantic-danger">
                  <AlertCircle className="w-4 h-4 text-fx-semantic-danger" />
                  {blockedTasks.length} Tasks currently blocked in this project
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {blockedTasks.map((t: any) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="p-2.5 bg-white rounded-md border border-[#FAD3D3] cursor-pointer hover:border-red-400 fx-transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-fx-text-muted font-bold text-[11px]">
                          {t.humanId}
                        </span>
                        <span className="truncate font-medium text-fx-text-primary text-xs">
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-fx-text-muted shrink-0 ml-2">
                        {t.assignee?.firstName || 'Unassigned'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 65% / 35% Grid for Milestones & PM Updates */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left (8 cols): Milestones Progression */}
              <div className="lg:col-span-8 space-y-6">
                <Card padding="none" className="bg-white">
                  <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-fx-text-primary">
                      Milestone Roadmap
                    </h2>
                    <span className="text-[11px] text-fx-text-muted font-mono font-medium">
                      {project.milestones?.length || 0} Milestones
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {project.milestones?.length === 0 ? (
                      <p className="text-xs text-fx-text-muted text-center py-4">
                        No milestones defined yet.
                      </p>
                    ) : (
                      project.milestones?.map((m: any, idx: number) => (
                        <div
                          key={m.id}
                          className="relative pl-6 pb-4 border-l-2 border-fx-border last:border-transparent last:pb-0"
                        >
                          <div
                            className={cn(
                              'absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-2 bg-white flex items-center justify-center text-[9px] font-bold',
                              m.status === 'COMPLETED'
                                ? 'border-fx-green-700 bg-fx-green-50 text-fx-green-900'
                                : m.status === 'IN_PROGRESS'
                                  ? 'border-[#3578C9] bg-blue-50 text-[#205896]'
                                  : 'border-[#CDD5D0] text-fx-text-muted',
                            )}
                          >
                            {idx + 1}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm text-fx-text-primary">
                                  {m.name}
                                </h3>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-fx-bg-subtle text-fx-text-muted border border-fx-border">
                                  {m.status}
                                </span>
                              </div>
                              <p className="text-xs text-fx-text-secondary mt-0.5">
                                {m.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-fx-text-muted font-medium">
                                Target: {formatDate(m.targetDate)}
                              </span>
                              <div className="w-24">
                                <Progress value={m.progress} size="xs" showLabel={true} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Right (4 cols): PM Delivery Updates */}
              <div className="lg:col-span-4 space-y-6">
                <Card padding="none" className="bg-white">
                  <div className="px-4 py-3.5 border-b border-fx-border">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-muted">
                      PM Delivery Updates
                    </h3>
                  </div>

                  {canManage && (
                    <div className="p-3.5 border-b border-fx-border bg-fx-bg-subtle space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-fx-text-secondary">Health:</span>
                        <select
                          value={newUpdateHealth}
                          onChange={(e: any) => setNewUpdateHealth(e.target.value)}
                          className="bg-white border border-fx-border rounded-md px-2 py-1 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green-700"
                        >
                          {Object.values(ProjectHealth).map((h) => (
                            <option key={h} value={h}>
                              {h.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Post a status update on blockers, progress, or delivery..."
                        value={newUpdateNote}
                        onChange={(e) => setNewUpdateNote(e.target.value)}
                        className="w-full p-2.5 rounded-md border border-fx-border bg-white text-xs focus:outline-none focus:border-fx-green-700"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="xs"
                          variant="primary"
                          disabled={!newUpdateNote.trim()}
                          onClick={() =>
                            postUpdateMutation.mutate({
                              health: newUpdateHealth,
                              note: newUpdateNote,
                            })
                          }
                          isLoading={postUpdateMutation.isPending}
                        >
                          Post Update
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-fx-border/60 p-2">
                    {project.updates?.length === 0 ? (
                      <p className="p-6 text-center text-xs text-fx-text-muted">
                        No updates posted yet.
                      </p>
                    ) : (
                      project.updates?.map((u: any) => (
                        <div key={u.id} className="p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Avatar
                                src={u.author?.avatarUrl}
                                firstName={u.author?.firstName}
                                size="xs"
                              />
                              <span className="font-semibold text-fx-text-primary">
                                {u.author?.firstName} {u.author?.lastName}
                              </span>
                            </div>
                            <span className="text-[11px] text-fx-text-muted">
                              {formatTimeAgo(u.createdAt)}
                            </span>
                          </div>
                          <p className="text-fx-text-secondary pl-5 leading-relaxed">{u.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TASKS LIST VIEW */}
        {selectedTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-fx-border shadow-card text-xs">
              <div className="w-64">
                <Input
                  placeholder="Filter project tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                  className="h-8 text-xs bg-fx-bg-subtle"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 bg-fx-bg-subtle border border-fx-border rounded-md px-2.5 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green-700"
                >
                  <option value="">All Statuses</option>
                  {Object.values(TaskStatus).map((st) => (
                    <option key={st} value={st}>
                      {st.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Card padding="none" className="bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-fx-bg-subtle/80 text-fx-text-muted border-b border-fx-border select-none text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 w-28">Task ID</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Assignee</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Dependencies</th>
                      <th className="px-4 py-3 w-28">Progress</th>
                      <th className="px-4 py-3">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fx-border/60">
                    {allTasks.map((task: any) => {
                      const isOverdue =
                        task.dueDate &&
                        new Date(task.dueDate) < now &&
                        task.status !== TaskStatus.DONE;
                      const hasDeps = task.blockedBy && task.blockedBy.length > 0;

                      return (
                        <tr
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className={cn(
                            'hover:bg-fx-bg-subtle cursor-pointer fx-transition',
                            task.status === TaskStatus.READY && 'bg-fx-green-50/20',
                          )}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-fx-text-muted text-[11px]">
                            {task.humanId}
                          </td>
                          <td className="px-4 py-3 font-semibold text-fx-text-primary text-[13px] max-w-xs truncate">
                            {task.title}
                          </td>
                          <td className="px-4 py-3 text-fx-text-secondary whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Avatar
                                src={task.assignee?.avatarUrl}
                                firstName={task.assignee?.firstName}
                                lastName={task.assignee?.lastName}
                                size="xs"
                              />
                              <span>
                                {task.assignee
                                  ? `${task.assignee.firstName} ${task.assignee.lastName}`
                                  : 'Unassigned'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusPill status={task.status} size="xs" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <PriorityBadge priority={task.priority} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {hasDeps ? (
                              <span className="text-fx-semantic-danger font-mono text-[11px] font-semibold flex items-center gap-1">
                                <Link2 className="w-3 h-3" />
                                {task.blockedBy.map((b: any) => b.predecessorTask?.humanId).join(', ')}
                              </span>
                            ) : (
                              <span className="text-fx-text-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Progress value={task.progress} size="xs" showLabel={true} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={cn(
                                isOverdue
                                  ? 'text-fx-semantic-danger font-bold'
                                  : 'text-fx-text-secondary',
                              )}
                            >
                              {formatDate(task.dueDate)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: BOARD KANBAN VIEW */}
        {selectedTab === 'board' && (
          <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px] scrollbar-none">
            {boardColumns.map((col) => {
              const colTasks = allTasks.filter((t: any) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="w-[280px] bg-fx-bg-subtle rounded-[10px] border border-fx-border p-3 flex flex-col shrink-0 space-y-3"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="font-bold text-[11px] text-fx-text-primary uppercase tracking-wider">
                      {col.title}
                    </span>
                    <span className="font-mono text-[11px] font-semibold bg-white border border-fx-border px-2 py-0.5 rounded-full text-fx-text-muted">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 min-h-32">
                    {colTasks.map((task: any) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="bg-white p-3 rounded-[8px] border border-fx-border shadow-card hover:border-fx-green-700/60 cursor-pointer fx-transition space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-fx-text-muted text-[11px]">
                            {task.humanId}
                          </span>
                          <PriorityBadge priority={task.priority} showLabel={false} />
                        </div>

                        <p className="font-semibold text-fx-text-primary text-[13px] line-clamp-2 leading-snug">
                          {task.title}
                        </p>

                        <div className="pt-2 border-t border-fx-border/60 flex items-center justify-between text-fx-text-muted">
                          <Avatar
                            src={task.assignee?.avatarUrl}
                            firstName={task.assignee?.firstName}
                            size="xs"
                          />
                          <span className="text-[11px] font-medium">{formatDate(task.dueDate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: TIMELINE */}
        {selectedTab === 'timeline' && (
          <Card padding="md" className="bg-white space-y-6 overflow-x-auto">
            <div>
              <h2 className="text-sm font-semibold text-fx-text-primary">
                Project Execution Timeline
              </h2>
              <p className="text-xs text-fx-text-muted mt-0.5">
                Visual finish-to-start deliverable timeline and milestone markers.
              </p>
            </div>

            <div className="space-y-4 min-w-[700px]">
              {allTasks.map((task: any) => {
                const hasDeps = task.blockedBy && task.blockedBy.length > 0;
                return (
                  <div key={task.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-fx-text-muted text-[11px]">
                          {task.humanId}
                        </span>
                        <span className="font-semibold text-fx-text-primary">{task.title}</span>
                        {hasDeps && (
                          <span className="text-[10px] bg-red-50 text-fx-semantic-danger px-1.5 rounded font-mono">
                            Depends on {task.blockedBy.map((b: any) => b.predecessorTask?.humanId).join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="text-fx-text-muted font-mono">{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} size="xs" />
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* TAB 5: FILES */}
        {selectedTab === 'files' && (
          <Card padding="md" className="bg-white space-y-4">
            <h2 className="text-sm font-semibold text-fx-text-primary">Project Attachments</h2>
            <div className="space-y-2 text-xs">
              {files?.length === 0 ? (
                <p className="text-fx-text-muted p-8 text-center">
                  No files uploaded in this project yet.
                </p>
              ) : (
                files?.map((f: any) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-md border border-fx-border flex items-center justify-between bg-fx-bg-subtle"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-fx-text-muted" />
                      <div>
                        <p className="font-semibold text-fx-text-primary">{f.fileName}</p>
                        <p className="text-[11px] text-fx-text-muted">
                          {(f.fileSize / 1024).toFixed(1)} KB • Uploaded by {f.uploader?.firstName}
                        </p>
                      </div>
                    </div>
                    <a
                      href={f.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fx-green-700 font-semibold hover:underline"
                    >
                      Download
                    </a>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
