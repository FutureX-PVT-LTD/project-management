'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Users,
  Clock,
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


export function PMDashboard() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch PM Dashboard aggregated metrics
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', 'pm'],
    queryFn: () => api.get('/reports/pm-dashboard'),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const projects = asArray<any>(projectsData);
  const teamMembers = asArray<any>(dashboardData, 'teamWorkload');

  const urgentTasks = asArray<any>(dashboardData, 'needsAttention');

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
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
              Project Management Overview
            </h1>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Live delivery status, blocker monitoring, and workload allocation across active game projects.
            </p>
          </div>

          <Link href="/projects/new">
            <Button size="sm" variant="primary" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New Project
            </Button>
          </Link>
        </div>

        {/* Compact Segmented Summary Strip */}
        <div className="bg-white border border-fx-border rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-fx-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="text-fx-text-muted">Active Projects:</span>
            <span className="font-semibold text-fx-text-primary font-mono">{projects.length}</span>
          </div>
          <div className="h-3 w-px bg-fx-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-fx-text-muted">On Track:</span>
            <span className="font-semibold text-emerald-700 font-mono">
              {projects.filter((p: any) => p.health === ProjectHealth.ON_TRACK).length}
            </span>
          </div>
          <div className="h-3 w-px bg-fx-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-fx-text-muted">At Risk:</span>
            <span className="font-semibold text-amber-700 font-mono">
              {projects.filter((p: any) => p.health === ProjectHealth.AT_RISK).length}
            </span>
          </div>
          <div className="h-3 w-px bg-fx-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-fx-text-muted">Off Track:</span>
            <span className="font-semibold text-rose-700 font-mono">
              {projects.filter((p: any) => p.health === ProjectHealth.OFF_TRACK).length}
            </span>
          </div>
          <div className="h-3 w-px bg-fx-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-fx-text-muted">Needs Attention:</span>
            <span className="font-semibold text-red-700 font-mono">{urgentTasks.length}</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Managed Projects & Needs Attention (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Managed Projects Portfolio Table */}
          <div className="bg-white border border-fx-border rounded-lg overflow-hidden space-y-0">
            <div className="px-4 py-3 border-b border-fx-border flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">
                Active Game Projects ({projects.length})
              </h2>
              <Link
                href="/projects"
                className="text-xs text-fx-green font-medium hover:underline flex items-center gap-1"
              >
                <span>View Directory</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-fx-bg text-fx-text-secondary font-medium border-b border-fx-border">
                    <th className="py-2.5 px-4">Project</th>
                    <th className="py-2.5 px-3">Health</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3">Tasks</th>
                    <th className="py-2.5 px-4 text-right">Target Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60 text-fx-text-primary">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-fx-text-muted">
                        No projects created yet.
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
                            <p className="text-[11px] text-fx-text-muted truncate max-w-xs font-mono">
                        {proj.key || proj.code}
                            </p>
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <HealthBadge health={proj.health} reason={proj.healthReason} />
                        </td>
                        <td className="py-3 px-3 w-32">
                          <Progress value={proj.progress || 0} showLabel={true} size="xs" />
                        </td>
                        <td className="py-3 px-3 font-mono text-fx-text-secondary">
                          {proj.completedTasksCount || proj.stats?.completedTasks || 0}/{proj.tasksCount || proj.stats?.totalTasks || 0}
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

          {/* Needs Attention Queue */}
          <div className="bg-white border border-fx-border rounded-lg overflow-hidden space-y-0">
            <div className="px-4 py-3 border-b border-fx-border flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-semantic-danger flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Needs Immediate Attention ({urgentTasks.length})</span>
              </h2>
            </div>

            {urgentTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-fx-text-muted">
                All assigned deliverables are progressing smoothly without active blockers or overdue alerts.
              </div>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {urgentTasks.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => task.taskId && setSelectedTaskId(task.taskId)}
                    className={cn(
                      'p-3.5 sm:p-4 hover:bg-fx-bg-hover fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                      task.taskId && 'cursor-pointer',
                    )}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-fx-text-muted text-[11px] shrink-0">
                          {task.humanId || task.projectKey || task.type}
                        </span>
                        <span className="font-semibold text-fx-text-primary truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-fx-text-secondary">
                        <span className="font-medium text-fx-text-primary">{task.project?.name || task.reason || task.subtitle}</span>
                        {task.assignee && (
                          <span>
                            • Assignee: {task.assignee.firstName} {task.assignee.lastName}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-fx-semantic-danger font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <PriorityBadge priority={task.priority || TaskPriority.HIGH} />
                      <StatusPill status={task.status || task.type} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Calendar & Team Workload (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Dashboard Calendar Widget */}
          <CalendarWidget
            projects={projects}
            tasks={urgentTasks}
            onSelectTask={(id) => setSelectedTaskId(id)}
          />

          <div className="bg-white border border-fx-border rounded-xl p-4 space-y-3 shadow-none">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>Team Workload</span>
              </h3>

              <Link
                href="/team"
                className="text-[11px] text-fx-green font-medium hover:underline flex items-center gap-1"
              >
                <span>Details</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {teamMembers.length === 0 ? (
              <p className="text-xs text-fx-text-muted">No team workload data available.</p>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {teamMembers.slice(0, 6).map((member: any) => {
                  const person = member.user || member;
                  const activeTasks = member.assignedTasksCount || member.activeTasksCount || member.assignedTasks?.length || 0;
                  return (
                    <div key={person.id || member.userId} className="py-2.5 first:pt-0 last:pb-0 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fx-text-primary truncate">
                          {person.firstName} {person.lastName}
                        </span>
                        <span className="font-mono text-[11px] text-fx-text-secondary">
                          {activeTasks} active
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-fx-text-muted">
                        <span className="truncate">{person.jobTitle || 'Team Member'}</span>
                        <span
                          className={cn(
                            'text-[10px] uppercase font-semibold px-1 py-0.5 rounded border',
                            activeTasks >= 5
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200',
                          )}
                        >

                          {activeTasks >= 5 ? 'High Load' : 'Balanced'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
