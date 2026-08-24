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
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Inbox,
  Flame,
  CheckSquare,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { formatDate, cn } from '@/lib/utils';

export function PMDashboard() {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pm-dashboard'],
    queryFn: () => api.get('/reports/pm-dashboard'),
  });

  const metrics = data?.metrics || {
    managedProjectsCount: 0,
    totalTasksCount: 0,
    overdueCount: 0,
    blockedCount: 0,
    awaitingReviewCount: 0,
    dueThisWeekCount: 0,
  };

  const projects = (data?.projects as any[]) || [];
  const needsAttention = (data?.needsAttention as any[]) || [];
  const teamWorkload = (data?.teamWorkload as any[]) || [];

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
            Execution Overview • {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            Active project health, blockers, delivery milestones, and team workload capacity.
          </p>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs font-semibold text-fx-green-700 hover:text-fx-green-800 hover:underline"
        >
          View all projects <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Top 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Managed Projects */}
        <div className="bg-white p-3.5 rounded-[10px] border border-fx-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-text-muted font-medium block">
              Active Projects
            </span>
            <span className="text-xl font-bold text-fx-text-primary mt-0.5 block">
              {metrics.managedProjectsCount}
            </span>
          </div>
          <FolderKanban className="w-5 h-5 text-fx-text-muted/60" />
        </div>

        {/* Awaiting Review */}
        <div className="bg-white p-3.5 rounded-[10px] border border-[#FCE6BD] bg-[#FEF6E6]/50 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-semantic-warning font-semibold block">
              Awaiting Review
            </span>
            <span className="text-xl font-bold text-fx-semantic-warning mt-0.5 block">
              {metrics.awaitingReviewCount}
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-fx-semantic-warning" />
        </div>

        {/* Blocked Tasks */}
        <div className="bg-white p-3.5 rounded-[10px] border border-[#FAD3D3] bg-[#FDF2F2]/50 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-semantic-danger font-semibold block">
              Blocked Tasks
            </span>
            <span className="text-xl font-bold text-fx-semantic-danger mt-0.5 block">
              {metrics.blockedCount}
            </span>
          </div>
          <AlertCircle className="w-5 h-5 text-fx-semantic-danger" />
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white p-3.5 rounded-[10px] border border-fx-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] text-fx-text-muted font-medium block">Overdue Tasks</span>
            <span className="text-xl font-bold text-fx-semantic-danger mt-0.5 block">
              {metrics.overdueCount}
            </span>
          </div>
          <Clock className="w-5 h-5 text-fx-text-muted/60" />
        </div>
      </div>

      {/* Main 65% / 35% Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Projects Overview & Needs Attention (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Managed Projects Portfolio Table */}
          <Card padding="none" className="bg-white">
            <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fx-text-primary">
                Managed Projects Portfolio
              </h2>
              <span className="text-[11px] text-fx-text-muted font-mono font-medium">
                {projects.length} Active
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-fx-text-muted">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-xs text-fx-text-muted">
                No managed projects assigned.
              </div>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {projects.map((proj: any) => (
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
                        {proj.healthReason && (
                          <p className="text-xs text-fx-text-secondary pl-7">
                            {proj.healthReason}
                          </p>
                        )}
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

          {/* Needs Attention Queue */}
          {needsAttention.length > 0 && (
            <Card padding="none" className="bg-white">
              <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-fx-semantic-danger" />
                  <h2 className="text-sm font-semibold text-fx-text-primary">
                    Needs Immediate Attention ({needsAttention.length})
                  </h2>
                </div>
              </div>

              <div className="divide-y divide-fx-border/60">
                {needsAttention.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-3.5 hover:bg-fx-bg-subtle cursor-pointer fx-transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-fx-text-muted text-[11px]">
                          {task.humanId}
                        </span>
                        <span className="font-semibold text-fx-text-primary truncate">
                          {task.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-fx-text-muted">
                        {task.project?.name} • Assigned to {task.assignee?.firstName}{' '}
                        {task.assignee?.lastName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <StatusPill status={task.status} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Team Workload (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card padding="none" className="bg-white">
            <div className="px-4 py-3.5 border-b border-fx-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-fx-text-muted" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-muted">
                  Team Workload & Capacity
                </h3>
              </div>
            </div>

            {teamWorkload.length === 0 ? (
              <div className="p-6 text-center text-xs text-fx-text-muted">
                No active workload data available.
              </div>
            ) : (
              <div className="divide-y divide-fx-border/60">
                {teamWorkload.map((m: any) => (
                  <div key={m.user.id} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={m.user.avatarUrl}
                          firstName={m.user.firstName}
                          lastName={m.user.lastName}
                          size="xs"
                        />
                        <span className="font-semibold text-xs text-fx-text-primary">
                          {m.user.firstName} {m.user.lastName}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-fx-text-muted">
                        {m.activeTasksCount} active
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-fx-bg-subtle text-fx-text-secondary border border-fx-border">
                        {m.inProgressCount} in progress
                      </span>
                      {m.blockedCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-fx-semantic-danger border border-red-100 font-semibold">
                          {m.blockedCount} blocked
                        </span>
                      )}
                    </div>
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
