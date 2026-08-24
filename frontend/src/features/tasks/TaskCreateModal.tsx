'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TaskPriority, TaskStatus } from '@futurex/shared';

interface TaskCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

export function TaskCreateModal({
  open,
  onOpenChange,
  defaultProjectId,
}: TaskCreateModalProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [milestoneId, setMilestoneId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [requiresReview, setRequiresReview] = useState(false);
  const [selectedPredecessors, setSelectedPredecessors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch permitted projects
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
    enabled: open,
  });

  const activeProjectId = projectId || defaultProjectId || projects?.[0]?.id || '';

  // Fetch project details for milestones & members
  const { data: currentProject } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => (activeProjectId ? api.get(`/projects/${activeProjectId}`) : null),
    enabled: !!activeProjectId && open,
  });

  // Fetch existing tasks in project for prerequisite selection
  const { data: projectTasks } = useQuery({
    queryKey: ['projectTasks', activeProjectId],
    queryFn: () => (activeProjectId ? api.get(`/tasks?projectId=${activeProjectId}`) : []),
    enabled: !!activeProjectId && open,
  });

  const createTaskMutation = useMutation({
    mutationFn: (dto: any) => api.post('/tasks', dto),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setEstimatedHours('');
      setDueDate('');
      setSelectedPredecessors([]);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create task');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    if (!activeProjectId) {
      setError('Please select a project');
      return;
    }

    createTaskMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      projectId: activeProjectId,
      milestoneId: milestoneId || undefined,
      assigneeId: assigneeId || undefined,
      priority,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      requiresReview,
      dependsOnTaskIds: selectedPredecessors.length > 0 ? selectedPredecessors : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-fx-text-primary mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Model the front suspension assembly..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Project & Milestone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={activeProjectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setMilestoneId('');
                  setAssigneeId('');
                  setSelectedPredecessors([]);
                }}
                className="w-full h-9 bg-white border border-fx-border rounded px-3 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
              >
                {projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.key} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Milestone (Optional)
              </label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="w-full h-9 bg-white border border-fx-border rounded px-3 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
              >
                <option value="">No Milestone</option>
                {currentProject?.milestones?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-9 bg-white border border-fx-border rounded px-3 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
              >
                <option value="">Unassigned</option>
                {currentProject?.members?.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.firstName} {m.user.lastName} ({m.user.jobTitle || 'Member'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-9 bg-white border border-fx-border rounded px-3 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green font-medium"
              >
                {Object.values(TaskPriority).map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimates & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Estimated Effort (Hours)
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 12"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Dependencies / Prerequisites */}
          {projectTasks && projectTasks.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Prerequisites (Must be completed before this can start)
              </label>
              <select
                multiple
                value={selectedPredecessors}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, (option) => option.value);
                  setSelectedPredecessors(values);
                }}
                className="w-full bg-white border border-fx-border rounded p-2 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green h-24"
              >
                {projectTasks.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.humanId} - {t.title} ({t.status})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-fx-text-muted mt-1">
                Hold Ctrl (Windows) / Cmd (Mac) to select multiple prerequisites.
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-fx-text-primary mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Provide technical specifications, reference links, or acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-fx-border rounded-md p-3 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
            />
          </div>

          {/* Requires Review toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="req-review"
              checked={requiresReview}
              onChange={(e) => setRequiresReview(e.target.checked)}
              className="rounded text-fx-green focus:ring-fx-green"
            />
            <label htmlFor="req-review" className="text-xs font-medium text-fx-text-primary select-none">
              Requires Project Manager review & approval before marking Done
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createTaskMutation.isPending}
            >
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
