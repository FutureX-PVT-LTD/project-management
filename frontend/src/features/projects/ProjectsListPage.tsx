'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  FolderKanban,
  Search,
  Plus,
  LayoutList,
  LayoutGrid,
  Calendar,
  Users,
  ArrowRight,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { ProjectStatus, UserRole } from '@futurex/shared';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { CreateProjectModal } from './CreateProjectModal';
import { formatDate, cn } from '@/lib/utils';

export function ProjectsListPage() {
  const { hasRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () => api.get(`/projects?status=${statusFilter}`),
  });

  const canCreate = hasRole(UserRole.OWNER, UserRole.ADMIN, UserRole.PROJECT_MANAGER);

  const allProjects = ((projects as any[]) || []).filter((p: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(s) ||
      p.key.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s)
    );
  });

  const statusTabs = [
    { id: 'ALL', label: 'All Projects' },
    { id: ProjectStatus.ACTIVE, label: 'Active' },
    { id: ProjectStatus.PLANNED, label: 'Planned' },
    { id: ProjectStatus.COMPLETED, label: 'Completed' },
    { id: ProjectStatus.ARCHIVED, label: 'Archived' },
  ];

  return (
    <AppShell onOpenCreateProject={canCreate ? () => setCreateProjectOpen(true) : undefined}>
      {canCreate && (
        <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
      )}

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fx-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">Projects</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-fx-green-50 text-fx-green-900 font-semibold border border-fx-green-100">
                {allProjects.length} {allProjects.length === 1 ? 'project' : 'projects'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              FutureX studio development titles, platforms, and content milestones.
            </p>
          </div>
          {canCreate && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setCreateProjectOpen(true)}
              className="gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> New Project
            </Button>
          )}
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-fx-border scrollbar-none text-xs">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap fx-transition select-none text-xs',
                statusFilter === tab.id
                  ? 'bg-fx-green-50 text-fx-green-900 font-semibold shadow-subtle'
                  : 'text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-subtle',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-fx-border shadow-card text-xs">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search projects by name, key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5" />}
              className="h-8 text-xs bg-fx-bg-subtle"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center border border-fx-border rounded-md overflow-hidden bg-fx-bg-subtle p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded text-fx-text-muted hover:text-fx-text-primary fx-transition',
                viewMode === 'table' && 'bg-white text-fx-green-900 shadow-subtle',
              )}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'p-1.5 rounded text-fx-text-muted hover:text-fx-text-primary fx-transition',
                viewMode === 'cards' && 'bg-white text-fx-green-900 shadow-subtle',
              )}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Project Content Area */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-fx-text-muted">Loading projects...</div>
        ) : allProjects.length === 0 ? (
          <Card padding="none" className="bg-white">
            <EmptyState
              icon={<FolderKanban className="w-5 h-5 text-fx-green-700" />}
              title="No projects found"
              description="No projects matched your selected filters."
            />
          </Card>
        ) : viewMode === 'table' ? (
          /* Table View */
          <Card padding="none" className="bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-fx-border bg-fx-bg-subtle/80 text-[11px] font-semibold uppercase tracking-wider text-fx-text-muted">
                    <th className="py-3 px-4 w-20">Key</th>
                    <th className="py-3 px-4">Project Name</th>
                    <th className="py-3 px-4">Project Manager</th>
                    <th className="py-3 px-4 hidden md:table-cell w-36">Progress</th>
                    <th className="py-3 px-4">Health</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Target Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60">
                  {allProjects.map((proj: any) => (
                    <tr
                      key={proj.id}
                      className="hover:bg-fx-bg-subtle cursor-pointer fx-transition"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-fx-green-900 text-[11px] whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-fx-green-50 border border-fx-green-100">
                          {proj.key}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/projects/${proj.id}`}
                          className="font-semibold text-fx-text-primary hover:text-fx-green-700 text-[13px] block"
                        >
                          {proj.name}
                        </Link>
                        {proj.description && (
                          <p className="text-[11px] text-fx-text-muted line-clamp-1 mt-0.5">
                            {proj.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {proj.projectManager ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={proj.projectManager.avatarUrl}
                              firstName={proj.projectManager.firstName}
                              lastName={proj.projectManager.lastName}
                              size="xs"
                            />
                            <span className="text-fx-text-primary font-medium">
                              {proj.projectManager.firstName} {proj.projectManager.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-fx-text-muted italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell whitespace-nowrap">
                        <Progress value={proj.progress || 0} showLabel={true} size="xs" />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <HealthBadge health={proj.health} reason={proj.healthReason} />
                      </td>
                      <td className="py-3.5 px-4 hidden sm:table-cell text-fx-text-secondary whitespace-nowrap">
                        {formatDate(proj.targetDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/projects/${proj.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-fx-green-700 hover:text-fx-green-800"
                        >
                          View <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allProjects.map((proj: any) => (
              <Card
                key={proj.id}
                padding="md"
                className="bg-white hover:border-fx-border-strong fx-transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-fx-green-50 text-fx-green-900 border border-fx-green-100">
                      {proj.key}
                    </span>
                    <HealthBadge health={proj.health} />
                  </div>

                  <div>
                    <Link
                      href={`/projects/${proj.id}`}
                      className="font-bold text-base text-fx-text-primary hover:text-fx-green-700 fx-transition line-clamp-1"
                    >
                      {proj.name}
                    </Link>
                    <p className="text-xs text-fx-text-secondary line-clamp-2 mt-1 leading-relaxed">
                      {proj.description || 'No project description available.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-fx-border/60">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-fx-text-muted mb-1 font-medium">
                      <span>Progress</span>
                      <span className="font-mono">{proj.progress || 0}%</span>
                    </div>
                    <Progress value={proj.progress || 0} size="xs" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-fx-text-muted pt-1">
                    <div className="flex items-center gap-1.5">
                      <Avatar
                        src={proj.projectManager?.avatarUrl}
                        firstName={proj.projectManager?.firstName}
                        lastName={proj.projectManager?.lastName}
                        size="xs"
                      />
                      <span className="truncate max-w-28 text-fx-text-secondary">
                        {proj.projectManager ? `${proj.projectManager.firstName} ${proj.projectManager.lastName}` : 'Unassigned'}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium">{formatDate(proj.targetDate)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
