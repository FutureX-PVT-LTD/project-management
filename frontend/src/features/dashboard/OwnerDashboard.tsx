'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Flame,
  Briefcase,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { formatDate, cn } from '@/lib/utils';

export function OwnerDashboard() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: () => api.get('/reports/owner-dashboard'),
  });

  const metrics = data?.metrics || {
    totalProjects: 0,
    activeProjects: 0,
    onTrackProjects: 0,
    atRiskProjects: 0,
    offTrackProjects: 0,
    completedProjects: 0,
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    blockedTasks: 0,
    tasksDueThisWeek: 0,
    totalUsers: 0,
  };

  const portfolio = (data?.portfolio as any[]) || [];
  const needsAttention = (data?.needsAttention as any[]) || [];

  return (
    <div className="space-y-6">
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      {/* Header */}
      <div className="border-b border-fx-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
            Company Delivery Portfolio • FutureX
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            Executive studio overview across all active projects, milestone deadlines, and blockers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 text-xs font-semibold text-fx-green-700 hover:text-fx-green-800 hover:underline"
          >
            Studio Reports <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top 6 KPI Summary Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Projects */}
        <div className="bg-white p-3.5 rounded-[10px] border border-fx-border shadow-card">
          <span className="text-[11px] text-fx-text-muted font-medium block">Active Projects</span>
          <span className="text-xl font-bold text-fx-text-primary mt-0.5 block">
            {metrics.activeProjects}
          </span>
        </div>

        {/* On Track */}
        <div className="bg-white p-3.5 rounded-[10px] border border-[#C6E4D3] bg-fx-green-50/50 shadow-card">
          <span className="text-[11px] text-fx-green-900 font-semibold block">On Track</span>
          <span className="text-xl font-bold text-fx-green-900 mt-0.5 block">
            {metrics.onTrackProjects}
          </span>
        </div>

        {/* At Risk */}
        <div className="bg-white p-3.5 rounded-[10px] border border-[#FCE6BD] bg-[#FEF6E6]/50 shadow-card">
          <span className="text-[11px] text-fx-semantic-warning font-semibold block">At Risk</span>
          <span className="text-xl font-bold text-fx-semantic-warning mt-0.5 block">
            {metrics.atRiskProjects}
          </span>
        </div>

        {/* Blocked Tasks */}
        <div className="bg-white p-3.5 rounded-[10px] border border-[#FAD3D3] bg-[#FDF2F2]/50 shadow-card">
          <span className="text-[11px] text-fx-semantic-danger font-semibold block">
            Blocked Tasks
          </span>
          <span className="text-xl font-bold text-fx-semantic-danger mt-0.5 block">
            {metrics.blockedTasks}
          </span>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white p-3.5 rounded-[10px] border border-fx-border shadow-card">
          <span className="text-[11px] text-fx-text-muted font-medium block">Overdue Tasks</span>
          <span className="text-xl font-bold text-fx-semantic-danger mt-0.5 block">
            {metrics.overdueTasks}
          </span>
        </div>

        {/* Due This Week */}
        <div className="bg-white p-3.5 rounded-[10px] border border-fx-border shadow-card">
          <span className="text-[11px] text-fx-text-muted font-medium block">Due This Week</span>
          <span className="text-xl font-bold text-fx-text-primary mt-0.5 block">
            {metrics.tasksDueThisWeek}
          </span>
        </div>
      </div>

      {/* Main 65% / 35% Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Project Portfolio Table (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card padding="none" className="bg-white">
            <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fx-text-primary tracking-tight">
                Studio Project Portfolio
              </h2>
              <span className="text-[11px] text-fx-text-muted font-mono font-medium">
                {portfolio.length} Projects
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-fx-text-muted">
                Loading portfolio data...
              </div>
            ) : portfolio.length === 0 ? (
              <div className="p-8 text-center text-xs text-fx-text-muted">No projects found.</div>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {portfolio.map((proj: any) => (
                  <div key={proj.id} className="p-4 hover:bg-fx-bg-subtle fx-transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="h-5 px-1.5 rounded bg-fx-green-50 text-fx-green-900 font-bold text-[11px] flex items-center justify-center font-mono border border-fx-green-100">
                            {proj.key}
                          </span>
                          <Link
                            href={`/projects/${proj.id}`}
                            className="font-semibold text-sm text-fx-text-primary hover:text-fx-green-700 fx-transition"
                          >
                            {proj.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-fx-text-muted pl-7">
                          <span>PM: {proj.projectManager ? `${proj.projectManager.firstName} ${proj.projectManager.lastName}` : 'Unassigned'}</span>
                          {proj.healthReason && <span>• {proj.healthReason}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 pl-7 sm:pl-0">
                        <div className="w-24 hidden md:block">
                          <Progress value={proj.progress || 0} showLabel={true} size="xs" />
                        </div>
                        <HealthBadge health={proj.health} />
                        <span className="text-[11px] text-fx-text-muted font-medium min-w-16 text-right">
                          {formatDate(proj.targetDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Needs Attention (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card padding="none" className="bg-white">
            <div className="px-4 py-3.5 border-b border-fx-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-fx-semantic-danger" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-muted">
                  Cross-Project Attention
                </h3>
              </div>
            </div>

            {needsAttention.length === 0 ? (
              <div className="p-6 text-center text-xs text-fx-text-muted">
                All projects are healthy and on track.
              </div>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {needsAttention.slice(0, 8).map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-3.5 hover:bg-fx-bg-subtle cursor-pointer fx-transition text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-fx-text-muted text-[11px]">
                        {task.humanId}
                      </span>
                      <StatusPill status={task.status} size="xs" />
                    </div>
                    <p className="font-semibold text-fx-text-primary line-clamp-1">{task.title}</p>
                    <p className="text-[11px] text-fx-text-muted">
                      {task.project?.name} • {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
