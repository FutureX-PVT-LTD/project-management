'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Flag,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { StatusPill } from '@/components/ui/StatusPill';
import { AppShell } from '@/components/layout/AppShell';
import { formatDate, cn } from '@/lib/utils';

export function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-reports'],
    queryFn: () => api.get('/reports/analytics'),
  });

  const statusDist = (data?.statusDistribution as any[]) || [];
  const userWorkload = (data?.userWorkload as any[]) || [];
  const milestoneDelivery = (data?.milestoneDelivery as any[]) || [];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-fx-border pb-4">
          <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
            Delivery Health & Practical Reports
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            Actionable project execution metrics, task bottlenecks, and milestone delivery trends.
          </p>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-xs text-fx-text-muted">
            Loading analytics reports...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Status Distribution */}
            <Card padding="none" className="bg-white">
              <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-fx-green-700" />
                  <h2 className="text-sm font-semibold text-fx-text-primary">Tasks by Status</h2>
                </div>
                <span className="text-[11px] text-fx-text-muted font-mono font-medium">
                  {data?.totalTasks || 0} Total
                </span>
              </div>

              <div className="p-5 space-y-3.5">
                {statusDist.map((item: any) => (
                  <div key={item.status} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <StatusPill status={item.status} size="xs" />
                      <span className="font-semibold text-fx-text-primary font-mono text-[11px]">
                        {item.count} tasks ({item.percentage}%)
                      </span>
                    </div>
                    <Progress value={item.percentage} size="xs" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Milestone Delivery Status */}
            <Card padding="none" className="bg-white">
              <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-fx-green-700" />
                  <h2 className="text-sm font-semibold text-fx-text-primary">
                    Milestone Delivery Progress
                  </h2>
                </div>
              </div>

              <div className="divide-y divide-fx-border/60 p-2">
                {milestoneDelivery.length === 0 ? (
                  <p className="p-6 text-center text-xs text-fx-text-muted">
                    No milestone data available.
                  </p>
                ) : (
                  milestoneDelivery.map((m: any) => (
                    <div key={m.milestoneId} className="p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold bg-fx-green-50 text-fx-green-900 border border-fx-green-100 px-1.5 py-0.5 rounded-[4px]">
                            {m.projectKey}
                          </span>
                          <span className="font-semibold text-fx-text-primary">{m.milestoneName}</span>
                        </div>
                        <span className="text-fx-text-muted text-[11px] font-medium">
                          Target: {formatDate(m.targetDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <Progress value={m.progress} size="xs" />
                        </div>
                        <span className="font-mono font-bold text-fx-text-primary text-[11px]">
                          {m.completedTasks}/{m.totalTasks} Done ({m.progress}%)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Workload Allocation by Teammate */}
            <Card padding="none" className="bg-white lg:col-span-2">
              <div className="px-5 py-3.5 border-b border-fx-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-fx-green-700" />
                  <h2 className="text-sm font-semibold text-fx-text-primary">
                    Studio Workload Allocation
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-fx-bg-subtle/80 text-fx-text-muted border-b border-fx-border text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Team Member</th>
                      <th className="py-3 px-4">Active Tasks</th>
                      <th className="py-3 px-4">Blocked</th>
                      <th className="py-3 px-4">Due Soon</th>
                      <th className="py-3 px-4">Estimated Effort</th>
                      <th className="py-3 px-4 text-right">Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fx-border/60">
                    {userWorkload.map((u: any) => (
                      <tr key={u.userId} className="hover:bg-fx-bg-subtle fx-transition">
                        <td className="py-3.5 px-4 font-semibold text-fx-text-primary">
                          {u.userName} <span className="font-normal text-fx-text-muted">({u.jobTitle})</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">{u.activeTasksCount} tasks</td>
                        <td className="py-3.5 px-4">
                          {u.blockedTasksCount > 0 ? (
                            <span className="text-fx-semantic-danger font-semibold font-mono">
                              {u.blockedTasksCount}
                            </span>
                          ) : (
                            <span className="text-fx-text-muted">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono">{u.dueSoonTasksCount}</td>
                        <td className="py-3.5 px-4 font-bold text-fx-green-900 font-mono">
                          {u.estimatedHours} hrs
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider',
                              u.capacityLevel === 'HIGH' && 'bg-[#FDF2F2] text-fx-semantic-danger border border-[#FAD3D3]',
                              u.capacityLevel === 'BALANCED' && 'bg-fx-green-50 text-fx-green-900 border border-fx-green-100',
                              u.capacityLevel === 'AVAILABLE' && 'bg-blue-50 text-[#205896] border border-blue-100',
                            )}
                          >
                            {u.capacityLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
