'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  Search,
  Plus,
  LayoutGrid,
  List,
  ChevronRight,
  Flag,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { ProjectStatus, TaskStatus } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { canManageProjects } from '@/lib/permissions';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { Button } from '@/components/ui/Button';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectRowActionsMenu } from '@/features/projects/ProjectRowActionsMenu';
import { formatDate, formatProjectKey, getInitials, cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function ProjectsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = canManageProjects(user);

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', search, statusFilter],
    queryFn: () =>
      api.get(`/projects?search=${encodeURIComponent(search)}&status=${statusFilter === 'ALL' ? '' : statusFilter}`),
  });

  const projects = ((projectsData as any[]) || []).map((p) => ({
    ...p,
    cleanKey: formatProjectKey(p.key || p.code, p.name),
  }));

  const openProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const openProjectFromKeyboard = (event: React.KeyboardEvent, projectId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProject(projectId);
    }
  };

  const statusTabs = [
    { id: 'ALL', label: 'All Projects' },
    { id: ProjectStatus.ACTIVE, label: 'Active' },
    { id: ProjectStatus.PLANNED, label: 'Planned' },
    { id: ProjectStatus.AT_RISK, label: 'At Risk' },
    { id: ProjectStatus.COMPLETED, label: 'Completed' },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fx-border pb-4">
          <div>
            <h1 className="text-2xl sm:text-[30px] font-semibold tracking-tight text-fx-text-primary">
              Projects Directory
            </h1>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Production tracking, milestones, and deliverable execution across all studio titles.
            </p>
          </div>

          {canManage && (
            <Link href="/projects/new">
              <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                New Project
              </Button>
            </Link>
          )}
        </div>

        {/* Status Tabs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fx-border">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'px-3.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px fx-transition',
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

          {/* Search & View Mode Toggles */}
          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fx-text-muted" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-fx-border rounded-lg text-fx-text-primary placeholder:text-fx-text-muted focus:outline-none focus:ring-1 focus:ring-fx-green"
              />
            </div>

            <div className="flex items-center gap-0.5 border border-fx-border rounded-lg p-0.5 bg-white shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'p-1.5 rounded-md text-xs fx-transition',
                  viewMode === 'cards'
                    ? 'bg-fx-bg-secondary text-fx-text-primary font-semibold shadow-xs'
                    : 'text-fx-text-muted hover:text-fx-text-primary',
                )}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-md text-xs fx-transition',
                  viewMode === 'table'
                    ? 'bg-fx-bg-secondary text-fx-text-primary font-semibold shadow-xs'
                    : 'text-fx-text-muted hover:text-fx-text-primary',
                )}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Projects Content */}
        {isLoading ? (
          <div className="bg-white border border-fx-border rounded-xl p-10 text-center text-xs text-fx-text-muted">
            Loading game projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-fx-border rounded-xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-fx-green-soft text-fx-green mx-auto flex items-center justify-center">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-sm font-semibold text-fx-text-primary">No projects found</h3>
              <p className="text-xs text-fx-text-secondary">
                {search
                  ? `No projects matched the search "${search}".`
                  : 'Create your first project and assign team members to begin tracking deliverables.'}
              </p>
            </div>
            {canManage && !search && (
              <Link href="/projects/new">
                <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Create Project
                </Button>
              </Link>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* Rich Project Tiles View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.map((proj: any) => {
              const doneCount = proj.completedTasksCount || proj.stats?.completedTasks || 0;
              const inProgressCount = proj.inProgressTasksCount || 0;
              const waitingCount = proj.waitingTasksCount || 0;
              const inReviewCount = proj.inReviewTasksCount || 0;
              const progressVal = Math.round(proj.progress || 0);
              const members = proj.members || [];
              const milestone = (proj.milestones || []).find((m: any) => m.status !== 'COMPLETED') || proj.milestones?.[0];

              return (
                <div
                  key={proj.id}
                  onClick={() => openProject(proj.id)}
                  className="bg-white border border-fx-border rounded-xl p-5 space-y-4 hover:border-fx-border-strong fx-transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Key, Title, Health */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-fx-bg-secondary text-fx-text-secondary border border-fx-border">
                          {proj.cleanKey}
                        </span>
                        <h3 className="text-base sm:text-lg font-semibold text-fx-text-primary hover:text-fx-green truncate tracking-tight">
                          {proj.name}
                        </h3>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <HealthBadge health={proj.health} reason={proj.healthReason} showReason={true} />
                        {canManage && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <ProjectRowActionsMenu project={proj} />
                          </div>
                        )}
                      </div>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-fx-text-secondary line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}

                    {/* Progress Bar & Percentage */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-fx-text-primary">{progressVal}% complete</span>
                        <span className="font-mono text-[11px] text-fx-text-muted">
                          {proj.targetDate ? `Target ${formatDate(proj.targetDate)}` : 'No target date'}
                        </span>
                      </div>
                      <div className="w-full bg-fx-bg-secondary rounded-full h-2 overflow-hidden border border-fx-border/60">
                        <div
                          className="bg-fx-green h-full rounded-full fx-transition"
                          style={{ width: `${Math.min(100, Math.max(0, progressVal))}%` }}
                        />
                      </div>
                    </div>

                    {/* Task Breakdown Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-fx-green-soft text-fx-green-dark border border-fx-green/20 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-fx-green" />
                        <span>{doneCount} Done</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>{inProgressCount} In Progress</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{waitingCount} Waiting</span>
                      </span>
                      {inReviewCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          <span>{inReviewCount} In Review</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Milestone & Footer */}
                  <div className="pt-3 border-t border-fx-border flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {members.slice(0, 3).map((m: any, idx: number) => {
                          const u = m.user || m;
                          return (
                            <div
                              key={u.id || idx}
                              className="w-5 h-5 rounded-full bg-fx-bg-secondary border border-white text-[9px] font-semibold flex items-center justify-center text-fx-text-secondary"
                              title={`${u.firstName} ${u.lastName}`}
                            >
                              {getInitials(u.firstName, u.lastName)}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-fx-text-muted">
                        {members.length > 0 ? `${members.length} members` : '1 member'}
                      </span>
                    </div>

                    <Button size="xs" variant="secondary" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                      Open
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border border-fx-border rounded-xl overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-fx-bg-secondary text-fx-text-secondary font-medium border-b border-fx-border">
                    <th className="py-2.5 px-4">Project</th>
                    <th className="py-2.5 px-3">Key</th>
                    <th className="py-2.5 px-3">Health</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-4 text-right">Target Date</th>
                    {canManage && <th className="py-2.5 px-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border text-fx-text-primary">
                  {projects.map((proj: any) => {
                    const members = proj.members || [];
                    const progressVal = Math.round(proj.progress || 0);

                    return (
                      <tr
                        key={proj.id}
                        tabIndex={0}
                        role="link"
                        aria-label={`Open ${proj.name} overview`}
                        onClick={() => openProject(proj.id)}
                        onKeyDown={(event) => openProjectFromKeyboard(event, proj.id)}
                        className="hover:bg-fx-bg-hover cursor-pointer fx-transition focus:outline-none focus:bg-fx-bg-hover"
                      >
                        <td className="py-3 px-4 font-semibold">
                          <span className="hover:text-fx-green text-fx-text-primary flex items-center gap-2">
                            {proj.name}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-fx-text-muted">
                          {proj.cleanKey}
                        </td>
                        <td className="py-3 px-3">
                          <HealthBadge health={proj.health} reason={proj.healthReason} />
                        </td>
                        <td className="py-3 px-3 w-40">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-fx-bg-secondary rounded-full h-2 overflow-hidden border border-fx-border/60">
                              <div
                                className="bg-fx-green h-full rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, progressVal))}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-fx-text-muted shrink-0">{progressVal}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {members.slice(0, 3).map((m: any, idx: number) => {
                                const u = m.user || m;
                                return (
                                  <div
                                    key={u.id || idx}
                                    className="h-5 w-5 rounded-full ring-1 ring-white bg-fx-green-soft text-fx-green-dark text-[9px] font-semibold flex items-center justify-center"
                                  >
                                    {getInitials(u.firstName, u.lastName)}
                                  </div>
                                );
                              })}
                            </div>
                            <span className="text-[11px] text-fx-text-muted font-mono ml-1">
                              {members.length}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-fx-text-secondary">
                          {proj.targetDate ? formatDate(proj.targetDate) : '—'}
                        </td>
                        {canManage && (
                          <td
                            className="py-3 px-3 text-right"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <ProjectRowActionsMenu project={proj} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
