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
import Link from 'next/link';

export function OwnerDashboard() {
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
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E8EBEF] pb-6">
        <div>
          <h1 className="fx-page-title">
            Executive Studio Overview
          </h1>
          <p className="text-[13px] text-[#60666F] mt-1">
            Portfolio health, release readiness, and strategic deliverable governance.
          </p>
        </div>

        <Link href="/projects/new">
          <Button variant="primary" size="sm" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            New Project
          </Button>
        </Link>
      </div>

      {/* 27. Open KPI Presentation (Dividers, no individual boxed rectangles) */}
      <div className="py-2 border-b border-[#E8EBEF]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[#E8EBEF]">
          <div className="py-2 px-3 first:pl-0">
            <span className="text-[11px] font-medium text-[#8B929B] block">Active Projects</span>
            <span className="text-2xl font-semibold text-[#17191C] font-mono mt-1 block">
              {projects.length}
            </span>
          </div>
          <div className="py-2 px-3">
            <span className="text-[11px] font-medium text-[#8B929B] block">On Track</span>
            <span className="text-2xl font-semibold text-[#237A57] font-mono mt-1 block">
              {onTrackCount}
            </span>
          </div>
          <div className="py-2 px-3">
            <span className="text-[11px] font-medium text-[#8B929B] block">At Risk</span>
            <span className="text-2xl font-semibold text-[#9A6515] font-mono mt-1 block">
              {atRiskCount}
            </span>
          </div>
          <div className="py-2 px-3">
            <span className="text-[11px] font-medium text-[#8B929B] block">Blocked</span>
            <span className="text-2xl font-semibold text-[#B54747] font-mono mt-1 block">
              {offTrackCount}
            </span>
          </div>
          <div className="py-2 px-3">
            <span className="text-[11px] font-medium text-[#8B929B] block">Completed</span>
            <span className="text-2xl font-semibold text-[#60666F] font-mono mt-1 block">
              {completedCount}
            </span>
          </div>
          <div className="py-2 px-3 last:pr-0">
            <span className="text-[11px] font-medium text-[#8B929B] block">Escalations</span>
            <span className="text-2xl font-semibold text-[#B54747] font-mono mt-1 block">
              {urgentTasks.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Independent Architecture */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
        {/* Main Column: Portfolio Table with Calm Rows */}
        <div className="space-y-6 min-w-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8EBEF]">
              <h2 className="fx-section-title">
                Studio Portfolio ({projects.length})
              </h2>
              <Link
                href="/projects"
                className="text-[12px] text-[#2463EB] font-medium hover:text-[#1D4ED8] flex items-center gap-1"
              >
                <span>Full Directory</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#FAFBFC] text-[#60666F] font-semibold text-[11px] border-b border-[#E8EBEF]">
                    <th className="py-2.5 px-3">Product Title</th>
                    <th className="py-2.5 px-3">Health</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3">Lead Admin</th>
                    <th className="py-2.5 px-3 text-right">Target Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBEF] text-[#17191C]">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#8B929B]">
                        No studio projects found. Create your first project using the button above.
                      </td>
                    </tr>
                  ) : (
                    projects.map((proj: any) => (
                      <tr
                        key={proj.id}
                        className="hover:bg-[#F8F9FB] cursor-pointer fx-transition"
                      >
                        <td className="py-3 px-3">
                          <Link href={`/projects/${proj.id}`} className="block">
                            <p className="font-medium text-[#17191C] hover:text-[#2463EB] text-[13px]">
                              {proj.name}
                            </p>
                            <p className="text-[11px] text-[#8B929B] font-mono">{proj.key || proj.code}</p>
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <HealthBadge health={proj.health} reason={proj.healthReason} />
                        </td>
                        <td className="py-3 px-3 w-32">
                          <Progress value={proj.progress || 0} size="xs" />
                        </td>
                        <td className="py-3 px-3 text-[#60666F] text-[12px]">
                          {proj.projectManager
                            ? `${proj.projectManager.firstName} ${proj.projectManager.lastName}`
                            : proj.projectManagerName || 'Unassigned'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#60666F] text-[12px]">
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

        {/* Utility Column: Calendar & Escalations */}
        <div className="space-y-8 min-w-0">
          <CalendarWidget
            projects={projects}
            tasks={urgentTasks}
            onSelectTask={(id) => setSelectedTaskId(id)}
            borderless={true}
            title="Studio Schedule"
          />

          {/* Needs Attention Feed */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8B929B]">
              Needs Attention ({urgentTasks.length})
            </h3>

            {urgentTasks.length === 0 ? (
              <p className="text-[12px] text-[#26715A] py-1">
                ✓ All studio deliverables on schedule.
              </p>
            ) : (
              <div className="divide-y divide-[#E8EBEF]">
                {urgentTasks.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => task.taskId && setSelectedTaskId(task.taskId)}
                    className="py-2 hover:text-[#2463EB] fx-transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#17191C] truncate">{task.title}</span>
                      <PriorityBadge priority={task.priority || TaskPriority.HIGH} compact />
                    </div>
                    <p className="text-[11px] text-[#8B929B] mt-0.5 truncate">
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
