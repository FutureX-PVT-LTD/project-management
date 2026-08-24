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
import { ProjectStatus, ProjectHealth, ProjectMemberRole } from '@futurex/shared';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const queryClient = useQueryClient();

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
    enabled: open,
  });

  const createProjectMutation = useMutation({
    mutationFn: (dto: any) => api.post('/projects', dto),
    onSuccess: () => {
      setKey('');
      setName('');
      setDescription('');
      setTargetDate('');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pm-dashboard'] });
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !name.trim() || !projectManagerId) {
      setError('Key, Name, and Project Manager are required');
      return;
    }

    createProjectMutation.mutate({
      key: key.toUpperCase().trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      projectManagerId,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Project Key <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. CR, HM"
                value={key}
                maxLength={6}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Colombo Rider – Season 2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-fx-text-primary mb-1">
              Project Manager <span className="text-red-500">*</span>
            </label>
            <select
              value={projectManagerId}
              onChange={(e) => setProjectManagerId(e.target.value)}
              className="w-full h-9 bg-white border border-fx-border rounded px-3 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
              required
            >
              <option value="">Select Project Manager...</option>
              {users?.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.jobTitle || u.globalRole})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
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
            <label className="block text-xs font-semibold text-fx-text-primary mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Scope, deliverable objectives, and game features..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-fx-border rounded-md p-3 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
            />
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
              isLoading={createProjectMutation.isPending}
            >
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
