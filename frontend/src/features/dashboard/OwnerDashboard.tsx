'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { ProjectHealth, TaskPriority } from '@futurex/shared';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { CalendarWidget } from '@/features/calendar/CalendarWidget';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';

export function OwnerDashboard() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch Owner Portfolio metrics
  const { data: ownerData } = useQuery({
    queryKey: ['dashboard', 'owner'],
    queryFn: () => api.get('/reports/owner-dashboard'),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const projects = asArray<any>(projectsData);

  const urgentTasks = asArray<any>(ownerData, 'needsAttention');

  return (
    <div className="space-y-6">
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* Header & Status Strip */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-fx-text-primary">
              Executive Studio Overview
            </h1>
            <p className="text-sm text-fx-text-secondary mt-0.5">
              Portfolio health, key milestones, and critical blocker governance.
            </p>
          </div>

          <Link href="/projects/new">
            <Button variant="primary" size="sm" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New Project
            </Button>
          </Link>
        </div>

        {/* 6-KPI Summary Strip */}
        <div className="bg-white border border-fx-border rounded-xl p-3 shadow-none">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-fx-border/60 text-xs">
            <div className="px-3 py-1.5 first:pl-0">
              <span className="text-fx-text-muted text-[11px] block">Active Projects</span>
              <span className="text-base font-semibold text-fx-text-primary font-mono mt-0.5 block">
                {projects.length}
              </span>
            </div>
            <div className="px-3 py-1.5">
              <span className="text-fx-text-muted text-[11px] block">On Track</span>
              <span className="text-base font-semibold text-fx-green font-mono mt-0.5 block">
                {projects.filter((p: any) => p.health === ProjectHealth.ON_TRACK).length}
              </span>
            </div>
            <div className="px-3 py-1.5">
              <span className="text-fx-text-muted text-[11px] block">At Risk</span>
              <span className="text-base font-semibold text-amber-600 font-mono mt-0.5 block">
                {projects.filter((p: any) => p.health === ProjectHealth.AT_RISK).length}
              </span>
            </div>
            <div className="px-3 py-1.5">
              <span className="text-fx-text-muted text-[11px] block">Off Track</span>
              <span className="text-base font-semibold text-fx-semantic-danger font-mono mt-0.5 block">
                {projects.filter((p: any) => p.health === ProjectHealth.OFF_TRACK).length}
              </span>
            </div>
            <div className="px-3 py-1.5">
              <span className="text-fx-text-muted text-[11px] block">Completed</span>
              <span className="text-base font-semibold text-fx-text-secondary font-mono mt-0.5 block">
                {projects.filter((p: any) => p.status === 'COMPLETED').length}
              </span>
            </div>
            <div className="px-3 py-1.5 last:pr-0">
              <span className="text-fx-text-muted text-[11px] block">Blocked Items</span>
              <span className="text-base font-semibold text-fx-semantic-danger font-mono mt-0.5 block">
                {urgentTasks.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Studio Portfolio Table (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-fx-border rounded-xl overflow-hidden shadow-none">
            <div className="px-4 py-3 border-b border-fx-border flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">
                Studio Game Portfolio ({projects.length})
              </h2>
              <Link
                href="/projects"
                className="text-xs text-fx-green font-medium hover:underline flex items-center gap-1"
              >
                <span>Full Directory</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-fx-bg text-fx-text-secondary font-medium border-b border-fx-border">
                    <th className="py-2.5 px-4">Game Project</th>
                    <th className="py-2.5 px-3">Status / Health</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3">Managing Admin</th>
                    <th className="py-2.5 px-4 text-right">Target Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60 text-fx-text-primary">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-fx-text-muted">
                        No studio projects found. Create your first project using the button above.
                      </td>
                    </tr>
                  ) : (
                    projects.map((proj: any) => (
                      <tr
                        key={proj.id}
                        className="hover:bg-fx-bg-hover cursor-pointer fx-transition"
                      >
                        <td className="py-3 px-4">
                          <Link href={`/projects/${proj.id}`} className="block">
                            <p className="font-semibold text-fx-text-primary hover:text-fx-green">
                              {proj.name}
                            </p>
                            <p className="text-[11px] text-fx-text-muted font-mono">{proj.key || proj.code}</p>
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <HealthBadge health={proj.health} reason={proj.healthReason} />
                        </td>
                        <td className="py-3 px-3 w-36">
                          <Progress value={proj.progress || 0} size="xs" />
                        </td>
                        <td className="py-3 px-3 text-fx-text-secondary">
                          {proj.projectManager
                            ? `${proj.projectManager.firstName} ${proj.projectManager.lastName}`
                            : proj.projectManagerName || 'Unassigned Admin'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-fx-text-secondary">
                          {proj.targetDate ? formatDate(proj.targetDate) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Calendar & Needs Attention (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Dashboard Calendar Widget */}
          <CalendarWidget
            projects={projects}
            tasks={urgentTasks}
            onSelectTask={(id) => setSelectedTaskId(id)}
          />

          {/* Needs Attention Feed */}
          <div className="bg-white border border-fx-border rounded-xl p-4 space-y-3 shadow-none">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Needs Immediate Attention</span>
            </h3>

            {urgentTasks.length === 0 ? (
              <p className="text-xs text-fx-text-muted">All studio deliverables are currently healthy.</p>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {urgentTasks.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => task.taskId && setSelectedTaskId(task.taskId)}
                    className={cn(
                      'py-2.5 first:pt-0 last:pb-0 hover:text-fx-green fx-transition text-xs',
                      task.taskId && 'cursor-pointer',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-fx-text-primary truncate">{task.title}</span>
                      <PriorityBadge priority={task.priority || TaskPriority.HIGH} compact />
                    </div>
                    <p className="text-[11px] text-fx-text-muted mt-0.5 truncate">
                      {task.project?.name || task.subtitle || task.reason || task.projectKey}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
