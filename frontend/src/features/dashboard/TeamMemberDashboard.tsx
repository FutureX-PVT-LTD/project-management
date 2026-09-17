'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { asRecord } from '@/lib/api-data';
import { TaskStatus } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { CalendarWidget } from '@/features/calendar/CalendarWidget';
import { formatDate, formatTaskId, cn } from '@/lib/utils';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { DashboardGreeting } from './DashboardGreeting';
import { DashboardFilters } from './components/DashboardFilters';
import { DashboardWorkloadSummary } from './components/DashboardWorkloadSummary';
import { CurrentFocusCard } from './components/CurrentFocusCard';
import { ReadyNextSection } from './components/ReadyNextSection';
import { WaitingBlockedSection } from './components/WaitingBlockedSection';
import { ReviewSection } from './components/ReviewSection';
import { MyProductsSection } from './components/MyProductsSection';
import { RecentPersonalActivity } from './components/RecentPersonalActivity';

export function TeamMemberDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedWorkstream, setSelectedWorkstream] = useState<string>('ALL');
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Dedicated server-scoped dashboard aggregate
  const dashboardQueryKey = [
    'dashboard',
    'team-member',
    user?.id,
    selectedProjectId,
    selectedWorkstream,
  ];

  const { data: rawDashboardData, isLoading, isError, error } = useQuery({
    queryKey: dashboardQueryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedProjectId !== 'all') params.append('projectId', selectedProjectId);
      if (selectedWorkstream !== 'ALL') params.append('workstream', selectedWorkstream);
      const qs = params.toString();
      return api.get(`/tasks/dashboard${qs ? `?${qs}` : ''}`);
    },
    enabled: !!user?.id,
    staleTime: 15000,
  });

  // Start Work Mutation with Optimistic UI
  const startWorkMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.patch(`/tasks/${taskId}`, { status: TaskStatus.IN_PROGRESS }),
    onMutate: async (taskId: string) => {
      setActionMessage(null);
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previous = queryClient.getQueryData(dashboardQueryKey);

      queryClient.setQueryData(dashboardQueryKey, (old: any) => {
        if (!old) return old;
        const data = old.data || old;
        const currentReady = data.readyNext || [];
        const taskToStart =
          (data.recommendedNext?.id === taskId ? data.recommendedNext : null) ||
          currentReady.find((t: any) => t.id === taskId);

        if (!taskToStart) return old;

        const updatedTask = { ...taskToStart, status: TaskStatus.IN_PROGRESS };
        const newReady = currentReady.filter((t: any) => t.id !== taskId);

        const newPayload = {
          ...data,
          currentFocus: updatedTask,
          recommendedNext: null,
          readyNext: newReady,
          counts: {
            ...data.counts,
            current: (data.counts?.current || 0) + 1,
            readyTotal: Math.max(0, (data.counts?.readyTotal || 1) - 1),
            readyDisplayed: Math.max(0, (data.counts?.readyDisplayed || 1) - 1),
          },
        };
        return old.data ? { ...old, data: newPayload } : newPayload;
      });

      return { previous };
    },
    onError: (err: any, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(dashboardQueryKey, context.previous);
      }
      setActionMessage({
        type: 'error',
        text: err?.message || 'The task could not be started.',
      });
    },
    onSuccess: () => {
      setActionMessage({
        type: 'success',
        text: 'Work started. Update your progress as you work on this item.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  if (isLoading && !rawDashboardData) {
    return <DashboardSkeleton />;
  }

  const dashboard = asRecord(rawDashboardData);
  const counts = dashboard.counts || {
    current: 0,
    readyTotal: 0,
    readyDisplayed: 0,
    later: 0,
    waiting: 0,
    blocked: 0,
    inReview: 0,
    completed: 0,
  };

  const currentFocus = dashboard.currentFocus || null;
  const recommendedNext = dashboard.recommendedNext || null;
  const readyNext = dashboard.readyNext || [];
  const waitingTasks = dashboard.waiting || [];
  const blockedTasks = dashboard.blocked || [];
  const inReviewTasks = dashboard.inReview || [];
  const myProducts = dashboard.myProducts || [];
  const recentUpdates = dashboard.recentUpdates || [];
  const upNextDeadlines = dashboard.upNextDeadlines || [];
  const filterProjects = dashboard.filterProjects || [];

  const firstName = user?.firstName || 'there';
  const now = new Date();

  // Concise, intelligent workload subtitle (avoids 36 ready panic)
  const getGreetingSubtitle = () => {
    if (counts.current > 0) {
      if (counts.current === 1 && currentFocus) {
        return `You have 1 active item and ${counts.readyDisplayed} ready next.`;
      }
      return `You have ${counts.current} active items in progress.`;
    }
    if (counts.readyDisplayed > 0) {
      if (counts.later > 0) {
        return `${counts.readyDisplayed} items are ready next · ${counts.later} later.`;
      }
      return `You have ${counts.readyDisplayed} item${counts.readyDisplayed > 1 ? 's' : ''} ready next.`;
    }
    if (counts.waiting > 0 || counts.blocked > 0) {
      return `You have ${counts.waiting + counts.blocked} items waiting on prerequisite work.`;
    }
    if (counts.inReview > 0) {
      return `${counts.inReview} submission${counts.inReview > 1 ? 's are' : ' is'} waiting for Admin review.`;
    }
    if (counts.completed > 0) {
      return `All assigned work is complete (${counts.completed} completed). No active tasks pending.`;
    }
    return "You're all caught up. No tasks are currently assigned to you.";
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* SlideOver Task Drawer */}
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* 1. Header: Greeting & Workload Summary */}
      <header className="border-b border-[#E8ECF1] pb-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="fx-page-title">
              <DashboardGreeting userName={firstName} />
            </h1>
            <p className="text-[13px] text-[#60666F] mt-1 font-normal">
              {getGreetingSubtitle()}
            </p>
          </div>
          <span
            className="text-xs text-[#8B929B] font-medium shrink-0"
            suppressHydrationWarning
          >
            {now.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Action Status Notification */}
        {actionMessage && (
          <div
            role={actionMessage.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'rounded-[6px] border px-3 py-2 text-xs flex items-center justify-between',
              actionMessage.type === 'error'
                ? 'border-[#B54747]/25 bg-[#FFF2F2] text-[#9F3535]'
                : 'border-[#237A57]/25 bg-[#EFF8F3] text-[#237A57]',
            )}
          >
            <span>{actionMessage.text}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-xs underline ml-2 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Workload Inline Counters */}
        <DashboardWorkloadSummary counts={counts} />

        {/* 2. Project & Workstream Filters */}
        <div className="pt-2 border-t border-[#F4F6F8]">
          <DashboardFilters
            projects={filterProjects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            selectedWorkstream={selectedWorkstream}
            onSelectWorkstream={setSelectedWorkstream}
          />
        </div>
      </header>

      {/* 3. Main Content Two-Column Desktop Layout */}
      <main className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
        {/* LEFT COLUMN: Personal Work Stream */}
        <div className="flex flex-col gap-8 min-w-0">
          {/* Current Focus (Strongest surface on page) */}
          <CurrentFocusCard
            currentFocus={currentFocus}
            recommendedNext={recommendedNext}
            onSelectTask={setSelectedTaskId}
            onStartTask={(id) => startWorkMutation.mutate(id)}
            isStarting={startWorkMutation.isPending}
          />

          {/* Ready Next (Top 3-5 priority items) */}
          <ReadyNextSection
            tasks={readyNext}
            totalReadyCount={counts.readyTotal}
            onSelectTask={setSelectedTaskId}
            onStartTask={(id) => startWorkMutation.mutate(id)}
            startingTaskId={
              startWorkMutation.isPending
                ? (startWorkMutation.variables as string)
                : null
            }
          />

          {/* Waiting & Blocked Work with Dependency Context */}
          <WaitingBlockedSection
            blockedTasks={blockedTasks}
            waitingTasks={waitingTasks}
            onSelectTask={setSelectedTaskId}
          />

          {/* In Review Work */}
          <ReviewSection tasks={inReviewTasks} onSelectTask={setSelectedTaskId} />

          {/* My Products Structured Rows */}
          <MyProductsSection products={myProducts} />
        </div>

        {/* RIGHT COLUMN: Desktop Utility Rail */}
        <aside className="flex flex-col gap-6 min-w-0 xl:sticky xl:top-6">
          {/* Up Next Deadlines */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E8ECF1]">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8B929B]">
                Upcoming Deadlines
              </h3>
              <Link
                href="/my-work?tab=ALL"
                className="text-[11px] font-medium text-[#2463EB] hover:text-[#1D4ED8] flex items-center gap-0.5 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {upNextDeadlines.length === 0 ? (
              <p className="text-xs text-[#8B929B] py-1">No upcoming deadlines.</p>
            ) : (
              <div className="divide-y divide-[#E8ECF1]">
                {upNextDeadlines.map((task: any) => {
                  const isOverdue = new Date(task.dueDate) < now;
                  const cleanId = formatTaskId(
                    task.checklistCode || task.humanId,
                    task.project?.key,
                    task.project?.name,
                  );
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="py-2.5 cursor-pointer hover:bg-[#F8FAFC] rounded-[4px] px-1 -mx-1 transition-colors text-xs space-y-1 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[#17191C] truncate group-hover:text-[#2463EB] transition-colors">
                          {task.title}
                        </span>
                        <span
                          className={cn(
                            'font-mono text-[11px] shrink-0 font-medium',
                            isOverdue ? 'text-[#B54747]' : 'text-[#60666F]',
                          )}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#8B929B]">
                        <span className="font-mono">
                          {cleanId} · {task.project?.name}
                        </span>
                        <StatusPill status={task.status} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compact Calendar Schedule */}
          <div className="rounded-[10px] border border-[#E8ECF1] bg-white p-3 shadow-xs">
            <CalendarWidget
              tasks={upNextDeadlines}
              onSelectTask={setSelectedTaskId}
              borderless={true}
              title="Schedule"
            />
          </div>

          {/* Recent Personal Activity */}
          <RecentPersonalActivity updates={recentUpdates} />
        </aside>
      </main>
    </div>
  );
}
