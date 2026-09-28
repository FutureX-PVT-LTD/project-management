'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  Search,
  Plus,
  LayoutGrid,
  List,
  ArrowRight,
  FileText,
  Trash2,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
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
  const queryClient = useQueryClient();
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

  const { data: draftsData } = useQuery({
    queryKey: ['projects', 'drafts'],
    queryFn: () => api.get('/projects/drafts'),
    enabled: canManage,
  });
  const drafts = asArray<any>(draftsData);

  const discardDraftMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/drafts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'drafts'] });
    },
  });

  const projects = ((projectsData as any[]) || []).map((p) => ({
    ...p,
    cleanKey: formatProjectKey(p.key || p.code, p.name),
  }));

  const openProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const statusTabs = [
    { id: 'ALL', label: 'All Products' },
    { id: ProjectStatus.ACTIVE, label: 'Active' },
    { id: ProjectStatus.PLANNED, label: 'Planned' },
    { id: ProjectStatus.AT_RISK, label: 'At Risk' },
    { id: ProjectStatus.COMPLETED, label: 'Completed' },
    { id: ProjectStatus.ARCHIVED, label: 'Archived' },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E3E7EC] pb-5">
          <div>
            <h1 className="fx-page-title">
              Products Directory
            </h1>
            <p className="text-[13px] text-[#626A73] mt-1">
              Deliverable execution, checklist governance, and milestone readiness across all studio titles.
            </p>
          </div>

          {canManage && (
            <Link href="/projects/new">
              <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                New Product
              </Button>
            </Link>
          )}
        </div>

        {/* Compact Table / Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E7EC] pb-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-[6px] transition-colors',
                    isActive
                      ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold'
                      : 'text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA]',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & View Mode Toggles */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#929AA3]" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E3E7EC] rounded-[8px] text-[#181B20] placeholder:text-[#929AA3] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
              />
            </div>

            <div className="flex items-center gap-0.5 border border-[#E3E7EC] rounded-[7px] p-0.5 bg-[#F7F8FA] shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'p-1.5 rounded-[5px] text-xs transition-colors',
                  viewMode === 'cards'
                    ? 'bg-white text-[#181B20] border border-[#E3E7EC]'
                    : 'text-[#929AA3] hover:text-[#181B20]',
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-[5px] text-xs transition-colors',
                  viewMode === 'table'
                    ? 'bg-white text-[#181B20] border border-[#E3E7EC]'
                    : 'text-[#929AA3] hover:text-[#181B20]',
                )}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Drafts Management Section: Clean, Quiet Rows */}
        {canManage && drafts.length > 0 && !search && statusFilter === 'ALL' && (
          <div className="rounded-[10px] border border-[#E3E7EC] bg-[#F7F8FA] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                <h2 className="text-[11px] font-semibold text-[#626A73] uppercase tracking-wider">
                  Draft Products ({drafts.length})
                </h2>
                <span className="rounded-[5px] bg-[#EEF4FF] px-1.5 py-0.5 text-[10px] font-medium text-[#2563EB]">
                  Unpublished
                </span>
              </div>
              <span className="text-[11px] text-[#929AA3]">
                Drafts autosave continuously
              </span>
            </div>

            <div className="divide-y divide-[#E3E7EC] rounded-[8px] border border-[#E3E7EC] bg-white overflow-hidden">
              {drafts.map((d: any) => {
                const stepLabel =
                  d.currentStep === 'TEAM'
                    ? 'Step 2: Team'
                    : d.currentStep === 'WORKSTREAMS'
                    ? 'Step 3: Workstreams'
                    : d.currentStep === 'REVIEW'
                    ? 'Step 4: Review'
                    : 'Step 1: Details';

                return (
                  <div
                    key={d.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5 text-xs hover:bg-[#F7F8FA] transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-semibold text-[13px] text-[#181B20] hover:text-[#2563EB] cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/projects/new?draft=${d.id}&step=${(d.currentStep || 'DETAILS').toLowerCase()}`,
                          )
                        }
                      >
                        {d.name || 'Untitled Draft'}
                      </span>
                      <span className="text-[#929AA3]">·</span>
                      <span className="rounded bg-[#F2F4F7] px-1.5 py-0.5 text-[11px] font-medium text-[#626A73]">
                        {stepLabel}
                      </span>
                      <span className="text-[#929AA3]">·</span>
                      <span className="text-[11.5px] text-[#626A73] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#929AA3]" />
                        Updated {formatDate(d.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="xs"
                        variant="secondary"
                        rightIcon={<ArrowRight className="w-3 h-3" />}
                        onClick={() =>
                          router.push(
                            `/projects/new?draft=${d.id}&step=${(d.currentStep || 'DETAILS').toLowerCase()}`,
                          )
                        }
                      >
                        Continue Setup
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-[#929AA3] hover:text-[#C24141] hover:bg-[#FDEEEE]"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to discard draft "${d.name || 'Untitled Draft'}"? This action cannot be undone.`,
                            )
                          ) {
                            discardDraftMutation.mutate(d.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Discard
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects Content */}
        {isLoading ? (
          <ProjectsListSkeleton />
        ) : projects.length === 0 ? (
          <div className="py-16 text-center space-y-3 max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-full bg-[#EEF4FF] text-[#2563EB] mx-auto flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[13px] font-semibold text-[#181B20]">No products found</h3>
              <p className="text-[12px] text-[#626A73]">
                {search
                  ? `No products matched the search "${search}".`
                  : 'Create your first product to generate standard checklists and monitor deliverable execution.'}
              </p>
            </div>
            {canManage && !search && (
              <Link href="/projects/new">
                <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Create Product
                </Button>
              </Link>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* Compact, Comfortable 2-Column Product Surfaces */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((proj: any) => {
              const doneCount = proj.completedTasksCount || proj.stats?.completedTasks || 0;
              const inProgressCount = proj.inProgressTasksCount || 0;
              const waitingCount = proj.waitingTasksCount || 0;
              const inReviewCount = proj.inReviewTasksCount || 0;
              const totalCount = proj.tasksCount || (doneCount + inProgressCount + waitingCount + inReviewCount) || 1;
              const progressVal = Math.round(proj.progress || (totalCount > 0 ? (doneCount / totalCount) * 100 : 0));
              const members = proj.members || [];

              return (
                <div
                  key={proj.id}
                  onClick={() => openProject(proj.id)}
                  className="rounded-[12px] bg-white border border-[#E3E7EC] hover:border-[#D4DAE1] p-5 space-y-4 cursor-pointer flex flex-col justify-between transition-colors"
                >
                  <div className="space-y-3">
                    {/* Top Row: Title, Key, Health */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[15px] font-semibold text-[#181B20] hover:text-[#2563EB] truncate tracking-tight transition-colors">
                            {proj.name}
                          </h3>
                          <span className="font-mono text-[11px] font-medium px-1.5 py-0.5 rounded-[5px] bg-[#F2F4F7] text-[#626A73] border border-[#E3E7EC]">
                            {proj.cleanKey}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#626A73]">
                          {(proj.productType || 'Product').replace('_', ' ')}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <HealthBadge health={proj.health} reason={proj.healthReason} />
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
                      <p className="text-[12.5px] text-[#626A73] line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="font-medium text-[#181B20]">{progressVal}% complete</span>
                        <span className="font-mono text-[#929AA3]">
                          {proj.targetDate ? `Target ${formatDate(proj.targetDate)}` : 'No target date'}
                        </span>
                      </div>
                      <div className="w-full bg-[#E3E7EC] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#2563EB] h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, progressVal))}%` }}
                        />
                      </div>
                    </div>

                    {/* Status counts as text / inline metadata */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px] text-[#626A73]">
                      <span className="text-[#237A57] font-medium">{doneCount} completed</span>
                      <span className="text-[#929AA3]">·</span>
                      <span>{inProgressCount} active</span>
                      <span className="text-[#929AA3]">·</span>
                      <span>{waitingCount} waiting</span>
                      {inReviewCount > 0 && (
                        <>
                          <span className="text-[#929AA3]">·</span>
                          <span className="text-[#7557B5] font-medium">{inReviewCount} in review</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-[#E3E7EC] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {members.slice(0, 3).map((m: any, idx: number) => {
                          const u = m.user || m;
                          return (
                            <div
                              key={u.id || idx}
                              className="w-5 h-5 rounded-full bg-[#F2F4F7] border border-white text-[9px] font-semibold flex items-center justify-center text-[#626A73]"
                              title={`${u.firstName} ${u.lastName}`}
                            >
                              {getInitials(u.firstName, u.lastName)}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-[11.5px] text-[#929AA3]">
                        {members.length > 0 ? `${members.length} members` : '1 member'}
                      </span>
                    </div>

                    <span className="text-[12.5px] font-medium text-[#2563EB] flex items-center gap-1 hover:text-[#1D4ED8] transition-colors">
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View: Open layout with comfortable 44-50px rows */
          <div className="overflow-x-auto border border-[#E3E7EC] rounded-[10px] bg-white">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F7F8FA] text-[#626A73] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E3E7EC]">
                  <th className="py-3 px-4">Product Title</th>
                  <th className="py-3 px-3">Health</th>
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
                    className="hover:bg-[#F7F8FA] cursor-pointer transition-colors h-[48px]"
                  >
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-[13.5px] text-[#181B20] hover:text-[#2563EB] transition-colors">
                        {proj.name}
                      </div>
                      <div className="text-[11px] text-[#626A73] font-mono mt-0.5">
                        {proj.cleanKey}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <HealthBadge health={proj.health} reason={proj.healthReason} />
                    </td>
                    <td className="py-2.5 px-3 w-40">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-[#626A73]">
                          <span>{Math.round(proj.progress || 0)}%</span>
                        </div>
                        <div className="w-full bg-[#E3E7EC] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#2563EB] h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, proj.progress || 0))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#626A73]">
                      {proj.projectManager
                        ? `${proj.projectManager.firstName} ${proj.projectManager.lastName}`
                        : 'Unassigned'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#626A73] font-medium">
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
