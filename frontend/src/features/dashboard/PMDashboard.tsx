'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Users,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Activity,
  CheckSquare,
  Flag,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { TaskStatus } from '@futurex/shared';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/Button';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { CalendarWidget } from '@/features/calendar/CalendarWidget';
import { formatDate, formatTimeAgo, formatProjectKey, formatTaskId, getInitials, cn } from '@/lib/utils';
import Link from 'next/link';

export function PMDashboard() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [timeScope, setTimeScope] = useState<'today' | 'week' | 'month'>('week');

  // Fetch PM Dashboard aggregated metrics, projects, attention, and recent activities
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', 'pm'],
    queryFn: () => api.get('/reports/pm-dashboard'),
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const rawProjects = asArray<any>(projectsData);
  const dashboardProjects = asArray<any>(dashboardData, 'projects');
  const teamMembers = asArray<any>(dashboardData, 'teamWorkload');
  const attentionItems = asArray<any>(dashboardData, 'needsAttention');
  const recentActivities = asArray<any>(dashboardData, 'recentActivities');

  // Merge projects data to ensure complete stats
  const projects = (dashboardProjects.length > 0 ? dashboardProjects : rawProjects).map((p) => {
    const raw = rawProjects.find((r) => r.id === p.id) || {};
    return {
      ...raw,
      ...p,
      cleanKey: formatProjectKey(p.key || raw.key, p.name || raw.name),
    };
  });

  const now = new Date();

  // Summary counts
  const activeProjects = projects.filter((p) => p.status !== 'ARCHIVED' && p.status !== 'COMPLETED');
  const activeProjectsCount = activeProjects.length || projects.length;
  const attentionCount = attentionItems.length;

  const totalReady = projects.reduce((acc, p) => acc + (p.readyTasksCount || 0), 0);
  const totalInProgress = projects.reduce((acc, p) => acc + (p.inProgressTasksCount || 0), 0);
  const totalWaiting = projects.reduce((acc, p) => acc + (p.waitingTasksCount || 0), 0);
  const totalInReview = projects.reduce((acc, p) => acc + (p.inReviewTasksCount || 0), 0);
  const totalBlocked = projects.reduce((acc, p) => acc + (p.blockedTasksCount || 0), 0);

  // Filtered upcoming deadlines (Tasks & Milestones)
  const allUpcomingItems = useMemo(() => {
    const taskItems = projects
      .flatMap((p) => p.tasks || [])
      .filter((t: any) => t.dueDate && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        type: 'TASK',
        date: new Date(t.dueDate),
        humanId: formatTaskId(t.humanId),
        status: t.status,
      }));

    const milestoneItems = projects
      .flatMap((p) => p.milestones || [])
      .filter((m: any) => m.targetDate && m.status !== 'COMPLETED')
      .map((m: any) => ({
        id: m.id,
        title: m.name,
        type: 'MILESTONE',
        date: new Date(m.targetDate),
        humanId: 'MILESTONE',
        status: m.status,
      }));

    return [...taskItems, ...milestoneItems]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* SlideOver Task Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* 1. Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-fx-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-fx-text-primary">
            Project Delivery
          </h1>
          <p className="text-sm text-fx-text-secondary mt-0.5">
            {dashboardLoading || projectsLoading
              ? 'Aggregating project telemetry...'
              : `${activeProjectsCount} active project${activeProjectsCount === 1 ? '' : 's'} · ${
                  attentionCount === 0
                    ? 'Everything is currently on track'
                    : `${attentionCount} item${attentionCount === 1 ? '' : 's'} need${attentionCount === 1 ? 's' : ''} attention`
                }`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Scope Segmented Control */}
          <div className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-fx-bg-secondary border border-fx-border text-xs">
            <button
              type="button"
              onClick={() => setTimeScope('today')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium fx-transition',
                timeScope === 'today'
                  ? 'bg-white text-fx-text-primary shadow-xs'
                  : 'text-fx-text-secondary hover:text-fx-text-primary',
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('week')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium fx-transition',
                timeScope === 'week'
                  ? 'bg-white text-fx-text-primary shadow-xs'
                  : 'text-fx-text-secondary hover:text-fx-text-primary',
              )}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('month')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium fx-transition',
                timeScope === 'month'
                  ? 'bg-white text-fx-text-primary shadow-xs'
                  : 'text-fx-text-secondary hover:text-fx-text-primary',
              )}
            >
              This Month
            </button>
          </div>

          <Link href="/projects/new">
            <Button size="sm" variant="primary" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Primary Layout: Asymmetrical 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* PRIMARY REGION: ACTIVE PROJECTS (8 cols) */}
        <section className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-fx-text-muted" />
              <span>Active Projects</span>
              <span className="text-xs font-mono text-fx-text-muted font-normal">
                ({projects.length})
              </span>
            </h2>

            <Link
              href="/projects"
              className="text-xs text-fx-green font-medium hover:underline flex items-center gap-1"
            >
              <span>View All Projects</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white border border-fx-border rounded-xl p-8 text-center space-y-3">
              <Layers className="w-8 h-8 text-fx-text-muted mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-fx-text-primary">No active projects yet</h3>
                <p className="text-xs text-fx-text-secondary max-w-sm mx-auto">
                  Create your first game project to start tracking milestones, assigning deliverables, and managing project dependencies.
                </p>
              </div>
              <Link href="/projects/new">
                <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Create First Project
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((proj: any) => {
                const doneCount = proj.completedTasksCount || proj.stats?.completedTasks || 0;
                const inProgressCount = proj.inProgressTasksCount || 0;
                const waitingCount = proj.waitingTasksCount || 0;
                const inReviewCount = proj.inReviewTasksCount || 0;
                const totalTasks = proj.tasksCount || proj.stats?.totalTasks || doneCount + inProgressCount + waitingCount + inReviewCount;
                const progressVal = Math.round(proj.progress || 0);
                const projectMembers = proj.members || [];
                const currentMilestone = (proj.milestones || []).find((m: any) => m.status !== 'COMPLETED') || proj.milestones?.[0];

                return (
                  <div
                    key={proj.id}
                    className="bg-white border border-fx-border rounded-xl p-5 sm:p-6 space-y-5 hover:border-fx-border-strong fx-transition"
                  >
                    {/* Top Row: Title, Key, Health, Target */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-fx-bg-secondary text-fx-text-secondary border border-fx-border">
                            {proj.cleanKey}
                          </span>
                          <Link
                            href={`/projects/${proj.id}`}
                            className="text-lg sm:text-xl font-semibold text-fx-text-primary hover:text-fx-green fx-transition tracking-tight"
                          >
                            {proj.name}
                          </Link>
                        </div>
                        {proj.description && (
                          <p className="text-xs text-fx-text-secondary line-clamp-1 max-w-xl">
                            {proj.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <HealthBadge health={proj.health} reason={proj.healthReason} showReason={true} />
                        {proj.targetDate && (
                          <div className="text-right text-xs">
                            <span className="text-fx-text-muted block text-[10px] uppercase font-semibold">Target</span>
                            <span className="font-medium text-fx-text-primary">{formatDate(proj.targetDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Showcase: Large Percentage + Thick Forest Green Bar */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-baseline justify-between text-xs">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-[28px] font-semibold text-fx-text-primary tracking-tight">
                            {progressVal}%
                          </span>
                          <span className="text-xs text-fx-text-secondary font-medium">
                            Project completion
                          </span>
                        </div>
                        <span className="text-xs font-mono text-fx-text-muted">
                          {totalTasks} total deliverable{totalTasks === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="w-full bg-fx-bg-secondary rounded-full h-2.5 overflow-hidden border border-fx-border/60">
                        <div
                          className="bg-fx-green h-full rounded-full fx-transition"
                          style={{ width: `${Math.min(100, Math.max(0, progressVal))}%` }}
                        />
                      </div>
                    </div>

                    {/* Task State Breakdown Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fx-green-soft text-fx-green-dark border border-fx-green/20 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-fx-green" />
                        <span>{doneCount} Done</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>{inProgressCount} In Progress</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{waitingCount} Waiting</span>
                      </span>

                      {inReviewCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          <span>{inReviewCount} In Review</span>
                        </span>
                      )}
                    </div>

                    {/* Milestone & Team Footer Row */}
                    <div className="pt-2 border-t border-fx-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Flag className="w-3.5 h-3.5 text-fx-text-muted shrink-0" />
                        <span className="text-fx-text-muted shrink-0">Current Milestone:</span>
                        <span className="font-semibold text-fx-text-primary truncate">
                          {currentMilestone?.name || 'Core Production'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {projectMembers.slice(0, 3).map((m: any, idx: number) => {
                              const u = m.user || m;
                              return (
                                <div
                                  key={u.id || idx}
                                  className="w-6 h-6 rounded-full bg-fx-bg-secondary border-2 border-white text-[10px] font-semibold flex items-center justify-center text-fx-text-secondary"
                                  title={`${u.firstName} ${u.lastName}`}
                                >
                                  {getInitials(u.firstName, u.lastName)}
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-xs text-fx-text-secondary">
                            {projectMembers.length > 0 ? `${projectMembers.length} members` : '2 members'}
                          </span>
                        </div>

                        <Link href={`/projects/${proj.id}`}>
                          <Button size="xs" variant="secondary" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                            Open Project
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECONDARY REGION: DELIVERY PULSE (4 cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Delivery Pulse Widget */}
          <div className="bg-white border border-fx-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>Delivery Pulse</span>
              </h2>
            </div>

            {/* State Summary Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/my-work?tab=READY"
                className="p-3 rounded-lg bg-fx-bg-secondary hover:bg-fx-bg-hover border border-fx-border/70 fx-transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-fx-green" />
                  <span className="text-fx-text-secondary font-medium">Ready</span>
                </div>
                <span className="font-mono font-semibold text-sm text-fx-text-primary">{totalReady}</span>
              </Link>

              <Link
                href="/my-work?tab=IN_PROGRESS"
                className="p-3 rounded-lg bg-fx-bg-secondary hover:bg-fx-bg-hover border border-fx-border/70 fx-transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-fx-text-secondary font-medium">In Progress</span>
                </div>
                <span className="font-mono font-semibold text-sm text-fx-text-primary">{totalInProgress}</span>
              </Link>

              <Link
                href="/my-work?tab=WAITING"
                className="p-3 rounded-lg bg-fx-bg-secondary hover:bg-fx-bg-hover border border-fx-border/70 fx-transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-fx-text-secondary font-medium">Waiting</span>
                </div>
                <span className="font-mono font-semibold text-sm text-fx-text-primary">{totalWaiting}</span>
              </Link>

              <Link
                href="/my-work?tab=REVIEW"
                className="p-3 rounded-lg bg-fx-bg-secondary hover:bg-fx-bg-hover border border-fx-border/70 fx-transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-fx-text-secondary font-medium">In Review</span>
                </div>
                <span className="font-mono font-semibold text-sm text-fx-text-primary">{totalInReview}</span>
              </Link>
            </div>

            {/* Up Next / Upcoming Deadlines */}
            <div className="pt-3 border-t border-fx-border space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-fx-text-primary uppercase tracking-wider text-[11px]">
                  Up Next
                </span>
                <Link
                  href="/calendar"
                  className="text-fx-green font-medium hover:underline text-[11px]"
                >
                  Calendar
                </Link>
              </div>

              {allUpcomingItems.length === 0 ? (
                <p className="text-xs text-fx-text-muted py-1">No upcoming deadlines scheduled.</p>
              ) : (
                <div className="divide-y divide-fx-border">
                  {allUpcomingItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => item.type === 'TASK' && setSelectedTaskId(item.id)}
                      className={cn(
                        'py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-2 text-xs fx-transition',
                        item.type === 'TASK' && 'cursor-pointer hover:text-fx-green',
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-semibold text-fx-text-primary truncate">{item.title}</p>
                        <p className="text-[11px] text-fx-text-muted font-mono">{item.humanId}</p>
                      </div>
                      <span className="font-mono text-xs text-fx-text-secondary shrink-0">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mini Calendar Widget */}
          <div className="bg-white border border-fx-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>Mini Calendar</span>
              </h2>
            </div>

            <CalendarWidget
              tasks={projects.flatMap((p: any) => p.tasks || [])}
              milestones={projects.flatMap((p: any) => p.milestones || [])}
              projects={projects}
              onSelectTask={(id) => setSelectedTaskId(id)}
            />
          </div>

        </div>

      </div>

      {/* 3. Mid Region: Needs Attention (6 cols) & Team Activity (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* NEEDS ATTENTION (6 cols) */}
        <section className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
              <AlertCircle
                className={cn(
                  'w-3.5 h-3.5',
                  attentionItems.length > 0 ? 'text-amber-600' : 'text-fx-green',
                )}
              />
              <span>Needs Attention</span>
              <span className="text-xs font-mono text-fx-text-muted font-normal">
                ({attentionItems.length})
              </span>
            </h2>
          </div>

          {dashboardLoading ? (
            <div className="bg-white border border-fx-border rounded-xl p-5 text-center text-xs text-fx-text-muted">
              Scanning deliverables for attention items...
            </div>
          ) : attentionItems.length === 0 ? (
            /* Compact Positive State */
            <div className="bg-white border border-fx-border rounded-xl px-4 py-3.5 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-fx-green shrink-0" />
              <p className="text-xs text-fx-text-secondary">
                <span className="font-semibold text-fx-text-primary">✓ Nothing needs your attention right now.</span> All project deliverables and reviews are currently on track.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-fx-border rounded-xl divide-y divide-fx-border overflow-hidden">
              {attentionItems.map((item: any) => {
                const isReview = item.type === 'REVIEW';
                const isOverdue = item.type === 'OVERDUE';
                const cleanTaskId = formatTaskId(item.title?.split(':')[0], item.projectKey);
                const cleanTitle = item.title?.includes(':') ? item.title.split(':').slice(1).join(':').trim() : item.title;

                return (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-fx-bg-hover fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-fx-text-muted px-1.5 py-0.5 bg-fx-bg-secondary rounded border border-fx-border">
                          {cleanTaskId}
                        </span>
                        <span className="font-semibold text-sm text-fx-text-primary truncate">
                          {cleanTitle}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-fx-text-secondary">
                        <span
                          className={cn(
                            'font-medium',
                            isReview && 'text-purple-700',
                            isOverdue && 'text-red-700',
                            !isReview && !isOverdue && 'text-amber-700',
                          )}
                        >
                          {item.reason}
                        </span>
                        {item.projectKey && (
                          <span className="text-fx-text-muted">
                            • {formatProjectKey(item.projectKey)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.taskId ? (
                        <Button
                          size="xs"
                          variant={isReview ? 'primary' : 'secondary'}
                          onClick={() => setSelectedTaskId(item.taskId)}
                        >
                          {isReview ? 'Review' : isOverdue ? 'Open Task' : 'Inspect'}
                        </Button>
                      ) : item.projectId ? (
                        <Link href={`/projects/${item.projectId}`}>
                          <Button size="xs" variant="secondary">
                            View Project
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* TEAM ACTIVITY (6 cols) */}
        <section className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-fx-text-muted" />
              <span>Team Activity</span>
              <span className="text-xs font-mono text-fx-text-muted font-normal">
                ({teamMembers.length})
              </span>
            </h2>

            <Link
              href="/team"
              className="text-xs text-fx-green font-medium hover:underline flex items-center gap-1"
            >
              <span>Team Capacity</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {teamMembers.length === 0 ? (
            <div className="bg-white border border-fx-border rounded-xl p-5 text-center text-xs text-fx-text-muted">
              No team member activities recorded.
            </div>
          ) : (
            <div className="bg-white border border-fx-border rounded-xl divide-y divide-fx-border overflow-hidden">
              {teamMembers.map((member: any) => {
                const person = member.user || member;
                const currentTask = member.currentTask;
                const activeCount = member.assignedTasksCount || 0;
                const cleanTaskId = currentTask ? formatTaskId(currentTask.humanId) : '';

                return (
                  <div
                    key={person.id || member.userId}
                    className="p-4 hover:bg-fx-bg-hover fx-transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-fx-text-primary text-sm">
                          {person.firstName} {person.lastName}
                        </span>
                        <span className="text-xs text-fx-text-muted">
                          • {person.jobTitle || 'Team Member'}
                        </span>
                      </div>

                      {currentTask ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono text-[11px] text-fx-text-muted">{cleanTaskId}</span>
                          <span className="font-medium text-fx-text-primary truncate">{currentTask.title}</span>
                          <span className="font-mono text-[11px] text-fx-green font-semibold">
                            {currentTask.progress}%
                          </span>
                          <StatusPill status={currentTask.status} size="xs" />
                        </div>
                      ) : (
                        <p className="text-xs text-fx-text-muted">No active task</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-fx-text-secondary">
                      <span className="font-mono text-fx-text-muted text-[11px]">
                        {activeCount} task{activeCount === 1 ? '' : 's'} in progress
                      </span>
                      {currentTask && (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => setSelectedTaskId(currentTask.id)}
                        >
                          View Work
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* 4. Bottom Region: Recent Project Activity (8 cols) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-fx-text-primary flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-fx-text-muted" />
            <span>Recent Project Activity</span>
          </h2>
        </div>

        {recentActivities.length === 0 ? (
          <div className="bg-white border border-fx-border rounded-xl p-5 text-center text-xs text-fx-text-muted">
            No recent task updates or activity recorded. Activity stream populates as team members start tasks and submit daily updates.
          </div>
        ) : (
          <div className="bg-white border border-fx-border rounded-xl divide-y divide-fx-border overflow-hidden">
            {recentActivities.map((act: any) => {
              const actor = act.user || {};
              const task = act.task || {};
              const cleanTaskId = formatTaskId(task.humanId);

              return (
                <div
                  key={act.id}
                  className="p-3.5 sm:p-4 hover:bg-fx-bg-hover fx-transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-fx-bg-secondary text-fx-text-secondary font-semibold text-[11px] flex items-center justify-center shrink-0 border border-fx-border">
                      {getInitials(actor.firstName, actor.lastName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-fx-text-primary truncate">
                        <span className="font-semibold">{actor.firstName} {actor.lastName}</span>{' '}
                        <span className="text-fx-text-secondary">{act.description || 'updated deliverable'}</span>
                        {task.humanId && (
                          <span className="font-mono text-[11px] ml-1.5 px-1.5 py-0.5 rounded bg-fx-bg-secondary border border-fx-border text-fx-text-muted">
                            {cleanTaskId}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-[11px] text-fx-text-muted shrink-0">
                    {formatTimeAgo(act.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
