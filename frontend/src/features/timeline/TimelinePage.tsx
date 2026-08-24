'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Flag, Link2, Search, FolderKanban } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetailSlideOver } from '@/features/tasks/TaskDetailSlideOver';
import { formatDate } from '@/lib/utils';

export function TimelinePage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const activeProjId = selectedProjectId || projects?.[0]?.id || '';

  const { data: project } = useQuery({
    queryKey: ['project', activeProjId],
    queryFn: () => (activeProjId ? api.get(`/projects/${activeProjId}`) : null),
    enabled: !!activeProjId,
  });

  const { data: tasks } = useQuery({
    queryKey: ['projectTasks', activeProjId],
    queryFn: () => (activeProjId ? api.get(`/tasks?projectId=${activeProjId}`) : []),
    enabled: !!activeProjId,
  });

  const allTasks = (tasks as any[]) || [];

  return (
    <AppShell>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fx-border pb-4">
          <div>
            <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
              Delivery Timeline
            </h1>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Gantt-style delivery schedule with finish-to-start dependencies and milestones.
            </p>
          </div>

          <select
            value={activeProjId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-9 bg-white border border-fx-border rounded-md px-3 text-xs text-fx-text-primary font-medium focus:outline-none focus:border-fx-green-700 shadow-card"
          >
            {projects?.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.key} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {project && (
          <Card padding="lg" className="bg-white space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-fx-green-50 text-fx-green-900 border border-fx-green-100 px-2 py-0.5 rounded-[4px]">
                  {project.key}
                </span>
                <h2 className="text-lg font-bold text-fx-text-primary tracking-tight">
                  {project.name}
                </h2>
              </div>
              <p className="text-xs text-fx-text-secondary mt-1">
                Milestone roadmap and deliverable tasks in order of dependency completion.
              </p>
            </div>

            {/* Milestones Bar */}
            <div className="p-4 bg-fx-bg-subtle rounded-[10px] border border-fx-border">
              <span className="text-[11px] uppercase tracking-wider font-bold text-fx-text-muted block mb-3">
                Project Milestones
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {project.milestones?.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-3 bg-white rounded-md border border-fx-border space-y-1.5 shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fx-text-primary truncate">{m.name}</span>
                      <span className="text-[10px] uppercase font-bold bg-fx-bg-subtle px-1.5 py-0.5 rounded text-fx-text-secondary border border-fx-border">
                        {m.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-fx-text-muted block font-medium">
                      Target: {formatDate(m.targetDate)}
                    </span>
                    <Progress value={m.progress} size="xs" showLabel={true} />
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks Sequence */}
            <div className="space-y-3">
              <span className="text-[11px] uppercase tracking-wider font-bold text-fx-text-muted block">
                Deliverables & Prerequisites
              </span>

              <div className="space-y-2.5">
                {allTasks.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="w-5 h-5 text-fx-green-700" />}
                    title="No tasks scheduled"
                    description="No tasks in this project have timeline schedules."
                  />
                ) : (
                  allTasks.map((t: any) => {
                    const hasDeps = t.blockedBy && t.blockedBy.length > 0;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        className="p-3.5 bg-white rounded-md border border-fx-border hover:border-fx-green-700/60 cursor-pointer fx-transition text-xs space-y-2 shadow-card"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-fx-text-muted text-[11px]">
                              {t.humanId}
                            </span>
                            <span className="font-semibold text-fx-text-primary text-[13px]">
                              {t.title}
                            </span>
                            <StatusPill status={t.status} size="xs" />
                          </div>
                          <span className="text-fx-text-muted font-medium text-[11px]">
                            {formatDate(t.dueDate)}
                          </span>
                        </div>

                        {hasDeps && (
                          <div className="text-[11px] text-fx-semantic-danger flex items-center gap-1 font-mono">
                            <Link2 className="w-3 h-3" /> Waiting for prerequisite:{' '}
                            {t.blockedBy.map((b: any) => b.predecessorTask?.humanId).join(', ')}
                          </div>
                        )}

                        <Progress value={t.progress} size="xs" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
