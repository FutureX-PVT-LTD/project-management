'use client';
import { PhaseAssignments } from './PhaseAssignments';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  CheckSquare,
  GanttChartSquare,
  Plus,
  Calendar,
  AlertCircle,
  Lock,
  FileText,
  Activity,
  ChevronRight,
  ListChecks,
  Wand2,
  Users,
  Megaphone,
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
import { ProjectDetailSkeleton } from '@/components/ui/Skeleton';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

interface ProjectDetailsPageProps {
  projectId?: string;
}

function formatTemplateLabel(value?: string | null) {
  if (!value) return '-';
  return value
    .replace(/_/g, ' / ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function checklistPosition(task: any) {
  const codeNumber = Number(String(task.checklistCode || '').match(/(\d+)$/)?.[1]);
  if (Number.isFinite(codeNumber) && codeNumber > 0) return codeNumber;
  const storedOrder = Number(task.checklistOrder);
  return Number.isFinite(storedOrder) && storedOrder > 0 ? storedOrder : Number.MAX_SAFE_INTEGER;
}

export function ProjectDetailsPage({
  projectId: propProjectId,
}: ProjectDetailsPageProps = {}) {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = propProjectId || (params?.id as string) || '';

  const { user } = useAuth();
  const canManage = canManageProjects(user);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'development' | 'tasks' | 'board' | 'calendar' | 'timeline' | 'activity'
  >('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Fetch Project Details
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    enabled: !!projectId,
    staleTime: 20000,
  });
  const { data: marketingSummaryData } = useQuery({
    queryKey: ['marketing', projectId, 'summary'],
    queryFn: () => api.get(`/projects/${projectId}/marketing/summary`),
    enabled: !!projectId,
    staleTime: 20000,
  });

  const generateChecklistMutation = useMutation({
    mutationFn: () =>
      api.post(`/projects/${projectId}/generate-development-checklist`, {}),
    onSuccess: () => {
      setPageError(null);
      setActiveTab('development');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: any) =>
      setPageError(err.message || 'Checklist could not be generated.'),
  });

  const markNotApplicableMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.patch(`/tasks/${taskId}`, { status: TaskStatus.N_A }),
    onSuccess: () => {
      setPageError(null);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (err: any) =>
      setPageError(err.message || 'Task could not be marked not applicable.'),
  });

  const isFullWidth =
    activeTab === 'board' ||
    activeTab === 'timeline' ||
    activeTab === 'calendar';

  if (isLoading && !projectData) {
    return (
      <AppShell fullWidth={isFullWidth}>
        <ProjectDetailSkeleton />
      </AppShell>
    );
  }

  const project = projectData as any;
  const tasks = (project?.tasks || []) as any[];
  const checklistTasks = [...tasks]
    .filter((task) => task.workType === 'STANDARD_CHECKLIST' && (task.workstream || 'DEVELOPMENT') === 'DEVELOPMENT')
    .sort((a, b) => checklistPosition(a) - checklistPosition(b));
  const milestones = (project?.milestones || []) as any[];
  const members = (project?.members || []) as any[];
  const checklistSummary = project?.checklistSummary;
  const marketingSummary = marketingSummaryData as any;
  const developmentReadiness = Math.round(project?.launchReadiness || checklistSummary?.completionPercent || 0);
  const marketingEnabled = (project?.workstreams || []).some((row: any) => row.workstream === 'MARKETING');
  const productLaunchReady = developmentReadiness === 100 && (!marketingEnabled || marketingSummary?.marketingReadiness === 'READY');
  const phaseProgress = (project?.phaseProgress || []) as any[];
  const progressVal = Math.round(project?.progress || 0);

  return (
    <AppShell fullWidth={isFullWidth}>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      <div className="space-y-6">
        {/* Flash Message Banner */}
        {(searchParams.get('created') ||
          searchParams.get('updated') ||
          searchParams.get('taskCreated')) && (
            <div className="rounded-[8px] border border-[#E8EBEF] bg-[#F8F9FB] px-4 py-2.5 text-xs text-[#17191C]">
              {searchParams.get('created')
                ? 'Product created. Generate development checklist or add custom tasks.'
                : searchParams.get('taskCreated')
                  ? 'Task created and added to product.'
                  : 'Product updated.'}
            </div>
          )}

        {pageError && (
          <div className="rounded-[8px] border border-[#F9D1D1] bg-[#FCEEEE] px-4 py-2.5 text-xs font-medium text-[#B54747]">
            {pageError}
          </div>
        )}

        {/* 28. Workspace Product Header */}
        {!project ? (
          <div className="py-16 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#B54747] mx-auto" />
            <h2 className="text-sm font-semibold text-[#17191C]">
              Product Not Found
            </h2>
            <p className="text-xs text-[#60666F]">
              This product may have been removed or you do not have permission to view it.
            </p>
            <Link href="/projects">
              <Button size="sm" variant="secondary">
                Back to Products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4 pb-4 border-b border-[#E8EBEF]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href="/projects"
                    className="text-xs text-[#60666F] hover:text-[#2463EB] fx-transition"
                  >
                    Products
                  </Link>
                  <ChevronRight className="w-3 h-3 text-[#8B929B]" />
                  <span className="font-mono text-[11px] font-medium text-[#60666F] bg-[#F8F9FB] px-1.5 py-0.5 rounded-[5px] border border-[#E8EBEF]">
                    {project?.key || '...'}
                  </span>
                  <HealthBadge
                    health={project?.health || ProjectHealth.ON_TRACK}
                  />
                </div>

                <h1 className="fx-page-title">
                  {project?.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#60666F]">
                  <span>{(project?.productType || 'Product').replace('_', ' ')}</span>
                  <span className="text-[#8B929B]">·</span>
                  <span>{project?.targetDate ? `Target ${formatDate(project.targetDate)}` : 'No target date'}</span>
                  <span className="text-[#8B929B]">·</span>
                  <span className="font-medium text-[#17191C]">{progressVal}% complete</span>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/projects/${projectId}/edit`}>
                    <Button size="sm" variant="secondary">
                      Settings
                    </Button>
                  </Link>
                  <Link href={`/projects/${projectId}/tasks/new`}>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      New Task
                    </Button>
                  </Link>
                  {!project?.checklistGeneratedAt ? (
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<Wand2 className="w-3.5 h-3.5" />}
                      loading={generateChecklistMutation.isPending}
                      onClick={() => generateChecklistMutation.mutate()}
                    >
                      Generate Checklist
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setActiveTab('development')}
                    >
                      Checklist
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Metrics Bar (Quiet open row) */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-[#60666F]">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[#8B929B]">Tasks:</span>{' '}
                  <span className="font-mono font-semibold text-[#17191C]">
                    {tasks.length}
                  </span>
                </div>
                <div>
                  <span className="text-[#8B929B]">Managing Admin:</span>{' '}
                  <span className="font-medium text-[#17191C]">
                    {project?.projectManager
                      ? `${project.projectManager.firstName} ${project.projectManager.lastName}`
                      : 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-[#8B929B]">Launch Readiness:</span>{' '}
                  <span className={cn('font-semibold', productLaunchReady ? 'text-[#237A57]' : 'text-[#9A6515]')}>
                    {productLaunchReady ? 'Ready' : 'Not ready'}
                  </span>
                  <span className="ml-2 text-[11px] text-[#8B929B]">Dev {developmentReadiness}%{marketingEnabled ? ` · Marketing ${marketingSummary?.marketingReadiness === 'READY' ? 'Ready' : 'Not ready'}` : ''}</span>
                </div>
              </div>

              <div className="w-36 hidden sm:block">
                <Progress value={progressVal} size="xs" />
              </div>
            </div>
          </div>
        )}

        {/* 28. Tab Navigation */}
        <div className="border-b border-[#E8EBEF] pb-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            {
              id: 'development',
              label: `Development Checklist (${checklistTasks.length})`,
              icon: ListChecks,
            },
            {
              id: 'tasks',
              label: `Tasks (${tasks.length})`,
              icon: CheckSquare,
            },
            { id: 'board', label: 'Board', icon: FolderKanban },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
            { id: 'activity', label: 'Activity', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-[6px] flex items-center gap-1.5 fx-transition',
                  isActive
                    ? 'bg-[#EEF4FF] text-[#245EC7] font-medium'
                    : 'text-[#60666F] hover:text-[#17191C] hover:bg-[#F8F9FB]',
                )}
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5',
                    isActive ? 'text-[#245EC7]' : 'text-[#8B929B]',
                  )}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <Link href={`/projects/${projectId}/marketing`} className="px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-[6px] flex items-center gap-1.5 text-[#60666F] hover:text-[#17191C] hover:bg-[#F8F9FB] fx-transition">
            <Megaphone className="h-3.5 w-3.5 text-[#8B929B]" /> Marketing
          </Link>
        </div>

        {/* 29. TAB 1: PRODUCT OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Primary Column (8 cols) */}
            <div className="lg:col-span-8 space-y-8 min-w-0">

              {/* 30. Progress by Phase: Calm Table/List (NOT one card per phase) */}
              <section className="space-y-3">
                <div className="pb-2 border-b border-[#E8EBEF] flex items-center justify-between">
                  <h2 className="fx-section-title">
                    Progress by Phase
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('development')}
                    className="text-xs font-medium text-[#2463EB] hover:text-[#1D4ED8] fx-transition"
                  >
                    View checklist ({checklistTasks.length}) →
                  </button>
                </div>

                {phaseProgress.length === 0 ? (
                  <div className="py-4 text-xs text-[#8B929B]">
                    No phase breakdown available. Generate the standard development checklist to track progress by phase.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#FAFBFC] text-[#60666F] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E8EBEF]">
                          <th className="py-2.5 px-3">Phase</th>
                          <th className="py-2.5 px-3 w-48">Progress</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EBEF] text-[#17191C]">
                        {phaseProgress.map((phase: any) => {
                          const pct = Number(phase.completionPercent || 0);
                          const statusLabel =
                            pct === 100 ? 'Complete' : pct > 0 ? 'In Progress' : 'Not Started';
                          const statusColor =
                            pct === 100
                              ? 'text-[#26715A] bg-[#EDF7F2]'
                              : pct > 0
                                ? 'text-[#245EC7] bg-[#EEF4FF]'
                                : 'text-[#8B929B] bg-[#F1F3F5]';

                          return (
                            <tr key={phase.phase} className="hover:bg-[#F8F9FB] fx-transition">
                              <td className="py-2.5 px-3 font-medium text-[#17191C]">
                                <div className="flex items-center gap-2">
                                  {pct === 100 ? (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EDF7F2] text-[#26715A] font-bold text-[10px]">
                                      ✓
                                    </span>
                                  ) : pct > 0 ? (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EEF4FF] text-[#245EC7] text-[10px]">
                                      ●
                                    </span>
                                  ) : (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F1F3F5] text-[#8B929B] text-[10px]">
                                      ○
                                    </span>
                                  )}
                                  <span>{phase.phase}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <Progress value={pct} size="xs" className="flex-1" />
                                  <span className="font-mono text-[11px] text-[#60666F] w-9 text-right">
                                    {pct}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={cn('px-2 py-0.5 rounded-[5px] text-[11px] font-medium inline-block', statusColor)}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Tasks In Progress & Review (Clean rows) */}
              <section className="space-y-3">
                <div className="pb-2 border-b border-[#E8EBEF] flex items-center justify-between">
                  <h2 className="fx-section-title">
                    Active Deliverables
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs font-medium text-[#2463EB] hover:text-[#1D4ED8] fx-transition"
                  >
                    View all ({tasks.length}) →
                  </button>
                </div>

                {tasks.filter(
                  (t: any) =>
                    t.status === TaskStatus.IN_PROGRESS ||
                    t.status === TaskStatus.IN_REVIEW ||
                    t.status === TaskStatus.READY,
                ).length === 0 ? (
                  <p className="text-xs text-[#8B929B] py-2">
                    No active deliverables in progress right now.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E8EBEF]">
                    {tasks
                      .filter(
                        (t: any) =>
                          t.status === TaskStatus.IN_PROGRESS ||
                          t.status === TaskStatus.IN_REVIEW ||
                          t.status === TaskStatus.READY,
                      )
                      .slice(0, 6)
                      .map((task: any) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="py-3 hover:bg-[#F8F9FB] -mx-2 px-2 rounded-[8px] cursor-pointer fx-transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            {/* 33. Task title first, metadata second */}
                            <p className="font-medium text-[13px] text-[#17191C] hover:text-[#2463EB] truncate fx-transition">
                              {task.title}
                            </p>
                            <p className="text-[11px] text-[#60666F]">
                              <span className="font-mono text-[#8B929B]">{task.humanId}</span>
                              {' · '}
                              <span>{task.phase || 'Core'}</span>
                              {' · '}
                              <span>{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <PriorityBadge priority={task.priority} compact />
                            <StatusPill status={task.status} size="xs" />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>

              {/* Milestones Roadmap (Clean divider list) */}
              <section className="space-y-3">
                <div className="pb-2 border-b border-[#E8EBEF]">
                  <h2 className="fx-section-title">
                    Milestones Roadmap
                  </h2>
                </div>

                {milestones.length === 0 ? (
                  <p className="text-xs text-[#8B929B] py-2">
                    No milestones established for this product.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E8EBEF]">
                    {milestones.map((m: any) => (
                      <div
                        key={m.id}
                        className="py-3 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[#17191C]">
                              {m.name}
                            </span>
                            <span className="font-mono text-[11px] text-[#8B929B]">
                              {m.targetDate ? `Target ${formatDate(m.targetDate)}` : 'TBD'}
                            </span>
                          </div>
                          <Progress
                            value={m.progress || 0}
                            size="xs"
                          />
                        </div>
                        <span className="font-mono text-[11px] text-[#60666F] shrink-0 w-8 text-right">
                          {m.progress || 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>

            {/* Right Utility Column (4 cols) */}
            <div className="lg:col-span-4 space-y-8 min-w-0">
              {/* Product Details */}
              <div className="space-y-2.5 text-xs">
                <div className="pb-2 border-b border-[#E8EBEF]">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8B929B]">
                    Product Metadata
                  </h3>
                </div>
                <div className="divide-y divide-[#E8EBEF]">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-[#60666F]">Code</span>
                    <span className="font-mono font-medium text-[#17191C]">
                      {project?.key}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-[#60666F]">Health</span>
                    <HealthBadge
                      health={project?.health || ProjectHealth.ON_TRACK}
                    />
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-[#60666F]">Start Date</span>
                    <span className="font-mono text-[#60666F]">
                      {project?.startDate ? formatDate(project.startDate) : '—'}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-[#60666F]">Target Delivery</span>
                    <span className="font-mono text-[#60666F]">
                      {project?.targetDate ? formatDate(project.targetDate) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Team Members */}
              <div className="space-y-2.5 text-xs">
                <div className="pb-2 border-b border-[#E8EBEF] flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8B929B]">
                    Team ({members.length})
                  </h3>
                </div>
                {members.length === 0 ? (
                  <p className="text-xs text-[#8B929B] py-2">
                    No members assigned yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E8EBEF]">
                    {members.map((m: any) => (
                      <div
                        key={m.id}
                        className="py-2 flex items-center gap-2.5"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#EEF4FF] text-[#2463EB] font-medium text-[10px] flex items-center justify-center shrink-0">
                          {m.user?.firstName?.[0]}
                          {m.user?.lastName?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#17191C] truncate">
                            {m.user?.firstName} {m.user?.lastName}
                          </p>
                          <p className="text-[11px] text-[#8B929B] truncate capitalize">
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

        {/* 31 & 32. TAB 2: DEVELOPMENT CHECKLIST — OPERATIONAL TABLE */}
        {activeTab === 'development' && (
          <div className="space-y-6">
            {checklistTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#60666F] space-y-3">
                <ListChecks className="mx-auto h-8 w-8 text-[#2463EB]" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-[#17191C]">
                    Development checklist is not generated yet.
                  </p>
                  <p className="text-[#60666F]">
                    Generate standard product deliverables, then assign responsibilities across the team.
                  </p>
                </div>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    className="mt-2"
                    leftIcon={<Wand2 className="w-3.5 h-3.5" />}
                    loading={generateChecklistMutation.isPending}
                    onClick={() => generateChecklistMutation.mutate()}
                  >
                    Generate Checklist
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Checklist Summary (Open metrics row) */}
                <div className="flex flex-wrap items-center gap-6 py-2 border-b border-[#E8EBEF] text-xs">
                  <div>
                    <span className="text-[#8B929B]">Applicable:</span>{' '}
                    <span className="font-mono font-semibold text-[#17191C]">
                      {checklistSummary?.totalApplicable || checklistTasks.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8B929B]">Done:</span>{' '}
                    <span className="font-mono font-semibold text-[#26715A]">
                      {checklistSummary?.completed || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8B929B]">Ready:</span>{' '}
                    <span className="font-mono font-semibold text-[#237A57]">
                      {checklistSummary?.ready || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8B929B]">Waiting:</span>{' '}
                    <span className="font-mono font-semibold text-[#9A6515]">
                      {checklistSummary?.waiting || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8B929B]">Unassigned:</span>{' '}
                    <span className="font-mono font-semibold text-[#60666F]">
                      {checklistSummary?.unassigned || 0}
                    </span>
                  </div>
                </div>

                {canManage && <PhaseAssignments projectId={projectId} workstream="development" items={checklistTasks} members={members} />}

                {/* 31 & 32. Operational Table: #FAFBFC header, 48–56px row height, horizontal row dividers only */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAFBFC] text-[#60666F] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E8EBEF]">
                        <th className="py-3 px-3">Item / Deliverable</th>
                        <th className="py-3 px-3">Phase</th>
                        <th className="py-3 px-3">Responsibility</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Assignee</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EBEF] text-[#17191C]">
                      {checklistTasks.map((task) => (
                        <tr
                          key={task.id}
                          className="hover:bg-[#F8F9FB] fx-transition h-[52px]"
                        >
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => setSelectedTaskId(task.id)}
                              className="text-left"
                            >
                              {/* 33. Title first, metadata second */}
                              <span className="font-medium text-[13px] text-[#17191C] hover:text-[#2463EB] block">
                                {task.title}
                              </span>
                              <span className="font-mono text-[11px] text-[#8B929B] block">
                                {task.checklistCode || task.humanId}
                                {task.checklistDoneWhen && (
                                  <span className="text-[#60666F] ml-2 font-sans">
                                    · Done when: {task.checklistDoneWhen}
                                  </span>
                                )}
                              </span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-[#60666F]">
                            {task.checklistPhase || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-[#60666F]">
                            {formatTemplateLabel(task.checklistOwnerRole)}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusPill status={task.status} size="xs" />
                          </td>
                          <td className="py-2.5 px-3">
                            {task.assignee ? (
                              `${task.assignee.firstName} ${task.assignee.lastName}`
                            ) : (
                              'Unassigned'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {canManage && task.status !== TaskStatus.N_A && (
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                loading={markNotApplicableMutation.isPending}
                                onClick={() =>
                                  markNotApplicableMutation.mutate(task.id)
                                }
                              >
                                Mark N/A
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: TASKS LIST VIEW */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAFBFC] text-[#60666F] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E8EBEF]">
                    <th className="py-3 px-3">Task</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Assignee</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Progress</th>
                    <th className="py-3 px-3 text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBEF] text-[#17191C]">
                  {tasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-[#8B929B]"
                      >
                        No tasks created for this product yet.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task: any) => (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="hover:bg-[#F8F9FB] cursor-pointer fx-transition h-[52px]"
                      >
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            <span className="font-medium text-[13px] text-[#17191C] hover:text-[#2463EB] truncate block max-w-md fx-transition">
                              {task.title}
                            </span>
                            <span className="font-mono text-[11px] text-[#8B929B] block">
                              {task.humanId}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusPill status={task.status} size="xs" />
                        </td>
                        <td className="py-2.5 px-3 text-[#60666F]">
                          {task.assignee
                            ? `${task.assignee.firstName} ${task.assignee.lastName}`
                            : 'Unassigned'}
                        </td>
                        <td className="py-2.5 px-3">
                          <PriorityBadge priority={task.priority} compact />
                        </td>
                        <td className="py-2.5 px-3 w-28">
                          <Progress
                            value={task.progress || 0}
                            showLabel={true}
                            size="xs"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#60666F]">
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

        {/* TAB 4: KANBAN BOARD */}
        {activeTab === 'board' && (
          <div className="overflow-x-auto pb-6">
            <div className="flex items-start gap-3.5 min-w-[1600px]">
              {[
                { id: TaskStatus.UNASSIGNED, label: 'Unassigned' },
                { id: TaskStatus.TODO, label: 'To Do' },
                { id: TaskStatus.WAITING, label: 'Waiting' },
                { id: TaskStatus.READY, label: 'Ready' },
                { id: TaskStatus.IN_PROGRESS, label: 'In Progress' },
                { id: TaskStatus.IN_REVIEW, label: 'In Review' },
                { id: TaskStatus.BLOCKED, label: 'Blocked' },
                { id: TaskStatus.DONE, label: 'Completed' },
              ].map((col) => {
                const colTasks = tasks.filter((t: any) => t.status === col.id);

                return (
                  <div
                    key={col.id}
                    className="w-[260px] bg-[#F8F9FB] border border-[#E8EBEF] rounded-[10px] p-3 space-y-2.5 shrink-0"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#E8EBEF]">
                      <h3 className="text-xs font-semibold text-[#17191C]">
                        {col.label}
                      </h3>
                      <span className="text-[11px] font-mono text-[#60666F]">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[100px]">
                      {colTasks.map((task: any) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="bg-white border border-[#E8EBEF] rounded-[8px] p-2.5 hover:border-[#2463EB] cursor-pointer fx-transition space-y-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <h4 className="font-medium text-xs text-[#17191C] hover:text-[#2463EB] line-clamp-2">
                              {task.title}
                            </h4>
                            <span className="font-mono text-[10px] text-[#8B929B]">
                              {task.humanId}
                            </span>
                          </div>

                          <div className="pt-1.5 border-t border-[#E8EBEF] flex items-center justify-between text-[11px]">
                            <PriorityBadge
                              priority={task.priority}
                              compact={true}
                            />
                            <span className="text-[#8B929B] font-mono">
                              {task.dueDate ? formatDate(task.dueDate) : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="divide-y divide-[#E8EBEF]">
            {[...tasks]
              .filter((task) => (task.workstream || 'DEVELOPMENT') === 'DEVELOPMENT')
              .filter((task) => task.dueDate)
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-[#F8F9FB] -mx-2 px-2 rounded-[8px] cursor-pointer fx-transition"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="font-medium text-[13px] text-[#17191C]">
                      {task.title}
                    </p>
                    <p className="font-mono text-[11px] text-[#8B929B]">
                      {task.humanId} · Due {formatDate(task.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={task.priority} compact />
                    <StatusPill status={task.status} size="xs" />
                  </div>
                </div>
              ))}
            {tasks.filter((task) => task.dueDate).length === 0 && (
              <p className="py-8 text-center text-xs text-[#8B929B]">
                No task due dates scheduled for this product.
              </p>
            )}
          </div>
        )}

        {/* TAB 6: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="py-12 text-center text-xs text-[#60666F] space-y-2">
            <GanttChartSquare className="w-8 h-8 text-[#2463EB] mx-auto" />
            <p className="font-semibold text-[#17191C]">
              Product Timeline View
            </p>
            <p>
              View cross-product milestones and deliverable dependencies on the global timeline.
            </p>
            <Link href="/timeline">
              <Button size="sm" variant="secondary" className="mt-3">
                Open Global Timeline
              </Button>
            </Link>
          </div>
        )}

        {/* TAB 7: ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="divide-y divide-[#E8EBEF]">
            {(project?.latestDailyUpdates || []).length === 0 ? (
              <p className="py-8 text-center text-xs text-[#8B929B]">
                No recent activity recorded for this product yet.
              </p>
            ) : (
              (project.latestDailyUpdates || []).map((update: any) => (
                <div key={update.id} className="py-3 text-xs space-y-0.5">
                  <p className="font-medium text-[#17191C]">
                    {update.user?.firstName} {update.user?.lastName} updated deliverable {update.task?.humanId}
                  </p>
                  {update.completedToday && (
                    <p className="text-[#60666F]">{update.completedToday}</p>
                  )}
                  <p className="font-mono text-[11px] text-[#8B929B]">
                    {update.progressBefore}% → {update.progressAfter}% · {formatDate(update.createdAt)}
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
