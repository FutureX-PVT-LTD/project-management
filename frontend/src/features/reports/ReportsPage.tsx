'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';
import { AppShell } from '@/components/layout/AppShell';
import { Progress } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';

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
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-[#E8EBEF] pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
            Studio Performance & Delivery Reports
          </h1>
          <p className="text-xs text-[#60666F] mt-1">
            Operational metrics, milestone completion rates, and cross-project throughput.
          </p>
        </div>

        {/* Summary Metrics Strip */}
        <div className="bg-white border border-[#E8EBEF] rounded-[10px] grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E8EBEF]">
          {[
            { label: 'Products', value: reports.totalProjects || projects.length },
            { label: 'Deliverables', value: reports.totalTasks || 0 },
            { label: 'Milestones', value: asArray(reportsData, 'milestoneDelivery').length },
            { label: 'Team Members', value: asArray(reportsData, 'userWorkload').length },
          ].map((metric) => (
            <div key={metric.label} className="p-4 space-y-1">
              <p className="text-[11px] font-medium text-[#8C939E]">{metric.label}</p>
              <p className="text-xl font-semibold font-mono text-[#17191C]">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Product Delivery Progress */}
        <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8EBEF] pb-3">
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-[#8C939E]">
              Product Delivery Velocity
            </h2>
            <span className="text-xs font-mono text-[#8C939E]">
              {projects.length} Products
            </span>
          </div>

          {projects.length === 0 ? (
            <p className="text-xs text-[#8C939E] py-4 text-center">No products found to report on.</p>
          ) : (
            <div className="space-y-3.5 divide-y divide-[#E8EBEF]/60 pt-1">
              {projects.map((proj: any) => (
                <div key={proj.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#17191C]">{proj.name}</span>
                    <span className="font-mono text-xs font-medium text-[#60666F]">{proj.progress || 0}%</span>
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
