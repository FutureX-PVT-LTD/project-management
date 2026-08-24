'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Mail, Briefcase, CheckSquare, AlertCircle, Clock, Inbox } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { cn } from '@/lib/utils';

export function TeamPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams'),
  });

  const allTeams = (teams as any[]) || [];

  return (
    <AppShell>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-fx-border pb-4">
          <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
            Team Workload & Capacity
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            Delivery capacity visibility based on estimated task effort across FutureX teams.
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-fx-text-muted">Loading team directory...</div>
        ) : allTeams.length === 0 ? (
          <Card padding="none" className="bg-white">
            <EmptyState
              icon={<Users className="w-5 h-5 text-fx-green-700" />}
              title="No teams registered"
              description="No team directories have been configured in FutureX."
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {allTeams.map((team: any) => (
              <Card key={team.id} padding="none" className="bg-white">
                <div className="px-5 py-3.5 bg-fx-bg-subtle border-b border-fx-border flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-fx-text-primary">{team.name}</h2>
                    {team.description && (
                      <p className="text-xs text-fx-text-muted">{team.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-fx-text-muted font-mono font-medium">
                    {team.members?.length || 0} Members
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                  {team.members?.map((m: any) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-[8px] border border-fx-border bg-white hover:border-fx-green-700/50 fx-transition space-y-3 shadow-card"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={m.avatarUrl}
                            name={m.name || `${m.firstName} ${m.lastName}`}
                            size="md"
                          />
                          <div>
                            <p className="font-semibold text-sm text-fx-text-primary">
                              {m.firstName} {m.lastName}
                            </p>
                            <p className="text-xs text-fx-text-muted">{m.jobTitle || m.globalRole}</p>
                          </div>
                        </div>

                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider',
                            m.capacityLevel === 'HIGH' && 'bg-[#FDF2F2] text-fx-semantic-danger border border-[#FAD3D3]',
                            m.capacityLevel === 'BALANCED' && 'bg-fx-green-50 text-fx-green-900 border border-fx-green-100',
                            m.capacityLevel === 'AVAILABLE' && 'bg-blue-50 text-[#205896] border border-blue-100',
                          )}
                        >
                          {m.capacityLevel}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-fx-border/60 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-1.5 bg-fx-bg-subtle rounded-md">
                          <span className="text-[10px] text-fx-text-muted block">Active Tasks</span>
                          <span className="font-bold text-fx-text-primary mt-0.5 block font-mono">
                            {m.activeTasksCount}
                          </span>
                        </div>

                        <div className="p-1.5 bg-fx-bg-subtle rounded-md">
                          <span className="text-[10px] text-fx-semantic-danger block">Blocked</span>
                          <span className="font-bold text-fx-semantic-danger mt-0.5 block font-mono">
                            {m.blockedTasksCount}
                          </span>
                        </div>

                        <div className="p-1.5 bg-fx-bg-subtle rounded-md">
                          <span className="text-[10px] text-fx-text-muted block">Estimated Hrs</span>
                          <span className="font-bold text-fx-green-900 mt-0.5 block font-mono">
                            {m.estimatedWorkloadHours}h
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
