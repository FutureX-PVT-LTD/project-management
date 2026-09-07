'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Search, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';
import { TaskPriority, UserRole } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusPill } from '@/components/ui/StatusPill';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function TaskFormPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params?.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [requiresReview, setRequiresReview] = useState(true);
  const [selectedPredecessors, setSelectedPredecessors] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', 'project', projectId],
    queryFn: () => api.get(`/tasks?projectId=${projectId}`),
    enabled: !!projectId,
  });

  const project = asRecord(projectData);
  const projectMembers = useMemo(
    () =>
      asArray<any>(project.members).filter(
        (m) => m.user?.globalRole === UserRole.TEAM_MEMBER && m.user?.isActive !== false,
      ),
    [project.members],
  );
  const projectTasks = asArray<any>(tasksData);

  const filteredMembers = projectMembers.filter((m) => {
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    const name = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
    return name.includes(q) || m.user?.jobTitle?.toLowerCase().includes(q);
  });

  const filteredTasks = projectTasks.filter((task) => {
    if (!taskSearch) return true;
    const q = taskSearch.toLowerCase();
    return task.title?.toLowerCase().includes(q) || task.humanId?.toLowerCase().includes(q);
  });

  const createTaskMutation = useMutation({
    mutationFn: () =>
      api.post('/tasks', {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        assigneeId: assigneeId || undefined,
        priority,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        requiresReview,
        dependsOnTaskIds: selectedPredecessors.length ? selectedPredecessors : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.push(`/projects/${projectId}?taskCreated=1`);
    },
    onError: (err: any) => setError(err.message || 'Task could not be created.'),
  });

  const togglePrerequisite = (taskId: string) => {
    setSelectedPredecessors((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    createTaskMutation.mutate();
  };

  return (
    <AppShell>
      <form id="task-form" onSubmit={handleSubmit}>
        <FormPageLayout
          title="Create Task"
          description="Create work inside this project and assign it to one project team member."
          breadcrumbs={[
            { label: 'Projects', href: '/projects' },
            { label: project.name || 'Project', href: `/projects/${projectId}` },
            { label: 'New Task' },
          ]}
          footer={
            <>
              <Link href={`/projects/${projectId}`}>
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" loading={createTaskMutation.isPending} disabled={projectLoading}>
                Create Task
              </Button>
            </>
          }
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">Task</h2>
            <div>
              <label className="block text-xs font-medium text-fx-text-primary mb-1">Task Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prepare Base Asset" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-fx-text-primary mb-1">Description / Technical Notes</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-fx-border bg-white p-3 text-xs text-fx-text-primary focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Acceptance criteria, asset references, and implementation notes."
              />
            </div>
          </section>

          <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">Assignment</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fx-text-muted" />
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search project members..."
                className="w-full rounded-md border border-fx-border bg-white py-2 pl-8 pr-3 text-xs focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            {projectMembers.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">No project members available.</p>
                <Link href={`/projects/${projectId}/members`} className="mt-1 inline-block font-medium underline">
                  Manage Project Members
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-fx-border divide-y divide-fx-border/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAssigneeId('')}
                  className={cn('flex w-full items-center justify-between p-3 text-left text-xs hover:bg-fx-bg-hover', !assigneeId && 'bg-[#EEF4FF]')}
                >
                  <span className="font-medium text-fx-text-primary">Unassigned</span>
                  {!assigneeId && <Check className="h-4 w-4 text-[#2563EB]" />}
                </button>
                {filteredMembers.map((m) => {
                  const selected = assigneeId === m.userId;
                  return (
                    <button
                      type="button"
                      key={m.userId}
                      onClick={() => setAssigneeId(m.userId)}
                      className={cn('flex w-full items-center justify-between p-3 text-left text-xs hover:bg-fx-bg-hover', selected && 'bg-[#EEF4FF]')}
                    >
                      <span>
                        <span className="block font-semibold text-fx-text-primary">
                          {m.user?.firstName} {m.user?.lastName}
                        </span>
                        <span className="block text-[11px] text-fx-text-muted">{m.user?.jobTitle || 'Team Member'}</span>
                      </span>
                      {selected && <Check className="h-4 w-4 text-[#2563EB]" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-fx-text-primary mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="h-9 w-full rounded-md border border-fx-border bg-white px-3 text-xs focus:border-[#2563EB] focus:outline-none"
              >
                {Object.values(TaskPriority).map((p) => (
                  <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">Schedule</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-fx-text-primary mb-1">Estimated Effort</label>
                <Input type="number" min="0" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="8" />
              </div>
              <div>
                <label className="block text-xs font-medium text-fx-text-primary mb-1">Due Date</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">Workflow</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fx-text-muted" />
              <input
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search prerequisite tasks..."
                className="w-full rounded-md border border-fx-border bg-white py-2 pl-8 pr-3 text-xs focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            {selectedPredecessors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedPredecessors.map((id) => {
                  const task = projectTasks.find((t) => t.id === id);
                  if (!task) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded border border-fx-border bg-fx-bg px-2 py-1 text-[11px]">
                      {task.humanId} {task.title}
                      <button type="button" onClick={() => togglePrerequisite(id)} className="text-fx-text-muted hover:text-red-700">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto rounded-lg border border-fx-border divide-y divide-fx-border/60">
              {filteredTasks.length === 0 ? (
                <p className="p-4 text-center text-xs text-fx-text-muted">No existing tasks available.</p>
              ) : (
                filteredTasks.map((task) => {
                  const selected = selectedPredecessors.includes(task.id);
                  return (
                    <button
                      type="button"
                      key={task.id}
                      onClick={() => togglePrerequisite(task.id)}
                      className={cn('flex w-full items-center justify-between gap-3 p-3 text-left text-xs hover:bg-fx-bg-hover', selected && 'bg-[#EEF4FF]')}
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-[11px] font-semibold text-fx-text-muted">{task.humanId}</span>
                        <span className="block truncate font-semibold text-fx-text-primary">{task.title}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusPill status={task.status} size="xs" />
                        {selected && <Check className="h-4 w-4 text-[#2563EB]" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-fx-text-primary">
              <input
                type="checkbox"
                checked={requiresReview}
                onChange={(e) => setRequiresReview(e.target.checked)}
                className="rounded text-[#2563EB] focus:ring-[#2563EB]"
              />
              Requires Admin Review
            </label>
          </section>
        </FormPageLayout>
      </form>
    </AppShell>
  );
}
