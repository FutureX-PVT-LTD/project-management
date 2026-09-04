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
    { id: TaskStatus.WAITING, label: 'Waiting', color: 'bg-[#A96F12]' },
    { id: TaskStatus.READY, label: 'Ready to Start', color: 'bg-[#248A5B]' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-[#0077E6]' },
    { id: TaskStatus.IN_REVIEW, label: 'In Review', color: 'bg-[#7558B8]' },
    { id: TaskStatus.BLOCKED, label: 'Blocked', color: 'bg-[#C24141]' },
    { id: TaskStatus.DONE, label: 'Completed', color: 'bg-[#248A5B]' },
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

      <div className="space-y-8">
        {(searchParams.get('created') || searchParams.get('updated') || searchParams.get('taskCreated')) && (
          <div className="rounded-[10px] border border-[#E4E7EB] bg-[#F8F9FA] px-4 py-3 text-xs font-medium text-[#15171A]">
            {searchParams.get('created')
              ? 'Project created. Create the first task when you are ready.'
              : searchParams.get('taskCreated')
                ? 'Task created and added to this project.'
                : 'Project updated.'}
          </div>
        )}

        {/* Project Header - De-boxed directly on canvas */}
        {isLoading ? (
          <div className="space-y-3 animate-pulse pb-6 border-b border-[#E4E7EB]">
            <div className="h-4 bg-[#F4F5F6] rounded w-32" />
            <div className="h-8 bg-[#F4F5F6] rounded w-72" />
            <div className="h-4 bg-[#F4F5F6] rounded w-full max-w-xl" />
          </div>
        ) : !project ? (
          <div className="py-16 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#C24141] mx-auto" />
            <h2 className="text-sm font-semibold text-[#15171A]">Project Not Found</h2>
            <p className="text-xs text-[#5F6368]">This project may have been removed or you do not have permission to view it.</p>
            <Link href="/projects">
              <Button size="sm" variant="secondary">Back to Projects</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href="/projects"
                    className="text-xs text-[#5F6368] hover:text-[#0088FF] fx-transition"
                  >
                    Projects
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5 text-[#92979E]" />
                  <span className="font-mono text-xs font-semibold text-[#5F6368] bg-[#F8F9FA] px-2 py-0.5 rounded-[6px] border border-[#E4E7EB]">
                    {project?.key || '...'}
                  </span>
                  <HealthBadge health={project?.health || ProjectHealth.ON_TRACK} />
                </div>
                <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-[#15171A]">
                  {project?.name}
                </h1>
                {project?.description && (
                  <p className="text-sm text-[#5F6368] leading-relaxed max-w-3xl">
                    {project.description}
                  </p>
                )}
              </div>

              {canManage && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/projects/${projectId}/edit`}>
                    <Button size="sm" variant="secondary" type="button">
                      Edit Project
                    </Button>
                  </Link>
                  <Link href={`/projects/${projectId}/members`}>
                    <Button size="sm" variant="secondary" type="button" leftIcon={<Users className="w-3.5 h-3.5" />}>
                      Members ({members.length})
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

            {/* Quick Metrics Bar directly on canvas */}
            <div className="border-y border-[#E4E7EB] py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#5F6368]">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[#92979E] text-[11px]">Progress:</span>{' '}
                  <span className="font-mono font-semibold text-[#15171A]">
                    {project?.progress || 0}%
                  </span>
                </div>
                <div>
                  <span className="text-[#92979E] text-[11px]">Tasks:</span>{' '}
                  <span className="font-mono font-semibold text-[#15171A]">
                    {tasks.length}
                  </span>
                </div>
                <div>
                  <span className="text-[#92979E] text-[11px]">Managing Admin:</span>{' '}
                  <span className="font-medium text-[#15171A]">
                    {project?.projectManager
                      ? `${project.projectManager.firstName} ${project.projectManager.lastName}`
                      : 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-[#92979E] text-[11px]">Target:</span>{' '}
                  <span className="font-mono text-[#5F6368]">
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
        <div className="border-b border-[#E4E7EB] pb-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                  'px-3.5 py-2 text-xs font-medium whitespace-nowrap rounded-[6px] flex items-center gap-2 fx-transition',
                  isActive
                    ? 'bg-[#EEF4F7] text-[#0068CC] font-semibold'
                    : 'text-[#5F6368] hover:text-[#15171A] hover:bg-[#F8F9FA]',
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-[#0088FF]' : 'text-[#92979E]')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              {/* Milestones Roadmap */}
              <div className="space-y-3">
                <div className="pb-2 border-b border-[#E4E7EB]">
                  <h2 className="text-[14px] font-semibold text-[#15171A]">
                    Milestone Roadmap
                  </h2>
                </div>

                {milestones.length === 0 ? (
                  <p className="text-xs text-[#92979E] py-2">No milestones established for this project.</p>
                ) : (
                  <div className="space-y-3">
                    {milestones.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-[10px] bg-[#F8F9FA] border border-[#E4E7EB] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#15171A]">{m.name}</span>
                          <span className="font-mono text-[11px] text-[#92979E]">
                            Target: {m.targetDate ? formatDate(m.targetDate) : 'TBD'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={m.progress || 0} size="xs" className="flex-1" />
                          <span className="font-mono text-[11px] text-[#5F6368]">
                            {m.progress || 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks In Progress & Review */}
              <div className="space-y-3">
                <div className="pb-2 border-b border-[#E4E7EB]">
                  <h2 className="text-[14px] font-semibold text-[#15171A]">
                    Tasks In Progress & Review
                  </h2>
                </div>
                {tasks.filter(
                  (t: any) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW,
                ).length === 0 ? (
                  <p className="text-xs text-[#92979E] py-2">No active in-progress deliverables right now.</p>
                ) : (
                  <div className="divide-y divide-[#E4E7EB]">
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
                          className="py-3 hover:bg-[#F8F9FA] -mx-2 px-2 rounded-[8px] cursor-pointer fx-transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-[#92979E]">{task.humanId}</span>
                              <span className="font-semibold text-[#15171A] truncate">{task.title}</span>
                            </div>
                            <p className="text-[11px] text-[#5F6368]">
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

            {/* Right Column (4 cols) */}
            <div className="lg:col-span-4 space-y-8">
              {/* Project Metadata Details */}
              <div className="space-y-3 text-xs">
                <div className="pb-2 border-b border-[#E4E7EB]">
                  <h3 className="text-[14px] font-semibold text-[#15171A]">
                    Project Details
                  </h3>
                </div>
                <div className="divide-y divide-[#E4E7EB]">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5F6368]">Project Code</span>
                    <span className="font-mono font-semibold text-[#15171A]">{project?.key}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5F6368]">Health Status</span>
                    <HealthBadge health={project?.health || ProjectHealth.ON_TRACK} />
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5F6368]">Start Date</span>
                    <span className="font-mono text-[#5F6368]">
                      {project?.startDate ? formatDate(project.startDate) : '—'}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#5F6368]">Target Delivery</span>
                    <span className="font-mono text-[#5F6368]">
                      {project?.targetDate ? formatDate(project.targetDate) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Team Members */}
              <div className="space-y-3 text-xs">
                <div className="pb-2 border-b border-[#E4E7EB]">
                  <h3 className="text-[14px] font-semibold text-[#15171A]">
                    Project Members
                  </h3>
                </div>
                {(!project?.members || project.members.length === 0) ? (
                  <p className="text-xs text-[#92979E] py-2">No members explicitly assigned.</p>
                ) : (
                  <div className="divide-y divide-[#E4E7EB]">
                    {project.members.map((m: any) => (
                      <div key={m.id} className="py-2.5 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#EEF4F7] text-[#0088FF] font-semibold text-[11px] flex items-center justify-center shrink-0">
                          {m.user?.firstName?.[0]}
                          {m.user?.lastName?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#15171A] truncate">
                            {m.user?.firstName} {m.user?.lastName}
                          </p>
                          <p className="text-[11px] text-[#5F6368] truncate capitalize">
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
          <div className="space-y-4">
            {canManage && tasks.length === 0 && (
              <div className="border border-[#E4E7EB] bg-[#F8F9FA] rounded-[10px] p-6 text-center text-xs">
                <p className="font-semibold text-[#15171A]">No tasks yet.</p>
                <p className="mt-1 text-[#5F6368]">
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
                  <tr className="bg-[#F8F9FA] text-[#5F6368] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E4E7EB]">
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Assignee</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Progress</th>
                    <th className="py-3 px-4 text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB] text-[#15171A]">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#92979E]">
                        No tasks created for this project yet.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task: any) => (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="hover:bg-[#F8F9FA] cursor-pointer fx-transition"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-[#92979E] shrink-0">
                              {task.humanId}
                            </span>
                            <span className="font-medium text-sm text-[#15171A] hover:text-[#0088FF] truncate max-w-sm fx-transition">
                              {task.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <StatusPill status={task.status} size="xs" />
                        </td>
                        <td className="py-3.5 px-3 text-[#5F6368]">
                          {task.assignee
                            ? `${task.assignee.firstName} ${task.assignee.lastName}`
                            : 'Unassigned'}
                        </td>
                        <td className="py-3.5 px-3">
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td className="py-3.5 px-3 w-28">
                          <Progress value={task.progress || 0} showLabel={true} size="xs" />
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[#5F6368]">
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

        {/* TAB 3: KANBAN BOARD */}
        {activeTab === 'board' && (
          <div className="overflow-x-auto pb-6">
            <div className="flex items-start gap-4 min-w-[1900px]">
              {boardColumns.map((col) => {
                const colTasks = tasks.filter((t: any) => t.status === col.id);

                return (
                  <div
                    key={col.id}
                    className="w-[280px] bg-[#F8F9FA] border border-[#E4E7EB] rounded-[12px] p-3.5 space-y-3 shrink-0"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EB]">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', col.color)} />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#15171A]">
                          {col.label}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-[#5F6368] bg-white px-2 py-0.5 rounded-[6px] border border-[#E4E7EB]">
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
                              'bg-white border border-[#E4E7EB] rounded-[10px] p-3 hover:border-[#0088FF] cursor-pointer fx-transition space-y-2.5 text-xs',
                              isWaiting && 'bg-[#FFF6E5]/40 border-[#FDE9B8]',
                            )}
                          >
                            <div className="space-y-1">
                              <span className="font-mono text-[11px] font-medium text-[#92979E]">
                                {task.humanId}
                              </span>
                              <h4 className="font-medium text-sm text-[#15171A] hover:text-[#0088FF] line-clamp-2 leading-snug">
                                {task.title}
                              </h4>
                            </div>

                            {/* Dependencies callout if waiting */}
                            {isWaiting && unfinishedDeps.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-[#A96F12] bg-[#FFF6E5] px-1.5 py-0.5 rounded-[5px] font-medium">
                                <Lock className="w-2.5 h-2.5 text-[#A96F12] shrink-0" />
                                <span>Waiting on: {unfinishedDeps.map((d: any) => d.predecessorTask?.humanId).join(', ')}</span>
                              </div>
                            )}

                            {/* Card Footer: Assignee, Priority, Due Date */}
                            <div className="pt-2 border-t border-[#E4E7EB] flex items-center justify-between text-[11px]">
                              <PriorityBadge priority={task.priority} compact={true} />
                              <span className="text-[#92979E] font-mono">
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
          <div className="border border-[#E4E7EB] rounded-[12px] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E4E7EB]">
              {[...tasks]
                .filter((task) => task.dueDate)
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-4 text-left text-xs hover:bg-[#F8F9FA] fx-transition"
                  >
                    <p className="font-mono text-[11px] text-[#92979E]">{task.humanId}</p>
                    <p className="font-medium text-sm text-[#15171A]">{task.title}</p>
                    <p className="mt-1 text-[#5F6368]">Due {formatDate(task.dueDate)}</p>
                  </button>
                ))}
            </div>
            {tasks.filter((task) => task.dueDate).length === 0 && (
              <p className="p-8 text-center text-xs text-[#92979E]">No task due dates scheduled.</p>
            )}
          </div>
        )}

        {/* TAB 5: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="border border-[#E4E7EB] rounded-[12px] p-8 text-center text-xs text-[#5F6368] space-y-2">
            <GanttChartSquare className="w-8 h-8 text-[#0088FF] mx-auto" />
            <p className="font-semibold text-[#15171A]">Gantt Timeline Schedule</p>
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
          <div className="border border-[#E4E7EB] rounded-[12px] p-8 text-center text-xs text-[#5F6368] space-y-2">
            <FileText className="w-8 h-8 text-[#0088FF] mx-auto" />
            <p className="font-semibold text-[#15171A]">Game Assets & Documents</p>
            <p>Design documents, art assets, and build manifests linked to this game project.</p>
          </div>
        )}

        {/* TAB 7: ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="divide-y divide-[#E4E7EB]">
            {(project?.latestDailyUpdates || []).length === 0 ? (
              <p className="p-8 text-center text-xs text-[#92979E]">No recent project activity yet.</p>
            ) : (
              (project.latestDailyUpdates || []).map((update: any) => (
                <div key={update.id} className="py-3.5 text-xs">
                  <p className="font-semibold text-[#15171A]">
                    {update.user?.firstName} {update.user?.lastName} updated {update.task?.humanId}
                  </p>
                  <p className="mt-1 text-[#5F6368]">{update.completedToday}</p>
                  <p className="mt-1 font-mono text-[11px] text-[#92979E]">
                    {update.progressBefore}% to {update.progressAfter}% · {formatDate(update.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
