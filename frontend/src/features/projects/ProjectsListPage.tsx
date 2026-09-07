'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  Search,
  Plus,
  LayoutGrid,
  List,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { ProjectStatus } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { canManageProjects } from '@/lib/permissions';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { Button } from '@/components/ui/Button';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectRowActionsMenu } from '@/features/projects/ProjectRowActionsMenu';
import { formatDate, formatProjectKey, getInitials, cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { ProjectsListSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function ProjectsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = canManageProjects(user);

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const debouncedSearch = useDebounce(search, 250);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', debouncedSearch, statusFilter],
    queryFn: ({ signal }) =>
      api.get(`/projects?search=${encodeURIComponent(debouncedSearch)}&status=${statusFilter === 'ALL' ? '' : statusFilter}`, { signal }),
    staleTime: 30000,
  });

  const projects = ((projectsData as any[]) || []).map((p) => ({
    ...p,
    cleanKey: formatProjectKey(p.key || p.code, p.name),
  }));

  const openProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
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
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3E7EC] pb-6">
          <div>
            <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-[#181B20]">
              Projects Directory
            </h1>
            <p className="text-sm text-[#626A73] mt-1">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3E7EC] pb-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'px-3.5 py-2 text-xs font-medium whitespace-nowrap rounded-[6px] fx-transition',
                    isActive
                      ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold border border-[#2563EB]/20'
                      : 'text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA]',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & View Mode Toggles */}
          <div className="flex items-center gap-3 pb-1 sm:pb-0">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#929AA3]" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F7F8FA] border border-[#E3E7EC] rounded-[10px] text-[#181B20] placeholder:text-[#929AA3] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] fx-transition"
              />
            </div>

            <div className="flex items-center gap-0.5 border border-[#E3E7EC] rounded-[8px] p-0.5 bg-[#F7F8FA] shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'p-1.5 rounded-[6px] text-xs fx-transition',
                  viewMode === 'cards'
                    ? 'bg-white text-[#181B20] font-semibold shadow-sm'
                    : 'text-[#929AA3] hover:text-[#181B20]',
                )}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-[6px] text-xs fx-transition',
                  viewMode === 'table'
                    ? 'bg-white text-[#181B20] font-semibold shadow-sm'
                    : 'text-[#929AA3] hover:text-[#181B20]',
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
          <ProjectsListSkeleton />
        ) : projects.length === 0 ? (
          <div className="py-16 text-center space-y-4 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-[12px] bg-[#EEF4FF] text-[#2563EB] mx-auto flex items-center justify-center">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#181B20]">No projects found</h3>
              <p className="text-xs text-[#626A73]">
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
          /* Rich Project Tiles View - De-boxed open cards */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((proj: any) => {
              const doneCount = proj.completedTasksCount || proj.stats?.completedTasks || 0;
              const inProgressCount = proj.inProgressTasksCount || 0;
              const waitingCount = proj.waitingTasksCount || 0;
              const inReviewCount = proj.inReviewTasksCount || 0;
              const progressVal = Math.round(proj.progress || 0);
              const members = proj.members || [];

              return (
                <div
                  key={proj.id}
                  onClick={() => openProject(proj.id)}
                  className="rounded-[16px] bg-white border border-[#E3E7EC] hover:border-[#2563EB] p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4 fx-transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Key, Title, Health */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[6px] bg-[#F7F8FA] text-[#626A73] border border-[#E3E7EC]">
                          {proj.cleanKey}
                        </span>
                        <h3 className="text-base sm:text-lg font-semibold text-[#181B20] hover:text-[#2563EB] truncate tracking-tight pt-1">
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
                      <p className="text-xs text-[#626A73] line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}

                    {/* Progress Bar & Percentage */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#181B20]">{progressVal}% complete</span>
                        <span className="font-mono text-[11px] text-[#929AA3]">
                          {proj.targetDate ? `Target ${formatDate(proj.targetDate)}` : 'No target date'}
                        </span>
                      </div>
                      <div className="w-full bg-[#F2F4F7] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#2563EB] h-full rounded-full fx-transition"
                          style={{ width: `${Math.min(100, Math.max(0, progressVal))}%` }}
                        />
                      </div>
                    </div>

                    {/* Task Breakdown Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[#EDF8F2] text-[#237A57] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#237A57]" />
                        <span>{doneCount} Done</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[#EEF4FF] text-[#2563EB] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                        <span>{inProgressCount} In Progress</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[#FFF6E5] text-[#A86B12] text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A86B12]" />
                        <span>{waitingCount} Waiting</span>
                      </span>
                      {inReviewCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[#F4F0FC] text-[#7557B5] text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7557B5]" />
                          <span>{inReviewCount} In Review</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Milestone & Footer */}
                  <div className="pt-3 border-t border-[#E3E7EC] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {members.slice(0, 3).map((m: any, idx: number) => {
                          const u = m.user || m;
                          return (
                            <div
                              key={u.id || idx}
                              className="w-5 h-5 rounded-full bg-[#F7F8FA] border border-white text-[9px] font-semibold flex items-center justify-center text-[#626A73]"
                              title={`${u.firstName} ${u.lastName}`}
                            >
                              {getInitials(u.firstName, u.lastName)}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-[#929AA3]">
                        {members.length > 0 ? `${members.length} members` : '1 member'}
                      </span>
                    </div>

                    <span className="text-xs font-medium text-[#2563EB] flex items-center gap-1 hover:text-[#1D4ED8] fx-transition">
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View - Open layout */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F7F8FA] text-[#626A73] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E3E7EC]">
                  <th className="py-3 px-4">Game Project</th>
                  <th className="py-3 px-3">Status / Health</th>
                  <th className="py-3 px-3">Progress</th>
                  <th className="py-3 px-3">Managing Admin</th>
                  <th className="py-3 px-4 text-right">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E7EC] text-[#181B20]">
                {projects.map((proj: any) => (
                  <tr
                    key={proj.id}
                    onClick={() => openProject(proj.id)}
                    className="hover:bg-[#F7F8FA] cursor-pointer fx-transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-sm text-[#181B20] hover:text-[#2563EB] fx-transition">
                        {proj.name}
                      </div>
                      <div className="text-[11px] text-[#929AA3] font-mono mt-0.5">
                        {proj.cleanKey}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <HealthBadge health={proj.health} reason={proj.healthReason} />
                    </td>
                    <td className="py-3.5 px-3 w-40">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-[#626A73]">
                          <span>{Math.round(proj.progress || 0)}%</span>
                        </div>
                        <div className="w-full bg-[#F2F4F7] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#2563EB] h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, proj.progress || 0))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-[#626A73]">
                      {proj.projectManager
                        ? `${proj.projectManager.firstName} ${proj.projectManager.lastName}`
                        : 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#626A73] font-medium">
                      {proj.targetDate ? formatDate(proj.targetDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
