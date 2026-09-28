'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
        <div className="border-b border-[#E3E7EC] pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#181B20]">
            Team Workload & Capacity
          </h1>
          <p className="text-xs text-[#626A73] mt-1">
            Real-time deliverable allocations, active project assignments, and workload distribution.
          </p>
        </div>

        {/* Team Table */}
        {isLoading ? (
          <div className="bg-white border border-[#E3E7EC] rounded-[8px] p-10 text-center text-xs text-[#929AA3]">
            Loading team workload...
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white border border-[#E3E7EC] rounded-[8px] p-8 text-center text-xs text-[#929AA3]">
            No team members found.
          </div>
        ) : (
          <div className="bg-white border border-[#E3E7EC] rounded-[8px] overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7F8FA] text-[#626A73] font-medium border-b border-[#E3E7EC]">
                    <th className="py-2.5 px-4">Team Member</th>
                    <th className="py-2.5 px-3">Role / Discipline</th>
                    <th className="py-2.5 px-3">Active Projects</th>
                    <th className="py-2.5 px-3">In Progress</th>
                    <th className="py-2.5 px-3">Waiting</th>
                    <th className="py-2.5 px-4 text-right">Workload Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E7EC] text-[#181B20]">
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
                      <tr key={member.userId || member.id} className="hover:bg-[#F7F8FA] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#EEF4FF] text-[#2563EB] font-medium text-[11px] flex items-center justify-center shrink-0">
                              {(member.userName || member.firstName || 'T')?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-[#181B20]">
                                {member.userName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Team Member'}
                              </p>
                              <p className="text-[11px] text-[#929AA3] font-mono">{member.userEmail || member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#626A73]">
                          {member.jobTitle || member.role?.replace(/_/g, ' ') || 'Developer'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#626A73]">
                          {member.projectsCount || member.projects?.length || 0}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-[#2563EB]">
                          {inProgressCount}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#929AA3]">
                          {waitingCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              'text-[10px] uppercase font-medium px-2 py-0.5 rounded-[4px] border',
                              activeCount >= 5
                                ? 'bg-[#FFF6E5] text-[#A86B12] border-[#A86B12]/20'
                                : activeCount === 0
                                ? 'bg-[#F7F8FA] text-[#626A73] border-[#E3E7EC]'
                                : 'bg-[#EDF8F2] text-[#237A57] border-[#237A57]/20',
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
