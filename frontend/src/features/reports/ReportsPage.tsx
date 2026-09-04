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
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
            Studio Performance & Delivery Reports
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            Operational metrics, milestone completion rates, and cross-project throughput.
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Projects', value: reports.totalProjects || projects.length },
            { label: 'Tasks', value: reports.totalTasks || 0 },
            { label: 'Milestones', value: asArray(reportsData, 'milestoneDelivery').length },
            { label: 'Team Members', value: asArray(reportsData, 'userWorkload').length },
          ].map((metric) => (
            <div key={metric.label} className="bg-white border border-fx-border rounded-lg p-3">
              <p className="text-[11px] text-fx-text-muted">{metric.label}</p>
              <p className="text-lg font-semibold font-mono text-fx-text-primary">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Milestone Delivery Progress by Project */}
        <div className="bg-white border border-fx-border rounded-[8px] p-5 space-y-4 shadow-none">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">

            Game Project Delivery Velocity
          </h2>

          {projects.length === 0 ? (
            <p className="text-xs text-fx-text-muted">No projects found to report on.</p>
          ) : (
            <div className="space-y-4">
              {projects.map((proj: any) => (
                <div key={proj.id} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fx-text-primary">{proj.name}</span>
                    <span className="font-mono text-fx-text-secondary">{proj.progress || 0}%</span>
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
