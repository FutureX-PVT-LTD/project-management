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
        <div className="border-b border-[#E8EBEF] pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
            Team Workload & Capacity
          </h1>
          <p className="text-xs text-[#60666F] mt-1">
            Real-time deliverable allocations, active project assignments, and workload distribution.
          </p>
        </div>

        {/* Team Table */}
        {isLoading ? (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-10 text-center text-xs text-[#8C939E]">
            Loading team workload...
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-8 text-center text-xs text-[#8C939E]">
            No team members found.
          </div>
        ) : (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAFBFC] text-[#60666F] font-medium border-b border-[#E8EBEF]">
                    <th className="py-2.5 px-4">Team Member</th>
                    <th className="py-2.5 px-3">Role / Discipline</th>
                    <th className="py-2.5 px-3">Active Projects</th>
                    <th className="py-2.5 px-3">In Progress</th>
                    <th className="py-2.5 px-3">Waiting</th>
                    <th className="py-2.5 px-4 text-right">Workload Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBEF] text-[#17191C]">
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
                      <tr key={member.userId || member.id} className="hover:bg-[#F8F9FB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#EEF4FF] text-[#2463EB] font-medium text-[11px] flex items-center justify-center shrink-0">
                              {(member.userName || member.firstName || 'T')?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-[#17191C]">
                                {member.userName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Team Member'}
                              </p>
                              <p className="text-[11px] text-[#8C939E] font-mono">{member.userEmail || member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#60666F]">
                          {member.jobTitle || member.role?.replace(/_/g, ' ') || 'Developer'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#60666F]">
                          {member.projectsCount || member.projects?.length || 0}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-[#2463EB]">
                          {inProgressCount}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#8C939E]">
                          {waitingCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              'text-[10px] uppercase font-medium px-2 py-0.5 rounded-[4px] border',
                              activeCount >= 5
                                ? 'bg-[#FFF7E8] text-[#9A6515] border-[#F0DFB7]'
                                : activeCount === 0
                                ? 'bg-[#F8F9FB] text-[#60666F] border-[#E8EBEF]'
                                : 'bg-[#EDF7F2] text-[#26715A] border-[#C6E6D6]',
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
