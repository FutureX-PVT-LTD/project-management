'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { TaskStatus } from '@futurex/shared';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
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

  // Summary counts
  const activeProjects = projects.filter((p) => p.status !== 'ARCHIVED' && p.status !== 'COMPLETED');
  const activeProjectsCount = activeProjects.length || projects.length;
  const attentionCount = attentionItems.length;

  const totalReady = projects.reduce((acc, p) => acc + (p.readyTasksCount || 0), 0);
  const totalInProgress = projects.reduce((acc, p) => acc + (p.inProgressTasksCount || 0), 0);
  const totalWaiting = projects.reduce((acc, p) => acc + (p.waitingTasksCount || 0), 0);
  const totalInReview = projects.reduce((acc, p) => acc + (p.inReviewTasksCount || 0), 0);

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
    <div className="space-y-10">
      {/* SlideOver Task Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* 1. Open Editorial Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E4E7EB]">
        <div className="space-y-1">
          <h1 className="text-[32px] sm:text-[36px] font-semibold tracking-[-0.02em] text-[#15171A] leading-tight">
            Project Delivery
          </h1>
          <p className="text-[13px] text-[#5F6368]">
            {dashboardLoading || projectsLoading
              ? 'Aggregating project telemetry...'
              : `${activeProjectsCount} active project${activeProjectsCount === 1 ? '' : 's'} · ${
                  attentionCount === 0
                    ? 'Everything is currently on track'
                    : `${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention`
                }`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Native Segmented Control */}
          <div className="inline-flex items-center p-[3px] rounded-[10px] bg-[#F3F4F6] text-xs">
            <button
              type="button"
              onClick={() => setTimeScope('today')}
              className={cn(
                'px-3 py-1 rounded-[8px] font-medium fx-transition',
                timeScope === 'today'
                  ? 'bg-white text-[#15171A] shadow-xs'
                  : 'text-[#5F6368] hover:text-[#15171A]',
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('week')}
              className={cn(
                'px-3 py-1 rounded-[8px] font-medium fx-transition',
                timeScope === 'week'
                  ? 'bg-white text-[#15171A] shadow-xs'
                  : 'text-[#5F6368] hover:text-[#15171A]',
              )}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('month')}
              className={cn(
                'px-3 py-1 rounded-[8px] font-medium fx-transition',
                timeScope === 'month'
                  ? 'bg-white text-[#15171A] shadow-xs'
                  : 'text-[#5F6368] hover:text-[#15171A]',
              )}
            >
              This Month
            </button>
          </div>

          <Link href="/projects/new">
            <Button size="md" variant="primary" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Open Multi-Column Workspace Architecture */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-10 lg:gap-14 items-start">

        {/* MAIN COLUMN */}
        <div className="flex flex-col gap-10 min-w-0">

          {/* SECTION 1: ACTIVE PROJECTS (Open Project Summary Blocks) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E4E7EB]">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[#15171A]">
                Active Projects
              </h2>

              <Link
                href="/projects"
                className="text-[13px] text-[#0077E6] font-medium hover:text-[#0068CC] flex items-center gap-1 fx-transition"
              >
                <span>View All Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-[14px] font-medium text-[#15171A]">No active projects yet</p>
                <p className="text-[13px] text-[#5F6368] max-w-sm mx-auto">
                  Create your first game project to start tracking milestones and deliverables.
                </p>
                <div className="pt-2">
                  <Link href="/projects/new">
                    <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                      Create First Project
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((proj: any) => {
                  const doneCount = proj.completedTasksCount || proj.stats?.completedTasks || 0;
                  const inProgressCount = proj.inProgressTasksCount || 0;
                  const waitingCount = proj.waitingTasksCount || 0;
                  const inReviewCount = proj.inReviewTasksCount || 0;
                  const progressVal = Math.round(proj.progress || 0);
                  const projectMembers = proj.members || [];
                  const currentMilestone = (proj.milestones || []).find((m: any) => m.status !== 'COMPLETED') || proj.milestones?.[0];

                  return (
                    <div
                      key={proj.id}
                      className="rounded-[16px] bg-white border border-[#E4E7EB] p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#0088FF]/50 fx-transition space-y-4"
                    >
                      {/* Top Row: Title, Health */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <Link
                            href={`/projects/${proj.id}`}
                            className="text-[18px] sm:text-[20px] font-semibold text-[#15171A] hover:text-[#0077E6] fx-transition block truncate"
                          >
                            {proj.name}
                          </Link>
                          {proj.description && (
                            <p className="text-[13px] text-[#5F6368] line-clamp-1 max-w-2xl">
                              {proj.description}
                            </p>
                          )}
                        </div>

                        <HealthBadge health={proj.health} reason={proj.healthReason} />
                      </div>

                      {/* Middle: Clean Progress Meter (6px True Blue) */}
                      <div className="space-y-1.5 max-w-md">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-[14px] font-semibold font-mono text-[#15171A]">{progressVal}%</span>
                          <span className="text-[12px] text-[#92979E]">Project completion</span>
                        </div>
                        <div className="w-full bg-[#EDF0F3] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#0088FF] h-full rounded-full fx-transition"
                            style={{ width: `${progressVal}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Row: Inline Breakdown & Action Link */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-[13px]">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#5F6368]">
                          <span><strong className="font-semibold text-[#15171A]">{doneCount}</strong> Done</span>
                          <span>·</span>
                          <span><strong className="font-semibold text-[#15171A]">{inProgressCount}</strong> In Progress</span>
                          <span>·</span>
                          <span><strong className="font-semibold text-[#15171A]">{waitingCount}</strong> Waiting</span>
                          {currentMilestone && (
                            <>
                              <span>·</span>
                              <span className="text-[#92979E]">
                                Milestone: <span className="text-[#15171A] font-medium">{currentMilestone.name}</span>
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {projectMembers.length > 0 && (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {projectMembers.slice(0, 3).map((m: any, idx: number) => {
                                const u = m.user || m;
                                return (
                                  <div
                                    key={u.id || idx}
                                    className="w-5 h-5 rounded-full bg-[#EAF5FF] text-[#0068CC] text-[9px] font-semibold flex items-center justify-center ring-1 ring-white"
                                    title={`${u.firstName} ${u.lastName}`}
                                  >
                                    {getInitials(u.firstName, u.lastName)}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <Link
                            href={`/projects/${proj.id}`}
                            className="text-[13px] font-medium text-[#0077E6] hover:text-[#0068CC] flex items-center gap-1 fx-transition"
                          >
                            <span>Open Project</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 2: NEEDS ATTENTION */}
          <section className="space-y-3">
            <div className="pb-2.5 border-b border-[#E4E7EB]">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[#15171A]">
                Needs Attention
              </h2>
            </div>

            {attentionItems.length === 0 ? (
              <div className="py-2 flex items-center gap-3 text-[13px] text-[#5F6368]">
                <span className="text-[#287A5A] font-semibold text-sm">✓</span>
                <span>Everything is on track · No blocked, overdue or review items need your attention.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {attentionItems.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => item.taskId && setSelectedTaskId(item.taskId)}
                    className="rounded-[12px] bg-white border border-[#E8EBEF] px-4 py-3 flex items-center justify-between gap-4 text-[13px] cursor-pointer hover:border-[#0088FF] shadow-[0_1px_2px_rgba(15,23,42,0.02)] fx-transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#15171A] truncate">{item.title}</p>
                      <p className="text-[12px] text-[#92979E] mt-0.5">{item.project?.name || item.reason}</p>
                    </div>
                    <PriorityBadge priority={item.priority} compact />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 3: TEAM ACTIVITY */}
          <section className="space-y-3">
            <div className="pb-2.5 border-b border-[#E4E7EB] flex items-center justify-between">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[#15171A]">
                Team Activity
              </h2>
              <Link href="/team" className="text-[13px] text-[#0088FF] font-medium hover:text-[#0068CC] flex items-center gap-1">
                <span>View Capacity</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {teamMembers.length === 0 ? (
              <p className="py-4 text-[13px] text-[#92979E]">No active team workloads recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {teamMembers.slice(0, 5).map((member: any) => (
                  <div key={member.userId || member.id} className="rounded-[12px] bg-white border border-[#E8EBEF] p-3.5 flex items-center justify-between gap-4 text-[13px] shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-[#EAF5FF] text-[#0068CC] text-[11px] font-semibold flex items-center justify-center shrink-0 ring-1 ring-[#0088FF]/20">
                        {getInitials(member.firstName, member.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-[#15171A]">{member.firstName} {member.lastName}</span>
                          <span className="text-[12px] text-[#92979E]">{member.jobTitle || 'Team Member'}</span>
                        </div>
                        <p className="text-[12px] text-[#5F6368] truncate mt-0.5">
                          {member.activeTaskTitle ? `${member.activeTaskTitle} · ${member.activeTaskProgress || 0}%` : 'No tasks currently active'}
                        </p>
                      </div>
                    </div>

                    <Link href="/team" className="text-[12px] font-medium text-[#0077E6] hover:text-[#0068CC] shrink-0">
                      View Work →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 4: RECENT PROJECT ACTIVITY */}
          <section className="space-y-3">
            <div className="pb-2.5 border-b border-[#E4E7EB]">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[#15171A]">
                Recent Project Activity
              </h2>
            </div>

            {recentActivities.length === 0 ? (
              <p className="py-4 text-[13px] text-[#92979E]">No recent task updates recorded.</p>
            ) : (
              <div className="rounded-[16px] bg-white border border-[#E4E7EB] p-4 sm:p-5 divide-y divide-[#E8EBEF] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                {recentActivities.slice(0, 6).map((act: any) => {
                  const actor = act.user || {};
                  const task = act.task || {};
                  const cleanTaskId = formatTaskId(task.humanId);

                  return (
                    <div
                      key={act.id}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-[13px]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-full bg-[#F8F9FB] text-[#5F6368] font-medium text-[10px] flex items-center justify-center shrink-0 border border-[#E8EBEF]">
                          {getInitials(actor.firstName, actor.lastName)}
                        </div>
                        <p className="text-[#15171A] truncate text-[13px]">
                          <span className="font-semibold text-[#15171A]">{actor.firstName} {actor.lastName}</span>{' '}
                          <span className="text-[#5F6368]">{act.description || 'updated deliverable'}</span>
                          {task.humanId && (
                            <span className="font-mono text-[11px] ml-1.5 px-1 py-0.5 rounded-[4px] bg-[#F8F9FB] border border-[#E8EBEF] text-[#92979E]">
                              {cleanTaskId}
                            </span>
                          )}
                        </p>
                      </div>

                      <span className="font-mono text-[11px] text-[#92979E] shrink-0">
                        {formatTimeAgo(act.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* UTILITY COLUMN */}
        <div className="flex flex-col gap-8 min-w-0">

          {/* Delivery Pulse: Open Compact Stat Grid */}
          <div className="rounded-[14px] bg-white border border-[#E8EBEF] p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#5F6368]">
              Delivery Pulse
            </h2>

            <div className="grid grid-cols-2 gap-2.5 text-[13px]">
              <Link href="/my-work?tab=READY" className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#F8F9FB] hover:bg-[#F0F2F5] fx-transition group">
                <span className="flex items-center gap-2 text-[#5F6368] group-hover:text-[#15171A]">
                  <span className="w-2 h-2 rounded-full bg-[#248A5B]" />
                  <span>Ready</span>
                </span>
                <span className="font-mono font-semibold text-[15px] text-[#15171A]">{totalReady}</span>
              </Link>

              <Link href="/my-work?tab=IN_PROGRESS" className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#F8F9FB] hover:bg-[#F0F2F5] fx-transition group">
                <span className="flex items-center gap-2 text-[#5F6368] group-hover:text-[#15171A]">
                  <span className="w-2 h-2 rounded-full bg-[#0077E6]" />
                  <span>In Progress</span>
                </span>
                <span className="font-mono font-semibold text-[15px] text-[#15171A]">{totalInProgress}</span>
              </Link>

              <Link href="/my-work?tab=WAITING" className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#F8F9FB] hover:bg-[#F0F2F5] fx-transition group">
                <span className="flex items-center gap-2 text-[#5F6368] group-hover:text-[#15171A]">
                  <span className="w-2 h-2 rounded-full bg-[#A96F12]" />
                  <span>Waiting</span>
                </span>
                <span className="font-mono font-semibold text-[15px] text-[#15171A]">{totalWaiting}</span>
              </Link>

              <Link href="/my-work?tab=REVIEW" className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#F8F9FB] hover:bg-[#F0F2F5] fx-transition group">
                <span className="flex items-center gap-2 text-[#5F6368] group-hover:text-[#15171A]">
                  <span className="w-2 h-2 rounded-full bg-[#7558B8]" />
                  <span>In Review</span>
                </span>
                <span className="font-mono font-semibold text-[15px] text-[#15171A]">{totalInReview}</span>
              </Link>
            </div>
          </div>

          {/* Upcoming Deadlines: Open List */}
          <div className="rounded-[14px] bg-white border border-[#E8EBEF] p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#5F6368]">
                Upcoming Deadlines
              </h2>
              <Link
                href="/calendar"
                className="text-[12px] font-medium text-[#0077E6] hover:text-[#0068CC] fx-transition"
              >
                Calendar →
              </Link>
            </div>

            {allUpcomingItems.length === 0 ? (
              <p className="text-[13px] text-[#92979E]">No upcoming deadlines.</p>
            ) : (
              <div className="divide-y divide-[#E8EBEF]">
                {allUpcomingItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => item.type === 'TASK' && setSelectedTaskId(item.id)}
                    className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-2 text-[13px] cursor-pointer hover:text-[#0077E6] fx-transition"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-medium text-[#15171A] truncate">{item.title}</p>
                      <p className="text-[11px] text-[#92979E] font-mono">{item.humanId}</p>
                    </div>
                    <span className="font-mono text-[12px] text-[#5F6368] shrink-0">
                      {formatDate(item.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open Calendar Section (Borderless) */}
          <CalendarWidget
            tasks={projects.flatMap((p: any) => p.tasks || [])}
            milestones={projects.flatMap((p: any) => p.milestones || [])}
            projects={projects}
            onSelectTask={(id) => setSelectedTaskId(id)}
            borderless
            title="Schedule"
          />

        </div>

      </div>
    </div>
  );
}
