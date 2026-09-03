'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { ProjectStatus } from '@futurex/shared';
import { AlertCircle } from 'lucide-react';

interface EditProjectDrawerProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDrawer({ project, open, onOpenChange }: EditProjectDrawerProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.ACTIVE);
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync form state with project data whenever project changes or drawer opens
  useEffect(() => {
    if (project && open) {
      setName(project.name || '');
      setDescription(project.description || '');
      setStatus(project.status || ProjectStatus.ACTIVE);
      setStartDate(project.startDate ? project.startDate.split('T')[0] : '');
      setTargetDate(project.targetDate ? project.targetDate.split('T')[0] : '');
      setError(null);
    }
  }, [project, open]);

  const updateProjectMutation = useMutation({
    mutationFn: (dto: any) => api.patch(`/projects/${project?.id}`, dto),
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Failed to update project settings');
    },
  });

  if (!open || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project Name is required');
      return;
    }

    updateProjectMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-fx-text-muted bg-fx-bg px-1.5 py-0.5 rounded border border-fx-border">
            {project.key || '...'}
          </span>
          <span>Edit Project Settings</span>
        </div>
      }
      description="Update scope specifications, delivery targets, and lifecycle status."
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
            form="edit-project-form"
            variant="primary"
            size="md"
            isLoading={updateProjectMutation.isPending}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} id="edit-project-form" className="space-y-5 text-xs">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-fx-semantic-danger animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Project Name <span className="text-fx-semantic-danger">*</span>
          </label>
          <Input
            placeholder="e.g. Colombo Rider – Season 2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Project Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="w-full h-9 bg-white border border-fx-border rounded-md px-3 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
          >
            <option value={ProjectStatus.ACTIVE}>Active</option>
            <option value={ProjectStatus.PLANNED}>Planned</option>
            <option value={ProjectStatus.AT_RISK}>At Risk</option>
            <option value={ProjectStatus.COMPLETED}>Completed</option>
            <option value={ProjectStatus.ARCHIVED}>Archived</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Target Delivery Date
            </label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Description & Scope
          </label>
          <textarea
            rows={4}
            placeholder="Scope, deliverable objectives, and game features..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-fx-border rounded-md p-3 text-xs text-fx-text-primary placeholder:text-fx-text-muted focus:outline-none focus:border-fx-green focus:ring-1 focus:ring-fx-green"
          />
        </div>
      </form>
    </Drawer>
  );
}
