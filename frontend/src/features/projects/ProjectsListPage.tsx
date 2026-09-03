'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  Search,
  Plus,
  LayoutGrid,
  List,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { ProjectStatus } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { canManageProjects } from '@/lib/permissions';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectRowActionsMenu } from '@/features/projects/ProjectRowActionsMenu';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function ProjectsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = canManageProjects(user);

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', search, statusFilter],
    queryFn: () =>
      api.get(`/projects?search=${encodeURIComponent(search)}&status=${statusFilter === 'ALL' ? '' : statusFilter}`),
  });

  const projects = (projectsData as any[]) || [];

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
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
              Game Projects
            </h1>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Production directory, milestones, and deliverable tracking across all FutureX titles.
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

        {/* Status Tabs */}
        <div className="border-b border-fx-border flex items-center gap-1 overflow-x-auto no-scrollbar">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px fx-transition',
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

        {/* Search & Layout Toggle Bar */}
        <div className="bg-white border border-fx-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-none">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fx-text-muted" />
              <input
                type="text"
                placeholder="Search projects by name, key, or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-fx-bg border border-fx-border rounded-md text-fx-text-primary placeholder:text-fx-text-muted focus:outline-none focus:ring-1 focus:ring-fx-green"
              />
            </div>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1 border border-fx-border rounded-lg p-0.5 bg-fx-bg">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded text-xs fx-transition',
                viewMode === 'table'
                  ? 'bg-white text-fx-text-primary shadow-xs font-semibold'
                  : 'text-fx-text-muted hover:text-fx-text-primary',
              )}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'p-1.5 rounded text-xs fx-transition',
                viewMode === 'cards'
                  ? 'bg-white text-fx-text-primary shadow-xs font-semibold'
                  : 'text-fx-text-muted hover:text-fx-text-primary',
              )}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content View */}
        {isLoading ? (
          <div className="bg-white border border-fx-border rounded-xl p-10 text-center text-xs text-fx-text-muted shadow-none">
            Loading game projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-fx-border rounded-xl p-12 text-center space-y-4 shadow-none">
            <div className="w-12 h-12 rounded-xl bg-fx-green-soft text-fx-green mx-auto flex items-center justify-center">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-sm font-semibold text-fx-text-primary">No projects yet</h3>
              <p className="text-xs text-fx-text-secondary">
                Create your first project and assign your team members to start tracking milestones and deliverables.
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

        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white border border-fx-border rounded-xl overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-fx-bg text-fx-text-secondary font-medium border-b border-fx-border">
                    <th className="py-2.5 px-4">Game Project</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Health</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-4 text-right">Target Delivery</th>
                    {canManage && <th className="py-2.5 px-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60 text-fx-text-primary">
                  {projects.map((proj: any) => {
                    const members = proj.members || [];
                    return (
                      <tr
                        key={proj.id}
                        tabIndex={0}
                        role="link"
                        aria-label={`Open ${proj.name} overview`}
                        onClick={() => openProject(proj.id)}
                        onKeyDown={(event) => openProjectFromKeyboard(event, proj.id)}
                        className="hover:bg-fx-bg-hover cursor-pointer fx-transition focus:outline-none focus:bg-fx-bg-hover focus:ring-1 focus:ring-inset focus:ring-fx-green"
                      >
                        <td className="py-3 px-4 font-semibold">
                          <Link
                            href={`/projects/${proj.id}`}
                            className="hover:text-fx-green text-fx-text-primary flex items-center gap-2"
                          >
                            <span>{proj.name}</span>
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-fx-text-muted">
                          {proj.key || proj.code}
                        </td>
                        <td className="py-3 px-3">
                          <HealthBadge health={proj.health} reason={proj.healthReason} />
                        </td>
                        <td className="py-3 px-3 w-36">
                          <Progress value={proj.progress || 0} size="xs" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {members.slice(0, 3).map((m: any) => (
                                <div
                                  key={m.id || m.userId}
                                  title={`${m.user?.firstName} ${m.user?.lastName}`}
                                  className="inline-block h-5 w-5 rounded-full ring-1 ring-white bg-fx-green-soft text-fx-green-dark text-[9px] font-semibold flex items-center justify-center"
                                >
                                  {m.user?.firstName?.[0]}
                                </div>
                              ))}
                            </div>
                            <span className="text-[11px] text-fx-text-muted font-mono ml-1">
                              {members.length} {members.length === 1 ? 'member' : 'members'}
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
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj: any) => (
              <Card
                key={proj.id}
                variant="interactive"
                padding="md"
                tabIndex={0}
                role="link"
                aria-label={`Open ${proj.name} overview`}
                onClick={() => openProject(proj.id)}
                onKeyDown={(event) => openProjectFromKeyboard(event, proj.id)}
                className="flex flex-col justify-between space-y-4 shadow-none"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-fx-text-muted">
                        {proj.key || proj.code}
                      </span>
                      <h3 className="text-sm font-semibold text-fx-text-primary hover:text-fx-green line-clamp-1">
                        <Link href={`/projects/${proj.id}`}>{proj.name}</Link>
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <HealthBadge health={proj.health} showLabel={false} />
                      {canManage && (
                        <div
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <ProjectRowActionsMenu project={proj} />
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-fx-text-secondary line-clamp-2 leading-relaxed">
                    {proj.description || 'No description provided for this game project.'}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-fx-border/60 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-fx-text-secondary">
                      <span>Progress</span>
                      <span className="font-mono font-medium">{proj.progress || 0}%</span>
                    </div>
                    <Progress value={proj.progress || 0} size="xs" />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-fx-text-muted">
                    <span>{proj.members?.length || 0} team members</span>
                    <span className="font-mono">
                      {proj.targetDate ? formatDate(proj.targetDate) : 'No deadline'}
                    </span>
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
