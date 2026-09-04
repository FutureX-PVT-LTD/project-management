'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { AppShell } from '@/components/layout/AppShell';
import { cn } from '@/lib/utils';

export function TeamPage() {
  const { data: teamData, isLoading } = useQuery({
    queryKey: ['reports', 'analytics', 'team-workload'],
    queryFn: () => api.get('/reports/analytics'),
  });

  const members = asArray<any>(teamData, 'userWorkload');

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
            Team Workload & Capacity
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            Real-time deliverable allocations, active project assignments, and workload distribution.
          </p>
        </div>

        {/* Team Table */}
        {isLoading ? (
          <div className="bg-white border border-fx-border rounded-[8px] p-10 text-center text-xs text-fx-text-muted shadow-none">
            Loading team workload...
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white border border-fx-border rounded-[8px] p-8 text-center text-xs text-fx-text-muted shadow-none">
            No team members found.
          </div>
        ) : (
          <div className="bg-white border border-fx-border rounded-[8px] overflow-hidden shadow-none">

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-fx-bg text-fx-text-secondary font-medium border-b border-fx-border">
                    <th className="py-2.5 px-4">Team Member</th>
                    <th className="py-2.5 px-3">Role / Discipline</th>
                    <th className="py-2.5 px-3">Active Projects</th>
                    <th className="py-2.5 px-3">In Progress</th>
                    <th className="py-2.5 px-3">Waiting</th>
                    <th className="py-2.5 px-4 text-right">Workload Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60 text-fx-text-primary">
                  {members.map((member: any) => {
                    const activeCount = member.activeTasksCount || member.assignedTasks?.length || 0;
                    const inProgressCount =
                      member.inProgressCount ||
                      member.assignedTasks?.filter((t: any) => t.status === 'IN_PROGRESS').length ||
                      0;
                    const waitingCount =
                      member.waitingCount ||
                      member.assignedTasks?.filter((t: any) => t.status === 'WAITING').length ||
                      0;

                    return (
                      <tr key={member.userId || member.id} className="hover:bg-fx-bg-hover fx-transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#EDF4F8] text-[#274E68] font-semibold text-[11px] flex items-center justify-center shrink-0">
                              {(member.userName || member.firstName || 'T')?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-fx-text-primary">
                                {member.userName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Team Member'}
                              </p>
                              <p className="text-[11px] text-fx-text-muted font-mono">{member.userEmail || member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-fx-text-secondary">
                          {member.jobTitle || member.role?.replace(/_/g, ' ') || 'Developer'}
                        </td>
                      <td className="py-3 px-3 font-mono text-fx-text-secondary">
                          {member.projectsCount || member.projects?.length || 0}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-blue-700">
                          {inProgressCount}
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-700">
                          {waitingCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              'text-[10px] uppercase font-semibold px-2 py-0.5 rounded border',
                              activeCount >= 5
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : activeCount === 0
                                ? 'bg-gray-100 text-gray-600 border-gray-200'
                                : 'bg-[#EDF7F2] text-[#287A5A] border-[#C6E7D2]',
                            )}
                          >
                            {activeCount >= 5 ? 'High Load' : activeCount === 0 ? 'Available' : 'Balanced'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
