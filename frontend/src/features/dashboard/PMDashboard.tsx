'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { TaskStatus } from '@futurex/shared';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { Button } from '@/components/ui/Button';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { CalendarWidget } from '@/features/calendar/CalendarWidget';
import { formatDate, formatTimeAgo, formatProjectKey, formatTaskId, getInitials, cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardGreeting } from './DashboardGreeting';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

function getProductMonogram(name: string, key?: string): string {
  if (key && key.length >= 2 && key.length <= 4) {
    return key.slice(0, 2).toUpperCase();
  }
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatTimelineDate(date: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const m = months[date.getMonth()];
  const d = date.getDate();
  return `${m} ${d}`;
}

export function PMDashboard() {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [timeScope, setTimeScope] = useState<'today' | 'week' | 'month'>('week');

  // Fetch PM Dashboard aggregated telemetry
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', 'pm'],
    queryFn: () => api.get('/reports/pm-dashboard'),
    staleTime: 20000,
  });

  const teamMembers = asArray<any>(dashboardData, 'teamWorkload');
  const attentionItems = asArray<any>(dashboardData, 'needsAttention');
  const reviewQueue = attentionItems.filter((item) => item.type === 'REVIEW');
  const operationalAttentionItems = attentionItems.filter((item) => item.type !== 'REVIEW');
  const recentActivities = asArray<any>(dashboardData, 'recentActivities');

  const projects = useMemo(
    () =>
      asArray<any>(dashboardData, 'projects').map((p) => ({
        ...p,
        cleanKey: formatProjectKey(p.key, p.name),
      })),
    [dashboardData],
  );

  // Summary telemetry
  const activeProjects = projects.filter((p) => p.status !== 'ARCHIVED' && p.status !== 'COMPLETED');
  const activeProjectsCount = activeProjects.length || projects.length;
  const attentionCount = attentionItems.length;

  const totalReady = projects.reduce((acc, p) => acc + (p.readyTasksCount || 0), 0);
  const totalInProgress = projects.reduce((acc, p) => acc + (p.inProgressTasksCount || 0), 0);
  const totalWaiting = projects.reduce((acc, p) => acc + (p.waitingTasksCount || 0), 0);
  const totalInReview = projects.reduce((acc, p) => acc + (p.inReviewTasksCount || 0), 0);
  const totalBlocked = projects.reduce((acc, p) => acc + (p.blockedTasksCount || 0), 0) || operationalAttentionItems.length;

  // Upcoming deadlines (Tasks & Milestones)
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
        projectName: t.project?.name || t.projectName,
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
        projectName: m.project?.name || m.projectName,
        status: m.status,
      }));

    return [...taskItems, ...milestoneItems]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [projects]);

  if (dashboardLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Task Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* 5. TOP PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[#E8ECF1]">
        <div>
          <h1 className="text-2xl sm:text-[30px] font-semibold text-[#17191C] tracking-tight">
            <DashboardGreeting userName={user?.firstName} />
          </h1>
          <p className="text-[13.5px] text-[#626A73] mt-1">
            Project Delivery · Track product execution, reviews and upcoming releases.
          </p>
          <div className="flex items-center gap-2 text-[12.5px] text-[#626A73] mt-1.5 font-medium">
            <span>{activeProjectsCount} active {activeProjectsCount === 1 ? 'product' : 'products'}</span>
            <span className="text-[#9098A2]">·</span>
            <span>
              {attentionCount === 0
                ? '0 items need attention'
                : `${attentionCount} ${attentionCount === 1 ? 'item needs' : 'items need'} attention`}
            </span>
            <span className="text-[#9098A2]">·</span>
            <span>{reviewQueue.length} awaiting review</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Scope Segmented Control */}
          <div className="inline-flex items-center p-0.5 rounded-[9px] bg-[#F8FAFC] border border-[#E8ECF1] text-xs">
            <button
              type="button"
              onClick={() => setTimeScope('today')}
              className={cn(
                'px-3 py-1.5 rounded-[7px] text-xs font-medium fx-transition',
                timeScope === 'today'
                  ? 'bg-white text-[#17191C] shadow-xs font-semibold'
                  : 'text-[#626A73] hover:text-[#17191C]',
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('week')}
              className={cn(
                'px-3 py-1.5 rounded-[7px] text-xs font-medium fx-transition',
                timeScope === 'week'
                  ? 'bg-white text-[#17191C] shadow-xs font-semibold'
                  : 'text-[#626A73] hover:text-[#17191C]',
              )}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('month')}
              className={cn(
                'px-3 py-1.5 rounded-[7px] text-xs font-medium fx-transition',
                timeScope === 'month'
                  ? 'bg-white text-[#17191C] shadow-xs font-semibold'
                  : 'text-[#626A73] hover:text-[#17191C]',
              )}
            >
              This Month
            </button>
          </div>

          <Link href="/projects/new">
            <Button size="sm" variant="primary" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New Product
            </Button>
          </Link>
        </div>
      </div>

      {/* 6. DELIVERY OVERVIEW STRIP: One compact high-level delivery strip */}
      <div className="rounded-[16px] bg-[#F8FAFC] border border-[#E8ECF1] p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#EEF1F4]">
          {/* Active Products */}
          <div className="px-3 sm:px-5 py-2 sm:py-1 first:pl-0 last:pr-0">
            <p className="font-mono text-2xl sm:text-[26px] font-semibold text-[#17191C] leading-none">
              {activeProjectsCount}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#626A73] mt-2">
              Active Products
            </p>
          </div>

          {/* In Progress */}
          <div className="px-3 sm:px-5 py-2 sm:py-1 first:pl-0 last:pr-0">
            <p className="font-mono text-2xl sm:text-[26px] font-semibold text-[#2563EB] leading-none">
              {totalInProgress}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#626A73] mt-2">
              In Progress
            </p>
          </div>

          {/* Waiting */}
          <div className="px-3 sm:px-5 py-2 sm:py-1 first:pl-0 last:pr-0">
            <p className="font-mono text-2xl sm:text-[26px] font-semibold text-[#A46A12] leading-none">
              {totalWaiting}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#626A73] mt-2">
              Waiting
            </p>
          </div>

          {/* In Review */}
          <div className="px-3 sm:px-5 py-2 sm:py-1 first:pl-0 last:pr-0">
            <p className="font-mono text-2xl sm:text-[26px] font-semibold text-[#7155A5] leading-none">
              {totalInReview}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#626A73] mt-2">
              In Review
            </p>
          </div>

          {/* Blocked */}
          <div className="px-3 sm:px-5 py-2 sm:py-1 first:pl-0 last:pr-0">
            <p className={cn(
              "font-mono text-2xl sm:text-[26px] font-semibold leading-none",
              totalBlocked > 0 ? "text-[#B54747]" : "text-[#17191C]"
            )}>
              {totalBlocked}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#626A73] mt-2">
              Blocked
            </p>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE (72%) & RIGHT RAIL (28% / 320px) WITH INDEPENDENT VERTICAL FLOW */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-7 lg:gap-8 items-start">

        {/* MAIN WORKSPACE COLUMN */}
        <div className="flex flex-col gap-7 min-w-0">

          {/* 8. NEEDS ATTENTION: One soft rounded container */}
          <section className="rounded-[16px] bg-white border border-[#E8ECF1] p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#EEF1F4]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#17191C]">
                    Needs Attention
                  </h2>
                  {attentionCount > 0 && (
                    <span className="font-mono text-[11.5px] font-semibold text-[#B54747] px-2 py-0.5 bg-[#FCEEEE] rounded-[5px]">
                      {attentionCount}
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-[#626A73] mt-0.5">
                  Work that requires your decision.
                </p>
              </div>

              <span className="text-[12px] text-[#9098A2] font-medium shrink-0 pt-0.5">
                {reviewQueue.length} {reviewQueue.length === 1 ? 'review' : 'reviews'} · {operationalAttentionItems.length} {operationalAttentionItems.length === 1 ? 'blocker' : 'blockers'}
              </span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="py-2.5 flex items-center gap-2.5 text-[13px] text-[#626A73]">
                <CheckCircle2 className="w-4 h-4 text-[#2F7D5B] shrink-0" />
                <span>Everything is on track. No items currently require escalation.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Review Required Rows */}
                {reviewQueue.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => item.taskId && setSelectedTaskId(item.taskId)}
                    className="p-3 sm:p-3.5 rounded-[12px] bg-[#FBF8FE] border border-[#F1EAFD] hover:border-[#E4D7F5] fx-transition flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#7155A5] shrink-0" />
                        <span className="text-[11.5px] font-semibold text-[#7155A5]">Review Required</span>
                        <span className="text-[12px] font-mono text-[#9098A2]">·</span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[4px] bg-white border border-[#E8ECF1] text-[#626A73]">
                          {item.humanId || item.projectKey}
                        </span>
                      </div>
                      <p className="text-[13.5px] font-semibold text-[#17191C] group-hover:text-[#7155A5] fx-transition truncate">
                        {item.title}
                      </p>
                      <p className="text-[12px] text-[#626A73] truncate">
                        <span className="font-medium text-[#17191C]">{item.assigneeName || 'Team member'}</span> submitted work at {item.progress || 95}% {item.projectName ? `· ${item.projectName}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-[12px] font-semibold text-[#7155A5]">
                        {item.progress || 95}% complete
                      </span>
                      <button
                        type="button"
                        className="px-2.5 py-1 text-[12px] font-medium text-[#7155A5] bg-white border border-[#E4D7F5] rounded-[7px] group-hover:bg-[#7155A5] group-hover:text-white fx-transition flex items-center gap-1 shadow-xs"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 fx-transition" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Operational Blockers Rows */}
                {operationalAttentionItems.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => item.taskId && setSelectedTaskId(item.taskId)}
                    className="p-3 sm:p-3.5 rounded-[12px] bg-[#FEF7F7] border border-[#FCE8E8] hover:border-[#F2C0C0] fx-transition flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#B54747] shrink-0" />
                        <span className="text-[11.5px] font-semibold text-[#B54747]">Blocked</span>
                        <span className="text-[12px] font-mono text-[#9098A2]">·</span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[4px] bg-white border border-[#E8ECF1] text-[#626A73]">
                          {item.humanId || item.projectKey}
                        </span>
                      </div>
                      <p className="text-[13.5px] font-semibold text-[#17191C] group-hover:text-[#B54747] fx-transition truncate">
                        {item.title}
                      </p>
                      <p className="text-[12px] text-[#626A73] truncate">
                        {item.reason || item.projectName || 'Waiting for resolution'}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 text-[12px] font-medium text-[#B54747] bg-white border border-[#F2C0C0] rounded-[7px] group-hover:bg-[#B54747] group-hover:text-white fx-transition flex items-center gap-1 shadow-xs shrink-0"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 fx-transition" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 10. ACTIVE PRODUCTS: Stacked Product Surfaces (Option A) */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#17191C]">
                  Active Products
                </h2>
                <p className="text-[12.5px] text-[#626A73] mt-0.5">
                  Deliverable tracking across core product workstreams.
                </p>
              </div>

              <Link
                href="/projects"
                className="text-[12.5px] text-[#2563EB] font-medium hover:text-[#1D4ED8] flex items-center gap-1 fx-transition"
              >
                <span>View all products</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-[16px] bg-white border border-[#E8ECF1] p-8 text-center space-y-2">
                <p className="text-[14px] font-semibold text-[#17191C]">No active products yet</p>
                <p className="text-[12.5px] text-[#626A73] max-w-sm mx-auto">
                  Create your first product to generate standard delivery checklists and monitor deliverables.
                </p>
                <div className="pt-2">
                  <Link href="/projects/new">
                    <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                      Create Product
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((proj: any) => {
                  const doneCount = proj.completedTasksCount || proj.stats?.completedTasks || 0;
                  const inProgressCount = proj.inProgressTasksCount || 0;
                  const waitingCount = proj.waitingTasksCount || 0;
                  const reviewCount = proj.inReviewTasksCount || 0;
                  const totalCount = proj.tasksCount || (doneCount + inProgressCount + waitingCount + reviewCount) || 1;
                  const progressVal = Math.round(proj.progress || (totalCount > 0 ? (doneCount / totalCount) * 100 : 0));
                  const currentMilestone = (proj.milestones || []).find((m: any) => m.status !== 'COMPLETED') || proj.milestones?.[0];
                  const monogram = getProductMonogram(proj.name, proj.cleanKey || proj.key);

                  return (
                    <Link
                      key={proj.id}
                      href={`/projects/${proj.id}`}
                      className="block rounded-[16px] bg-white border border-[#E9EDF2] p-5 hover:bg-[#FBFCFD] hover:border-[#DDE4EC] fx-transition cursor-pointer group space-y-3.5"
                    >
                      {/* Product Identity Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* 13. SQUIRCLE ICON CONTAINER (44x44, radius 12px) */}
                          <div className="w-11 h-11 rounded-[12px] bg-[#EEF4FF] border border-[#E8ECF1] flex items-center justify-center font-bold text-xs text-[#2563EB] shrink-0 group-hover:bg-[#E5EFFF] fx-transition shadow-xs">
                            {monogram}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[15.5px] font-semibold text-[#17191C] group-hover:text-[#2563EB] fx-transition truncate">
                                {proj.name}
                              </span>
                              <span className="font-mono text-[11px] text-[#626A73] px-1.5 py-0.5 bg-[#F8FAFC] rounded-[5px] border border-[#E8ECF1]">
                                {proj.cleanKey || proj.key}
                              </span>
                            </div>
                            <p className="text-[12.5px] text-[#626A73] mt-0.5 truncate">
                              {(proj.productType || 'Product').replace('_', ' ')} · {currentMilestone ? currentMilestone.name : 'Core Development'}
                            </p>
                          </div>
                        </div>

                        {/* Health Badge & Progress Percentage */}
                        <div className="flex items-center gap-3 shrink-0">
                          <HealthBadge health={proj.health} reason={proj.healthReason} />
                          <span className="font-mono text-[13.5px] font-semibold text-[#17191C]">
                            {progressVal}%
                          </span>
                        </div>
                      </div>

                      {/* 15. ELEGANT 6PX PROGRESS RAIL */}
                      <div className="w-full bg-[#F3F5F7] rounded-full h-[6px] overflow-hidden">
                        <div
                          className="bg-[#2563EB] h-full rounded-full fx-transition duration-300"
                          style={{ width: `${progressVal}%` }}
                        />
                      </div>

                      {/* 16. PRODUCT STATUS SUMMARY & INLINE METADATA */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[12px]">
                        <div className="flex flex-wrap items-center gap-2.5 text-[#626A73]">
                          <span className="font-medium text-[#17191C]">
                            {doneCount} of {totalCount} checklist items complete
                          </span>
                          <span className="text-[#9098A2]">·</span>
                          <span>{inProgressCount} active</span>
                          <span className="text-[#9098A2]">·</span>
                          <span>{waitingCount} waiting</span>
                          {reviewCount > 0 && (
                            <>
                              <span className="text-[#9098A2]">·</span>
                              <span className="text-[#7155A5] font-semibold">{reviewCount} review</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[12px] shrink-0">
                          <span className="text-[#626A73]">
                            {proj.targetDate ? `Target ${formatDate(proj.targetDate)}` : 'No deadline'}
                          </span>
                          <span className="text-[12px] font-medium text-[#2563EB] group-hover:text-[#1D4ED8] flex items-center gap-1 fx-transition">
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 fx-transition" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* 21. RECENT ACTIVITY: Soft rounded container with clean timeline rows */}
          <section className="rounded-[16px] bg-white border border-[#E8ECF1] p-5 sm:p-6 space-y-3.5">
            <div className="pb-2.5 border-b border-[#EEF1F4] flex items-center justify-between">
              <div>
                <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#17191C]">
                  Recent Activity
                </h2>
                <p className="text-[12.5px] text-[#626A73] mt-0.5">
                  Latest updates across product deliverables.
                </p>
              </div>
            </div>

            {recentActivities.length === 0 ? (
              <p className="py-2.5 text-[13px] text-[#9098A2]">No task updates recorded today.</p>
            ) : (
              <div className="divide-y divide-[#EEF1F4]">
                {recentActivities.slice(0, 5).map((act: any) => {
                  const actor = act.user || {};
                  const task = act.task || {};
                  const cleanTaskId = formatTaskId(task.humanId);

                  return (
                    <div
                      key={act.id}
                      className="py-3 flex items-center justify-between gap-3 text-[13px] first:pt-1 last:pb-1"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-full bg-[#F4F6F8] text-[#626A73] font-semibold text-[10.5px] flex items-center justify-center shrink-0 border border-[#E8ECF1]">
                          {getInitials(actor.firstName, actor.lastName)}
                        </div>
                        <p className="text-[#17191C] truncate text-[13px]">
                          <span className="font-semibold text-[#17191C]">{actor.firstName} {actor.lastName}</span>{' '}
                          <span className="text-[#626A73]">{act.description || 'updated deliverable'}</span>
                          {task.humanId && (
                            <span className="font-mono text-[11px] ml-2 px-1.5 py-0.5 rounded-[4px] bg-[#F8FAFC] border border-[#E8ECF1] text-[#626A73]">
                              {cleanTaskId}
                            </span>
                          )}
                        </p>
                      </div>

                      <span className="font-mono text-[11.5px] text-[#9098A2] shrink-0">
                        {formatTimeAgo(act.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* 17-20. RIGHT UTILITY RAIL: Independent Vertical Flow (Snapshot, Deadlines, Calendar, Review Queue) */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* 17. DELIVERY SNAPSHOT: Subtle rounded utility panel */}
          <section className="rounded-[14px] bg-[#F8FAFC] border border-[#E8ECF1] p-4 sm:p-5 space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#9098A2]">
              Delivery Snapshot
            </h2>

            <div className="divide-y divide-[#EEF1F4] text-[13px]">
              <Link
                href="/my-work?tab=READY"
                className="py-2.5 flex items-center justify-between hover:text-[#2563EB] fx-transition group first:pt-1"
              >
                <div className="flex items-center gap-2.5 text-[#626A73] group-hover:text-[#17191C]">
                  <span className="w-2 h-2 rounded-full bg-[#2F7D5B] shrink-0" />
                  <span className="font-medium">Ready</span>
                </div>
                <span className="font-mono font-semibold text-[#17191C]">{totalReady}</span>
              </Link>

              <Link
                href="/my-work?tab=IN_PROGRESS"
                className="py-2.5 flex items-center justify-between hover:text-[#2563EB] fx-transition group"
              >
                <div className="flex items-center gap-2.5 text-[#626A73] group-hover:text-[#17191C]">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                  <span className="font-medium">In Progress</span>
                </div>
                <span className="font-mono font-semibold text-[#17191C]">{totalInProgress}</span>
              </Link>

              <Link
                href="/my-work?tab=WAITING"
                className="py-2.5 flex items-center justify-between hover:text-[#2563EB] fx-transition group"
              >
                <div className="flex items-center gap-2.5 text-[#626A73] group-hover:text-[#17191C]">
                  <span className="w-2 h-2 rounded-full bg-[#A46A12] shrink-0" />
                  <span className="font-medium">Waiting</span>
                </div>
                <span className="font-mono font-semibold text-[#17191C]">{totalWaiting}</span>
              </Link>

              <Link
                href="/my-work?tab=REVIEW"
                className="py-2.5 flex items-center justify-between hover:text-[#2563EB] fx-transition group"
              >
                <div className="flex items-center gap-2.5 text-[#626A73] group-hover:text-[#17191C]">
                  <span className="w-2 h-2 rounded-full bg-[#7155A5] shrink-0" />
                  <span className="font-medium">In Review</span>
                </div>
                <span className="font-mono font-semibold text-[#17191C]">{totalInReview}</span>
              </Link>

              <Link
                href="/my-work?tab=BLOCKED"
                className="py-2.5 flex items-center justify-between hover:text-[#2563EB] fx-transition group last:pb-1"
              >
                <div className="flex items-center gap-2.5 text-[#626A73] group-hover:text-[#17191C]">
                  <span className="w-2 h-2 rounded-full bg-[#B54747] shrink-0" />
                  <span className="font-medium">Blocked</span>
                </div>
                <span className={cn("font-mono font-semibold", totalBlocked > 0 ? "text-[#B54747]" : "text-[#17191C]")}>
                  {totalBlocked}
                </span>
              </Link>
            </div>
          </section>

          {/* 20. REVIEW QUEUE: Quiet rounded utility panel */}
          {reviewQueue.length > 0 && (
            <section className="rounded-[14px] bg-white border border-[#E8ECF1] p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-[#17191C]">
                    Review Queue
                  </h2>
                  <span className="font-mono text-[11px] font-semibold text-[#7155A5] px-1.5 py-0.2 bg-[#F5F1FB] rounded-[4px]">
                    {reviewQueue.length}
                  </span>
                </div>
                <Link
                  href="/my-work?tab=REVIEW"
                  className="text-[11.5px] font-medium text-[#2563EB] hover:text-[#1D4ED8] fx-transition"
                >
                  View All →
                </Link>
              </div>

              <div className="divide-y divide-[#EEF1F4] text-[12.5px]">
                {reviewQueue.slice(0, 4).map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => item.taskId && setSelectedTaskId(item.taskId)}
                    className="py-2.5 cursor-pointer hover:text-[#2563EB] fx-transition space-y-0.5 first:pt-1 last:pb-1 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-medium text-[#7155A5]">
                        {item.humanId || item.projectKey}
                      </span>
                      <span className="font-mono text-[11px] text-[#9098A2]">
                        {item.progress || 95}%
                      </span>
                    </div>
                    <p className="font-medium text-[#17191C] group-hover:text-[#2563EB] truncate text-[13px]">
                      {item.title}
                    </p>
                    <p className="text-[11.5px] text-[#626A73] truncate">
                      {item.assigneeName || 'Team member'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 18. UPCOMING DEADLINES: Timeline style with date markers */}
          <section className="rounded-[14px] bg-white border border-[#E8ECF1] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#17191C]">
                Upcoming
              </h2>
              <Link
                href="/calendar"
                className="text-[11.5px] font-medium text-[#2563EB] hover:text-[#1D4ED8] fx-transition"
              >
                Calendar →
              </Link>
            </div>

            {allUpcomingItems.length === 0 ? (
              <p className="text-[12.5px] text-[#9098A2] py-2">No upcoming deadlines.</p>
            ) : (
              <div className="divide-y divide-[#EEF1F4]">
                {allUpcomingItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => item.type === 'TASK' && setSelectedTaskId(item.id)}
                    className="py-2.5 cursor-pointer hover:text-[#2563EB] fx-transition space-y-1 first:pt-1 last:pb-1 group"
                  >
                    <span className="font-mono text-[10px] font-bold text-[#626A73] px-1.5 py-0.5 bg-[#F4F6F8] rounded-[4px] border border-[#E8ECF1] uppercase inline-block">
                      {formatTimelineDate(item.date)}
                    </span>
                    <p className="font-medium text-[#17191C] group-hover:text-[#2563EB] truncate text-[13px]">
                      {item.title}
                    </p>
                    <p className="text-[11.5px] text-[#626A73] truncate">
                      {item.projectName ? `${item.projectName} · ` : ''}{item.humanId}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 19. MINI CALENDAR: Quiet rounded utility surface */}
          <div className="rounded-[14px] bg-white border border-[#E8ECF1] p-3.5 sm:p-4">
            <CalendarWidget
              tasks={projects.flatMap((p: any) => p.tasks || [])}
              milestones={projects.flatMap((p: any) => p.milestones || [])}
              projects={projects}
              onSelectTask={(id) => setSelectedTaskId(id)}
              borderless={true}
              title="Calendar"
            />
          </div>

        </div>

      </div>
    </div>
  );
}
