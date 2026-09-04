'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Plus,
  CheckCircle2,
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
    <div className="space-y-8">
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* Header & Status Strip */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E7EB] pb-6">
          <div>
            <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-[#15171A]">
              Executive Studio Overview
            </h1>
            <p className="text-sm text-[#5F6368] mt-1">
              Portfolio health, key milestones, and critical blocker governance.
            </p>
          </div>

          <Link href="/projects/new">
            <Button variant="primary" size="md" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New Project
            </Button>
          </Link>
        </div>

        {/* 6-KPI Summary Strip directly on canvas */}
        <div className="rounded-[14px] bg-[#F8F9FB] border border-[#E8EBEF] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[#E8EBEF] text-xs">
            <div className="px-4 py-1.5 first:pl-0">
              <span className="text-[#5F6368] text-[11px] font-semibold uppercase tracking-wider block">Active Projects</span>
              <span className="text-2xl font-semibold text-[#15171A] font-mono mt-1 block">
                {projects.length}
              </span>
            </div>
            <div className="px-4 py-1.5">
              <span className="text-[#5F6368] text-[11px] font-semibold uppercase tracking-wider block">On Track</span>
              <span className="text-2xl font-semibold text-[#248A5B] font-mono mt-1 block">
                {projects.filter((p: any) => p.health === ProjectHealth.ON_TRACK).length}
              </span>
            </div>
            <div className="px-4 py-1.5">
              <span className="text-[#5F6368] text-[11px] font-semibold uppercase tracking-wider block">At Risk</span>
              <span className="text-2xl font-semibold text-[#A96F12] font-mono mt-1 block">
                {projects.filter((p: any) => p.health === ProjectHealth.AT_RISK).length}
              </span>
            </div>
            <div className="px-4 py-1.5">
              <span className="text-[#5F6368] text-[11px] font-semibold uppercase tracking-wider block">Off Track</span>
              <span className="text-2xl font-semibold text-[#C24141] font-mono mt-1 block">
                {projects.filter((p: any) => p.health === ProjectHealth.OFF_TRACK).length}
              </span>
            </div>
            <div className="px-4 py-1.5">
              <span className="text-[#5F6368] text-[11px] font-semibold uppercase tracking-wider block">Completed</span>
              <span className="text-2xl font-semibold text-[#5F6368] font-mono mt-1 block">
                {projects.filter((p: any) => p.status === 'COMPLETED').length}
              </span>
            </div>
            <div className="px-4 py-1.5 last:pr-0">
              <span className="text-[#5F6368] text-[11px] font-semibold uppercase tracking-wider block">Blocked Items</span>
              <span className="text-2xl font-semibold text-[#C24141] font-mono mt-1 block">
                {urgentTasks.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Independent Architecture (xl: minmax(0,1fr) 360px) */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
        {/* Main Column: Studio Portfolio Table */}
        <div className="flex flex-col gap-6 min-w-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EB]">
              <h2 className="text-[14px] font-semibold text-[#15171A]">
                Studio Game Portfolio ({projects.length})
              </h2>
              <Link
                href="/projects"
                className="text-xs text-[#0088FF] font-medium hover:text-[#0068CC] flex items-center gap-1"
              >
                <span>Full Directory</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto rounded-[16px] bg-white border border-[#E4E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8F9FA] text-[#5F6368] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E4E7EB]">
                    <th className="py-3 px-4">Game Project</th>
                    <th className="py-3 px-3">Status / Health</th>
                    <th className="py-3 px-3">Progress</th>
                    <th className="py-3 px-3">Managing Admin</th>
                    <th className="py-3 px-4 text-right">Target Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB] text-[#15171A]">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#92979E]">
                        No studio projects found. Create your first project using the button above.
                      </td>
                    </tr>
                  ) : (
                    projects.map((proj: any) => (
                      <tr
                        key={proj.id}
                        className="hover:bg-[#F8F9FA] cursor-pointer fx-transition"
                      >
                        <td className="py-3.5 px-4">
                          <Link href={`/projects/${proj.id}`} className="block">
                            <p className="font-semibold text-[#15171A] hover:text-[#0088FF] text-sm">
                              {proj.name}
                            </p>
                            <p className="text-[11px] text-[#92979E] font-mono mt-0.5">{proj.key || proj.code}</p>
                          </Link>
                        </td>
                        <td className="py-3.5 px-3">
                          <HealthBadge health={proj.health} reason={proj.healthReason} />
                        </td>
                        <td className="py-3.5 px-3 w-36">
                          <Progress value={proj.progress || 0} size="xs" />
                        </td>
                        <td className="py-3.5 px-3 text-[#5F6368]">
                          {proj.projectManager
                            ? `${proj.projectManager.firstName} ${proj.projectManager.lastName}`
                            : proj.projectManagerName || 'Unassigned Admin'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[#5F6368] font-medium">
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

        {/* Utility Column: Calendar & Needs Attention */}
        <div className="flex flex-col gap-8 min-w-0">
          {/* Dashboard Calendar Widget */}
          <CalendarWidget
            projects={projects}
            tasks={urgentTasks}
            onSelectTask={(id) => setSelectedTaskId(id)}
            title="Studio Calendar"
          />

          {/* Needs Attention Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EB]">
              <h3 className="text-[14px] font-semibold text-[#15171A] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-[#A96F12]" />
                <span>Needs Immediate Attention</span>
              </h3>
            </div>

            {urgentTasks.length === 0 ? (
              <div className="bg-[#F8F9FA] border border-[#E4E7EB] rounded-[10px] px-4 py-3 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#248A5B] shrink-0" />
                <p className="text-xs text-[#15171A] font-medium">
                  ✓ All studio deliverables healthy.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentTasks.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => task.taskId && setSelectedTaskId(task.taskId)}
                    className={cn(
                      'py-3 hover:text-[#0088FF] fx-transition text-xs',
                      task.taskId && 'cursor-pointer',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#15171A] truncate">{task.title}</span>
                      <PriorityBadge priority={task.priority || TaskPriority.HIGH} compact />
                    </div>
                    <p className="text-[11px] text-[#92979E] mt-0.5 truncate">
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
