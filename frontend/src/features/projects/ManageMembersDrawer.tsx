'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { UserRole } from '@futurex/shared';
import { Search, Plus, Trash2, Users, AlertCircle } from 'lucide-react';

interface ManageMembersDrawerProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageMembersDrawer({
  projectId,
  open,
  onOpenChange,
}: ManageMembersDrawerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch current project details to get members
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => (projectId ? api.get(`/projects/${projectId}`) : null),
    enabled: !!projectId && open,
  });

  // Fetch all active TEAM_MEMBER users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'eligible-members'],
    queryFn: () => api.get('/users?isActive=true'),
    enabled: !!projectId && open,
  });

  const project = projectData as any;
  const currentMembers = (project?.members || []) as any[];
  const currentMemberUserIds = currentMembers.map((m) => m.userId);

  const availableUsers = ((usersData as any[]) || []).filter(
    (u) =>
      u.isActive !== false &&
      !currentMemberUserIds.includes(u.id),
  );

  const filteredAvailable = availableUsers.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    return name.includes(q) || (u.jobTitle && u.jobTitle.toLowerCase().includes(q));
  });

  // Add Member Mutation
  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/projects/${projectId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Failed to add member');
    },
  });

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Failed to remove member');
    },
  });

  if (!open || !projectId) return null;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-fx-text-muted bg-fx-bg px-1.5 py-0.5 rounded border border-fx-border">
            {project?.key || '...'}
          </span>
          <span>Manage Project Members</span>
        </div>
      }
      description={`Assign and remove active team members for ${project?.name || 'this project'}.`}
      footer={
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => onOpenChange(false)}
        >
          Done
        </Button>
      }
    >
      <div className="space-y-6 text-xs">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-fx-semantic-danger animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Members Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Assigned Team ({currentMembers.length})</span>
            </h3>
          </div>

          {projectLoading ? (
            <p className="text-[11px] text-fx-text-muted py-3 text-center">
              Loading project team...
            </p>
          ) : currentMembers.length === 0 ? (
            <div className="p-4 bg-fx-bg-subtle border border-fx-border rounded-lg text-center text-fx-text-muted">
              No team members currently assigned to this project.
            </div>
          ) : (
            <div className="border border-fx-border rounded-[8px] divide-y divide-fx-border/60 bg-white overflow-hidden shadow-none">
              {currentMembers.map((m: any) => (
                <div
                  key={m.id || m.userId}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-fx-bg-hover fx-transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#EEF4FF] text-[#2563EB] font-semibold text-[11px] flex items-center justify-center shrink-0">
                      {m.user?.firstName?.[0]}
                      {m.user?.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-fx-text-primary truncate">
                        {m.user?.firstName} {m.user?.lastName}
                      </p>
                      <p className="text-[11px] text-fx-text-muted truncate">
                        {m.user?.jobTitle || 'Team Member'}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-fx-semantic-danger hover:bg-red-50 hover:text-red-700"
                    isLoading={removeMemberMutation.isPending}
                    onClick={() => removeMemberMutation.mutate(m.userId)}
                    leftIcon={<Trash2 className="w-3 h-3" />}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Team Members Section */}
        <div className="space-y-3 pt-4 border-t border-fx-border/70">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Available Team Members</span>
          </h3>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fx-text-muted" />
            <input
              type="text"
              placeholder="Search available team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-fx-border rounded-md text-fx-text-primary placeholder:text-fx-text-muted focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>

          {usersLoading ? (
            <p className="text-[11px] text-fx-text-muted py-2 text-center">
              Loading available members...
            </p>
          ) : availableUsers.length === 0 ? (
            <div className="p-3 bg-fx-bg-subtle border border-fx-border rounded-md text-[11px] text-fx-text-muted text-center">
              All available active team members are already assigned to this project.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto border border-fx-border rounded-[8px] divide-y divide-fx-border/60 bg-white shadow-none">
              {filteredAvailable.length === 0 ? (
                <p className="text-[11px] text-fx-text-muted p-3 text-center">
                  No matching available team members.
                </p>
              ) : (
                filteredAvailable.map((emp: any) => (
                  <div
                    key={emp.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-fx-bg-hover fx-transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-fx-bg-subtle text-fx-text-secondary font-semibold text-[11px] flex items-center justify-center shrink-0 border border-fx-border">
                        {emp.firstName?.[0]}
                        {emp.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-fx-text-primary truncate">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-[11px] text-fx-text-muted truncate">
                          {emp.jobTitle || 'Team Member'}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="xs"
                      variant="secondary"
                      isLoading={addMemberMutation.isPending}
                      onClick={() => addMemberMutation.mutate(emp.id)}
                      leftIcon={<Plus className="w-3 h-3" />}
                    >
                      Add to Project
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
