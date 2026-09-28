'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';
import { AppShell } from '@/components/layout/AppShell';
import { Progress } from '@/components/ui/Progress';

export function ReportsPage() {
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports', 'analytics'],
    queryFn: () => api.get('/reports/analytics'),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const reports = asRecord(reportsData);
  const projects = asArray<any>(projectsData);

  return (
    <AppShell>
      <div className="space-y-6 w-full max-w-5xl">
        {/* Header */}
        <div className="border-b border-[#E3E7EC] pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#181B20]">
            Studio Performance & Delivery Reports
          </h1>
          <p className="text-xs text-[#626A73] mt-1">
            Operational metrics, milestone completion rates, and cross-project throughput.
          </p>
        </div>

        {/* Summary Metrics Strip */}
        <div className="bg-white border border-[#E3E7EC] rounded-[8px] grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E3E7EC]">
          {[
            { label: 'Products', value: reports.totalProjects || projects.length },
            { label: 'Deliverables', value: reports.totalTasks || 0 },
            { label: 'Milestones', value: asArray(reportsData, 'milestoneDelivery').length },
            { label: 'Team Members', value: asArray(reportsData, 'userWorkload').length },
          ].map((metric) => (
            <div key={metric.label} className="p-4 space-y-1">
              <p className="text-[11px] font-medium text-[#929AA3]">{metric.label}</p>
              <p className="text-xl font-semibold font-mono text-[#181B20]">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Product Delivery Progress */}
        <div className="bg-white border border-[#E3E7EC] rounded-[8px] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E3E7EC] pb-3">
            <h2 className="text-xs font-semibold text-[#181B20]">
              Product Delivery Velocity
            </h2>
            <span className="text-xs font-mono text-[#929AA3]">
              {projects.length} Products
            </span>
          </div>

          {isLoading ? (
            <p className="text-xs text-[#929AA3] py-8 text-center">Loading progress data...</p>
          ) : projects.length === 0 ? (
            <p className="text-xs text-[#929AA3] py-8 text-center">No products found to report on.</p>
          ) : (
            <div className="space-y-4 divide-y divide-[#E3E7EC]">
              {projects.map((proj: any) => (
                <div key={proj.id} className="pt-3.5 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#181B20]">{proj.name}</span>
                    <span className="font-mono text-xs font-medium text-[#626A73]">{proj.progress || 0}%</span>
                  </div>
                  <Progress value={proj.progress || 0} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
