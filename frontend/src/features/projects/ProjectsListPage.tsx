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
    { id: 'ALL', label: 'All Products' },
    { id: ProjectStatus.ACTIVE, label: 'Active' },
    { id: ProjectStatus.PLANNED, label: 'Planned' },
    { id: ProjectStatus.AT_RISK, label: 'At Risk' },
    { id: ProjectStatus.COMPLETED, label: 'Completed' },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E8EBEF] pb-6">
          <div>
            <h1 className="fx-page-title">
              Products Directory
            </h1>
            <p className="text-[13px] text-[#60666F] mt-1">
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

        {/* Status Tabs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8EBEF] pb-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-[6px] fx-transition',
                    isActive
                      ? 'bg-[#EEF4FF] text-[#245EC7] font-medium'
                      : 'text-[#60666F] hover:text-[#17191C] hover:bg-[#F8F9FB]',
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
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B929B]" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FB] border border-[#E8EBEF] rounded-[8px] text-[#17191C] placeholder:text-[#8B929B] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#2463EB] focus:border-[#2463EB] fx-transition"
              />
            </div>

            <div className="flex items-center gap-0.5 border border-[#E8EBEF] rounded-[7px] p-0.5 bg-[#F8F9FB] shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'p-1.5 rounded-[5px] text-xs fx-transition',
                  viewMode === 'cards'
                    ? 'bg-white text-[#17191C] shadow-xs'
                    : 'text-[#8B929B] hover:text-[#17191C]',
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-[5px] text-xs fx-transition',
                  viewMode === 'table'
                    ? 'bg-white text-[#17191C] shadow-xs'
                    : 'text-[#8B929B] hover:text-[#17191C]',
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
          <div className="py-16 text-center space-y-3 max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-full bg-[#EEF4FF] text-[#2463EB] mx-auto flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[13px] font-semibold text-[#17191C]">No products found</h3>
              <p className="text-[12px] text-[#60666F]">
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
          /* 24. Spacious 2-Column Product Surfaces with Breathing Room & Inline Metadata */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="rounded-[12px] bg-white border border-[#E8EBEF] hover:border-[#DCE1E7] p-5 sm:p-6 space-y-4 fx-transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Title, Key, Health */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-[#17191C] hover:text-[#2463EB] truncate tracking-tight">
                            {proj.name}
                          </h3>
                          <span className="font-mono text-[11px] font-medium px-1.5 py-0.5 rounded-[5px] bg-[#F8F9FB] text-[#60666F] border border-[#E8EBEF]">
                            {proj.cleanKey}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#60666F]">
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
                      <p className="text-[12px] text-[#60666F] line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[#17191C]">{progressVal}% complete</span>
                        <span className="font-mono text-[#8B929B]">
                          {proj.targetDate ? `Target ${formatDate(proj.targetDate)}` : 'No target date'}
                        </span>
                      </div>
                      <div className="w-full bg-[#F3F5F7] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#2463EB] h-full rounded-full fx-transition"
                          style={{ width: `${Math.min(100, Math.max(0, progressVal))}%` }}
                        />
                      </div>
                    </div>

                    {/* 24. Status counts as text / inline metadata (NOT nested square cells) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px] text-[#60666F]">
                      <span className="text-[#26715A] font-medium">{doneCount} completed</span>
                      <span className="text-[#8B929B]">·</span>
                      <span>{inProgressCount} active</span>
                      <span className="text-[#8B929B]">·</span>
                      <span>{waitingCount} waiting</span>
                      {inReviewCount > 0 && (
                        <>
                          <span className="text-[#8B929B]">·</span>
                          <span className="text-[#6D52A3] font-medium">{inReviewCount} in review</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-[#E8EBEF] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {members.slice(0, 3).map((m: any, idx: number) => {
                          const u = m.user || m;
                          return (
                            <div
                              key={u.id || idx}
                              className="w-5 h-5 rounded-full bg-[#F8F9FB] border border-white text-[9px] font-semibold flex items-center justify-center text-[#60666F]"
                              title={`${u.firstName} ${u.lastName}`}
                            >
                              {getInitials(u.firstName, u.lastName)}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-[#8B929B]">
                        {members.length > 0 ? `${members.length} members` : '1 member'}
                      </span>
                    </div>

                    <span className="text-[12px] font-medium text-[#2463EB] flex items-center gap-1 hover:text-[#1D4ED8] fx-transition">
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View: Open layout with #FAFBFC header */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAFBFC] text-[#60666F] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E8EBEF]">
                  <th className="py-3 px-4">Product Title</th>
                  <th className="py-3 px-3">Health</th>
                  <th className="py-3 px-3">Progress</th>
                  <th className="py-3 px-3">Managing Admin</th>
                  <th className="py-3 px-4 text-right">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EBEF] text-[#17191C]">
                {projects.map((proj: any) => (
                  <tr
                    key={proj.id}
                    onClick={() => openProject(proj.id)}
                    className="hover:bg-[#F8F9FB] cursor-pointer fx-transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-sm text-[#17191C] hover:text-[#2463EB] fx-transition">
                        {proj.name}
                      </div>
                      <div className="text-[11px] text-[#8B929B] font-mono mt-0.5">
                        {proj.cleanKey}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <HealthBadge health={proj.health} reason={proj.healthReason} />
                    </td>
                    <td className="py-3.5 px-3 w-40">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-[#60666F]">
                          <span>{Math.round(proj.progress || 0)}%</span>
                        </div>
                        <div className="w-full bg-[#F3F5F7] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#2463EB] h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, proj.progress || 0))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-[#60666F]">
                      {proj.projectManager
                        ? `${proj.projectManager.firstName} ${proj.projectManager.lastName}`
                        : 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#60666F] font-medium">
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
