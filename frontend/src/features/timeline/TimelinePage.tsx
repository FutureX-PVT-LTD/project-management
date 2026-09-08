'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GanttChartSquare,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { TaskStatus } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDate, cn } from '@/lib/utils';

export function TimelinePage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['timeline', selectedProjectId],
    queryFn: () =>
      api.get(`/tasks${selectedProjectId ? `?projectId=${selectedProjectId}` : ''}`),
  });

  const projects = asArray<any>(projectsData);
  const timeline = asArray<any>(timelineData).filter((item) => item.startDate || item.dueDate);

  return (
    <AppShell fullWidth={true}>
      <div className="space-y-5">
        {/* Header & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EBEF] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
              Delivery Timeline
            </h1>
            <p className="text-xs text-[#60666F] mt-1">
              Gantt scheduling, cross-project dependencies, and milestone delivery targets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8C939E]">Filter Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-8 rounded-[9px] border border-[#E8EBEF] bg-[#F8F9FB] px-2.5 text-xs text-[#17191C] focus:bg-white focus:border-[#2463EB] focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline Gantt Board */}
        {timelineLoading || projectsLoading ? (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-10 text-center text-xs text-[#8C939E]">
            Loading timeline schedule...
          </div>
        ) : timeline.length === 0 ? (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-8 text-center text-xs text-[#8C939E]">
            No scheduled milestones or deliverables found.
          </div>
        ) : (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] overflow-hidden space-y-0">
            <div className="p-3 bg-[#FAFBFC] border-b border-[#E8EBEF] flex items-center justify-between text-xs">
              <span className="font-medium text-[#17191C] uppercase tracking-wider text-[11px]">
                Deliverable Schedule
              </span>
              <span className="text-[11px] text-[#8C939E]">
                Showing {timeline.length} scheduled items
              </span>
            </div>

            <div className="divide-y divide-[#E8EBEF]">
              {timeline.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3.5 hover:bg-[#F8F9FB] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-medium text-[#8C939E]">
                        {item.humanId || item.code || 'MS'}
                      </span>
                      <span className="font-medium text-[#17191C] truncate">
                        {item.title || item.name}
                      </span>
                      {item.type === 'milestone' && (
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-[4px] bg-[#F5F1FB] text-[#6D52A3] border border-[#E4D7F5]">
                          Milestone
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#60666F]">
                      <span>Project: {item.project?.name || '—'}</span>
                      {item.startDate && (
                        <span>
                          Start: {formatDate(item.startDate)}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="flex items-center gap-1 font-mono text-[#60666F]">
                          <Calendar className="w-3 h-3 text-[#8C939E]" /> Due {formatDate(item.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StatusPill status={item.status || TaskStatus.TODO} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
