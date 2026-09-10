'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { TaskPriority, UserRole } from '@futurex/shared';
import { AlertCircle } from 'lucide-react';

interface TaskCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

export function TaskCreateDrawer({
  open,
  onOpenChange,
  defaultProjectId,
}: TaskCreateDrawerProps) {
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

  const projectList = (projects as any[]) || [];
  const activeProjectId = projectId || defaultProjectId || projectList[0]?.id || '';

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setProjectId(defaultProjectId || projectList[0]?.id || '');
      setMilestoneId('');
      setAssigneeId('');
      setPriority(TaskPriority.MEDIUM);
      setEstimatedHours('');
      setDueDate('');
      setRequiresReview(false);
      setSelectedPredecessors([]);
      setError(null);
    }
  }, [open, defaultProjectId, projectList]);

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

  const projectMembers = ((currentProject as any)?.members || []).filter(
    (m: any) => m.user?.isActive !== false,
  );

  const createTaskMutation = useMutation({
    mutationFn: (dto: any) => api.post('/tasks', dto),
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', activeProjectId] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Failed to create task');
    },
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Deliverable Task"
      description="Assign work items to project members and establish prerequisite dependencies."
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-task-form"
            variant="primary"
            size="md"
            isLoading={createTaskMutation.isPending}
          >
            Create Task
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} id="create-task-form" className="space-y-5 text-xs">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-fx-semantic-danger animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Task Title */}
        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Task Title <span className="text-fx-semantic-danger">*</span>
          </label>
          <Input
            placeholder="e.g. Implement collision detection for vehicle chassis..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Project & Milestone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Project <span className="text-fx-semantic-danger">*</span>
            </label>
            <select
              value={activeProjectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setMilestoneId('');
                setAssigneeId('');
                setSelectedPredecessors([]);
              }}
              className="w-full h-9 bg-white border border-fx-border rounded-md px-3 text-xs text-fx-text-primary focus:outline-none focus:border-[#2563EB]"
            >
              {projectList.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.key} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Milestone (Optional)
            </label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="w-full h-9 bg-white border border-fx-border rounded-md px-3 text-xs text-fx-text-primary focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">No Milestone</option>
              {(currentProject as any)?.milestones?.map((m: any) => (
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
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Assignee (Project Team Members)
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full h-9 bg-white border border-fx-border rounded-md px-3 text-xs text-fx-text-primary focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">Unassigned</option>
              {projectMembers.length === 0 ? (
                <option disabled value="none">
                  (No team members in project)
                </option>
              ) : (
                projectMembers.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.firstName} {m.user?.lastName} ({m.user?.jobTitle || 'Team Member'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full h-9 bg-white border border-fx-border rounded-md px-3 text-xs text-fx-text-primary focus:outline-none focus:border-[#2563EB] font-medium"
            >
              {Object.values(TaskPriority).map((pr) => (
                <option key={pr} value={pr}>
                  {pr} Priority
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Estimates & Due Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Estimated Effort (Hours)
            </label>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 8"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Due Date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Prerequisites / Dependencies */}
        {(projectTasks as any[]) && (projectTasks as any[]).length > 0 && (
          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Prerequisites (Must be completed before this task can start)
            </label>
            <select
              multiple
              value={selectedPredecessors}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, (option) => option.value);
                setSelectedPredecessors(values);
              }}
              className="w-full bg-white border border-fx-border rounded-md p-2 text-xs text-fx-text-primary focus:outline-none focus:border-[#2563EB] h-24"
            >
              {(projectTasks as any[]).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.humanId} - {t.title} ({t.status})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-fx-text-muted mt-1">
              Hold Ctrl / Cmd to select multiple prerequisite tasks.
            </p>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Description & Technical Notes
          </label>
          <textarea
            rows={3}
            placeholder="Acceptance criteria, asset links, or implementation details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-fx-border rounded-md p-3 text-xs text-fx-text-primary placeholder:text-fx-text-muted focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>

        {/* Requires Review toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="req-review"
            checked={requiresReview}
            onChange={(e) => setRequiresReview(e.target.checked)}
            className="rounded text-[#2563EB] focus:ring-[#2563EB]"
          />
          <label htmlFor="req-review" className="text-xs font-medium text-fx-text-primary select-none cursor-pointer">
            Requires Admin review & approval before marking Done
          </label>
        </div>
      </form>
    </Drawer>
  );
}
