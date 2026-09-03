'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  CheckSquare,
  GanttChartSquare,
  Users,
  Plus,
  Calendar,
  AlertCircle,
  Lock,
  FileText,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TaskStatus, ProjectHealth } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { canManageProjects } from '@/lib/permissions';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

interface ProjectDetailsPageProps {
  projectId?: string;
}

export function ProjectDetailsPage({ projectId: propProjectId }: ProjectDetailsPageProps = {}) {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = propProjectId || (params?.id as string) || '';

  const { user } = useAuth();
  const canManage = canManageProjects(user);

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'board' | 'calendar' | 'timeline' | 'files' | 'activity'>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch Project Details
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const project = projectData as any;
  const tasks = (project?.tasks || []) as any[];
  const milestones = (project?.milestones || []) as any[];
  const members = (project?.members || []) as any[];

  // Board columns
  const boardColumns = [
    { id: TaskStatus.TODO, label: 'To Do', color: 'bg-gray-400' },
    { id: TaskStatus.WAITING, label: 'Waiting', color: 'bg-amber-500' },
    { id: TaskStatus.READY, label: 'Ready to Start', color: 'bg-fx-green' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-blue-500' },
    { id: TaskStatus.IN_REVIEW, label: 'In Review', color: 'bg-purple-500' },
    { id: TaskStatus.BLOCKED, label: 'Blocked', color: 'bg-red-500' },
    { id: TaskStatus.DONE, label: 'Completed', color: 'bg-emerald-600' },
  ];

  const isFullWidth = activeTab === 'board' || activeTab === 'timeline' || activeTab === 'calendar';

  return (
    <AppShell fullWidth={isFullWidth}>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      <div className="space-y-6">
        {(searchParams.get('created') || searchParams.get('updated') || searchParams.get('taskCreated')) && (
          <div className="rounded-lg border border-fx-green/20 bg-fx-green-soft px-4 py-3 text-xs font-medium text-fx-green-dark">
            {searchParams.get('created')
              ? 'Project created. Create the first task when you are ready.'
              : searchParams.get('taskCreated')
                ? 'Task created and added to this project.'
                : 'Project updated.'}
          </div>
        )}

        {/* Project Header */}
        {isLoading ? (
          <div className="bg-white border border-fx-border rounded-xl p-5 space-y-3 animate-pulse shadow-none">
            <div className="h-4 bg-fx-bg-subtle rounded w-32" />
            <div className="h-7 bg-fx-bg-subtle rounded w-72" />
            <div className="h-4 bg-fx-bg-subtle rounded w-full max-w-xl" />
          </div>
        ) : !project ? (
          <div className="bg-white border border-fx-border rounded-xl p-8 text-center space-y-3 shadow-none">
            <AlertCircle className="w-8 h-8 text-fx-semantic-danger mx-auto" />
            <h2 className="text-sm font-semibold text-fx-text-primary">Project Not Found</h2>
            <p className="text-xs text-fx-text-secondary">This project may have been removed or you do not have permission to view it.</p>
            <Link href="/projects">
              <Button size="sm" variant="secondary">Back to Projects</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-fx-border rounded-xl p-5 space-y-4 shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href="/projects"
                    className="text-xs text-fx-text-muted hover:text-fx-green fx-transition"
                  >
                    Projects
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5 text-fx-text-muted" />
                  <span className="font-mono text-xs font-semibold text-fx-text-muted bg-fx-bg px-1.5 py-0.5 rounded border border-fx-border">
                    {project?.key || '...'}
                  </span>
                  <HealthBadge health={project?.health || ProjectHealth.ON_TRACK} />
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
                  {project?.name}
                </h1>
                {project?.description && (
                  <p className="text-xs sm:text-sm text-fx-text-secondary leading-relaxed max-w-3xl">
                    {project.description}
                  </p>
                )}
              </div>


            {canManage && (
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/projects/${projectId}/edit`}>
                  <Button size="sm" variant="outline" type="button">
                    Edit Project
                  </Button>
                </Link>
                <Link href={`/projects/${projectId}/members`}>
                  <Button size="sm" variant="secondary" type="button" leftIcon={<Users className="w-3.5 h-3.5" />}>
                    Manage Members ({members.length})
                  </Button>
                </Link>
                <Link href={`/projects/${projectId}/tasks/new`}>
                  <Button size="sm" variant="primary" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    New Task
                  </Button>
                </Link>
              </div>
            )}
          </div>


          {/* Quick Metrics Bar */}
          <div className="pt-3 border-t border-fx-border/70 flex flex-wrap items-center justify-between gap-4 text-xs text-fx-text-secondary">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-fx-text-muted text-[11px]">Progress:</span>{' '}
                <span className="font-mono font-semibold text-fx-text-primary">
                  {project?.progress || 0}%
                </span>
              </div>
              <div>
                <span className="text-fx-text-muted text-[11px]">Tasks:</span>{' '}
                <span className="font-mono font-semibold text-fx-text-primary">
                  {tasks.length}
                </span>
              </div>
              <div>
                <span className="text-fx-text-muted text-[11px]">Managing Admin:</span>{' '}
                <span className="font-medium text-fx-text-primary">
                  {project?.projectManager
                    ? `${project.projectManager.firstName} ${project.projectManager.lastName}`
                    : 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-fx-text-muted text-[11px]">Target:</span>{' '}
                <span className="font-mono text-fx-text-secondary">
                  {project?.targetDate ? formatDate(project.targetDate) : 'No deadline'}
                </span>
              </div>
            </div>

            <div className="w-36 hidden sm:block">
              <Progress value={project?.progress || 0} size="xs" />
            </div>
          </div>
        </div>
        )}


        {/* Lightweight Tab Navigation */}
        <div className="border-b border-fx-border flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'tasks', label: `Tasks (${tasks.length})`, icon: CheckSquare },
            { id: 'board', label: 'Board', icon: FolderKanban },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
            { id: 'files', label: 'Files & Assets', icon: FileText },
            { id: 'activity', label: 'Activity', icon: Activity },
          ].map((tab) => {

            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px flex items-center gap-2 fx-transition',
                  isActive
                    ? 'border-fx-green text-fx-green-dark font-semibold'
                    : 'border-transparent text-fx-text-secondary hover:text-fx-text-primary hover:border-fx-border',
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-fx-green' : 'text-fx-text-muted')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW (Hierarchical 65% / 35% Composition) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (65% -> 8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Milestones Roadmap */}
              <div className="bg-white border border-fx-border rounded-lg p-5 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">
                  Milestone Roadmap
                </h2>

                {milestones.length === 0 ? (
                  <p className="text-xs text-fx-text-muted">No milestones established for this project.</p>
                ) : (
                  <div className="space-y-3">
                    {milestones.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-md bg-fx-bg border border-fx-border/70 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-fx-text-primary">{m.name}</span>
                          <span className="font-mono text-[11px] text-fx-text-muted">
                            Target: {m.targetDate ? formatDate(m.targetDate) : 'TBD'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={m.progress || 0} size="xs" className="flex-1" />
                          <span className="font-mono text-[11px] text-fx-text-secondary">
                            {m.progress || 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks Needing Attention */}
              <div className="bg-white border border-fx-border rounded-lg p-5 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">
                  Tasks In Progress & Review
                </h2>
                {tasks.filter(
                  (t: any) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW,
                ).length === 0 ? (
                  <p className="text-xs text-fx-text-muted">No active in-progress deliverables right now.</p>
                ) : (
                  <div className="divide-y divide-fx-border/60">
                    {tasks
                      .filter(
                        (t: any) =>
                          t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW,
                      )
                      .slice(0, 5)
                      .map((task: any) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="py-3 first:pt-0 last:pb-0 hover:bg-fx-bg-hover cursor-pointer fx-transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-fx-text-muted">{task.humanId}</span>
                              <span className="font-semibold text-fx-text-primary truncate">{task.title}</span>
                            </div>
                            <p className="text-[11px] text-fx-text-muted">
                              Assignee: {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <PriorityBadge priority={task.priority} />
                            <StatusPill status={task.status} size="xs" />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (35% -> 4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Project Metadata Details */}
              <div className="bg-white border border-fx-border rounded-lg p-4 space-y-3 text-xs">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">
                  Project Details
                </h3>
                <div className="divide-y divide-fx-border/60">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-fx-text-muted">Project Code</span>
                    <span className="font-mono font-semibold text-fx-text-primary">{project?.key}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-fx-text-muted">Health Status</span>
                    <HealthBadge health={project?.health || ProjectHealth.ON_TRACK} />
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-fx-text-muted">Start Date</span>
                    <span className="font-mono text-fx-text-secondary">
                      {project?.startDate ? formatDate(project.startDate) : '—'}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-fx-text-muted">Target Delivery</span>
                    <span className="font-mono text-fx-text-secondary">
                      {project?.targetDate ? formatDate(project.targetDate) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Team Members */}
              <div className="bg-white border border-fx-border rounded-lg p-4 space-y-3 text-xs">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">
                  Project Members
                </h3>
                {(!project?.members || project.members.length === 0) ? (
                  <p className="text-xs text-fx-text-muted">No members explicitly assigned.</p>
                ) : (
                  <div className="divide-y divide-fx-border/60">
                    {project.members.map((m: any) => (
                      <div key={m.id} className="py-2 first:pt-0 last:pb-0 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-fx-green-soft text-fx-green-dark font-semibold text-[11px] flex items-center justify-center shrink-0">
                          {m.user?.firstName?.[0]}
                          {m.user?.lastName?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-fx-text-primary truncate">
                            {m.user?.firstName} {m.user?.lastName}
                          </p>
                          <p className="text-[10px] text-fx-text-muted truncate capitalize">
                            {m.roleInProject || m.user?.jobTitle || 'Contributor'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TASKS LIST VIEW */}
        {activeTab === 'tasks' && (
          <div className="bg-white border border-fx-border rounded-lg overflow-hidden">
            {canManage && tasks.length === 0 && (
              <div className="border-b border-fx-border bg-fx-green-soft/40 p-5 text-center text-xs">
                <p className="font-semibold text-fx-text-primary">No tasks yet.</p>
                <p className="mt-1 text-fx-text-secondary">
                  Create the first task for this project and assign it to a team member.
                </p>
                <Link href={`/projects/${projectId}/tasks/new`} className="mt-3 inline-block">
                  <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>Create Task</Button>
                </Link>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-fx-bg text-fx-text-secondary font-medium border-b border-fx-border">
                    <th className="py-2.5 px-4">Task</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-4 text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60 text-fx-text-primary">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-fx-text-muted">
                        No tasks created for this project yet.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task: any) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: KANBAN BOARD (Full-Width, 280-300px Columns, Horizontal Scroll) */}
        {activeTab === 'board' && (
          <div className="overflow-x-auto pb-6">
            <div className="flex items-start gap-4 min-w-[1900px]">
              {boardColumns.map((col) => {
                const colTasks = tasks.filter((t: any) => t.status === col.id);

                return (
                  <div
                    key={col.id}
                    className="w-[280px] bg-white border border-fx-border rounded-2xl p-3.5 space-y-3 shrink-0 shadow-none"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-fx-border/60">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', col.color)} />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">
                          {col.label}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-fx-text-muted bg-fx-bg px-2 py-0.5 rounded-md border border-fx-border">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Column Task Cards */}
                    <div className="space-y-2.5 min-h-[120px]">
                      {colTasks.map((task: any) => {
                        const isWaiting = task.status === TaskStatus.WAITING;
                        const unfinishedDeps = (task.blockedBy || []).filter(
                          (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
                        );

                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={cn(
                              'bg-white border border-fx-border rounded-xl p-3 hover:border-fx-border-strong cursor-pointer fx-transition space-y-2.5 text-xs shadow-none',
                              isWaiting && 'bg-amber-50/20 border-amber-200/70',
                            )}
                          >
                            <div className="space-y-1">
                              <span className="font-mono text-[11px] font-medium text-fx-text-muted">
                                {task.humanId}
                              </span>
                              <h4 className="font-semibold text-fx-text-primary line-clamp-2 leading-snug">
                                {task.title}
                              </h4>
                            </div>


                            {/* Dependencies callout if waiting */}
                            {isWaiting && unfinishedDeps.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-medium">
                                <Lock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <span>Waiting on: {unfinishedDeps.map((d: any) => d.predecessorTask?.humanId).join(', ')}</span>
                              </div>
                            )}

                            {/* Card Footer: Assignee, Priority, Due Date */}
                            <div className="pt-2 border-t border-fx-border/60 flex items-center justify-between text-[11px]">
                              <PriorityBadge priority={task.priority} compact={true} />
                              <span className="text-fx-text-muted font-mono">
                                {task.dueDate ? formatDate(task.dueDate) : ''}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="bg-white border border-fx-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-fx-border/60">
              {[...tasks]
                .filter((task) => task.dueDate)
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-4 text-left text-xs hover:bg-fx-bg-hover"
                  >
                    <p className="font-mono text-[11px] text-fx-text-muted">{task.humanId}</p>
                    <p className="font-semibold text-fx-text-primary">{task.title}</p>
                    <p className="mt-1 text-fx-text-secondary">Due {formatDate(task.dueDate)}</p>
                  </button>
                ))}
            </div>
            {tasks.filter((task) => task.dueDate).length === 0 && (
              <p className="p-8 text-center text-xs text-fx-text-muted">No task due dates scheduled.</p>
            )}
          </div>
        )}

        {/* TAB 5: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="bg-white border border-fx-border rounded-lg p-6 text-center text-xs text-fx-text-muted space-y-2">
            <GanttChartSquare className="w-8 h-8 text-fx-green mx-auto" />
            <p className="font-semibold text-fx-text-primary">Gantt Timeline Schedule</p>
            <p>View cross-project milestones and task dependencies on the global timeline view.</p>
            <Link href="/timeline">
              <Button size="sm" variant="secondary" className="mt-3">
                Open Global Timeline
              </Button>
            </Link>
          </div>
        )}

        {/* TAB 6: FILES */}
        {activeTab === 'files' && (
          <div className="bg-white border border-fx-border rounded-lg p-8 text-center text-xs text-fx-text-muted space-y-2">
            <FileText className="w-8 h-8 text-fx-green mx-auto" />
            <p className="font-semibold text-fx-text-primary">Game Assets & Documents</p>
            <p>Design documents, art assets, and build manifests linked to this game project.</p>
          </div>
        )}

        {/* TAB 7: ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="bg-white border border-fx-border rounded-lg overflow-hidden">
            {(project?.latestDailyUpdates || []).length === 0 ? (
              <p className="p-8 text-center text-xs text-fx-text-muted">No recent project activity yet.</p>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {project.latestDailyUpdates.map((update: any) => (
                  <div key={update.id} className="p-4 text-xs">
                    <p className="font-semibold text-fx-text-primary">
                      {update.user?.firstName} {update.user?.lastName} updated {update.task?.humanId}
                    </p>
                    <p className="mt-1 text-fx-text-secondary">{update.completedToday}</p>
                    <p className="mt-1 font-mono text-[11px] text-fx-text-muted">
                      {update.progressBefore}% to {update.progressAfter}% · {formatDate(update.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
