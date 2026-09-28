'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { ProjectHealth, TaskPriority } from '@futurex/shared';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { CalendarWidget } from '@/features/calendar/CalendarWidget';
import { formatDate, cn } from '@/lib/utils';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardGreeting } from './DashboardGreeting';
import Link from 'next/link';

export function OwnerDashboard() {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch Owner Portfolio metrics
  const { data: ownerData, isLoading } = useQuery({
    queryKey: ['dashboard', 'owner'],
    queryFn: () => api.get('/reports/owner-dashboard'),
    staleTime: 20000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
    staleTime: 30000,
  });

  const projects = asArray<any>(projectsData);
  const urgentTasks = asArray<any>(ownerData, 'needsAttention');


  if (isLoading && !ownerData) {
    return <DashboardSkeleton />;
  }

  const onTrackCount = projects.filter((p: any) => p.health === ProjectHealth.ON_TRACK).length;
  const atRiskCount = projects.filter((p: any) => p.health === ProjectHealth.AT_RISK).length;
  const offTrackCount = projects.filter((p: any) => p.health === ProjectHealth.OFF_TRACK).length;
  const completedCount = projects.filter((p: any) => p.status === 'COMPLETED').length;

  return (
    <div className="space-y-8">
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-semibold text-[#0F172A] tracking-tight">
            <DashboardGreeting userName={user?.firstName} />
          </h1>
          <p className="text-[13px] text-[#475569] mt-1">
            Executive Studio Overview · Portfolio health, release readiness, and strategic deliverable governance.
          </p>
        </div>

        <Link href="/projects/new">
          <Button variant="primary" size="sm" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            New Project
          </Button>
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[#F1F5F9]">
          <div className="py-1 px-3 sm:px-4 first:pl-0">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] block">Active Projects</span>
            <span className="text-2xl font-semibold text-[#0F172A] font-mono mt-1.5 block">
              {projects.length}
            </span>
          </div>
          <div className="py-1 px-3 sm:px-4">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] block">On Track</span>
            <span className="text-2xl font-semibold text-[#15803D] font-mono mt-1.5 block">
              {onTrackCount}
            </span>
          </div>
          <div className="py-1 px-3 sm:px-4">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] block">At Risk</span>
            <span className="text-2xl font-semibold text-[#B45309] font-mono mt-1.5 block">
              {atRiskCount}
            </span>
          </div>
          <div className="py-1 px-3 sm:px-4">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] block">Blocked</span>
            <span className="text-2xl font-semibold text-[#DC2626] font-mono mt-1.5 block">
              {offTrackCount}
            </span>
          </div>
          <div className="py-1 px-3 sm:px-4">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] block">Completed</span>
            <span className="text-2xl font-semibold text-[#475569] font-mono mt-1.5 block">
              {completedCount}
            </span>
          </div>
          <div className="py-1 px-3 sm:px-4 last:pr-0">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] block">Escalations</span>
            <span className="text-2xl font-semibold text-[#DC2626] font-mono mt-1.5 block">
              {urgentTasks.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Independent Architecture */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-7 items-start">
        {/* Main Column: Portfolio Table with Calm Rows */}
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4 min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
            <h2 className="text-[16px] font-semibold text-[#0F172A]">
              Studio Portfolio ({projects.length})
            </h2>
            <Link
              href="/projects"
              className="text-[12px] text-[#2563EB] font-medium hover:text-[#1D4ED8] flex items-center gap-1 fx-transition"
            >
              <span>Full Directory</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
                  <th className="py-2.5 px-3">Product Title</th>
                  <th className="py-2.5 px-3">Health</th>
                  <th className="py-2.5 px-3">Progress</th>
                  <th className="py-2.5 px-3">Lead Admin</th>
                  <th className="py-2.5 px-3 text-right">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[#0F172A]">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                      No studio projects found. Create your first project using the button above.
                    </td>
                  </tr>
                ) : (
                  projects.map((proj: any) => (
                    <tr
                      key={proj.id}
                      className="hover:bg-[#F8FAFC] cursor-pointer fx-transition"
                    >
                      <td className="py-3 px-3">
                        <Link href={`/projects/${proj.id}`} className="block">
                          <p className="font-semibold text-[#0F172A] hover:text-[#2563EB] text-[13px]">
                            {proj.name}
                          </p>
                          <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{proj.key || proj.code}</p>
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <HealthBadge health={proj.health} reason={proj.healthReason} />
                      </td>
                      <td className="py-3 px-3 w-32">
                        <Progress value={proj.progress || 0} size="xs" />
                      </td>
                      <td className="py-3 px-3 text-[#475569] text-[12px]">
                        {proj.projectManager
                          ? `${proj.projectManager.firstName} ${proj.projectManager.lastName}`
                          : proj.projectManagerName || 'Unassigned'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#64748B] text-[12px]">
                        {proj.targetDate ? formatDate(proj.targetDate) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Utility Column: Calendar & Escalations */}
        <div className="space-y-6 min-w-0">
          <div className="rounded-[14px] bg-white border border-[#E2E8F0] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <CalendarWidget
              projects={projects}
              tasks={urgentTasks}
              onSelectTask={(id) => setSelectedTaskId(id)}
              borderless={true}
              title="Studio Schedule"
            />
          </div>

          {/* Needs Attention Feed */}
          <div className="rounded-[14px] bg-white border border-[#E2E8F0] p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#0F172A]">
                Needs Attention
              </h3>
              {urgentTasks.length > 0 && (
                <span className="font-mono text-[10.5px] font-semibold text-[#DC2626] px-1.5 py-0.2 bg-[#FEF2F2] border border-[#FEE2E2] rounded-[4px]">
                  {urgentTasks.length}
                </span>
              )}
            </div>

            {urgentTasks.length === 0 ? (
              <p className="text-[12px] text-[#15803D] py-1">
                ✓ All studio deliverables on schedule.
              </p>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {urgentTasks.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => task.taskId && setSelectedTaskId(task.taskId)}
                    className="py-2.5 hover:bg-[#F8FAFC] -mx-2 px-2 rounded-[6px] fx-transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#0F172A] truncate">{task.title}</span>
                      <PriorityBadge priority={task.priority || TaskPriority.HIGH} compact />
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
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
