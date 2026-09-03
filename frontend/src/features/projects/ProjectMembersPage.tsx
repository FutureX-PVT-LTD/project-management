'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';
import { UserRole } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export function ProjectMembersPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'team-members'],
    queryFn: () => api.get('/users?role=TEAM_MEMBER&isActive=true'),
    enabled: !!projectId,
  });

  const project = asRecord(projectData);
  const currentMembers = asArray<any>(project.members);
  const currentMemberUserIds = currentMembers.map((m) => m.userId);

  const availableUsers = useMemo(
    () =>
      asArray<any>(usersData).filter(
        (u) =>
          u.globalRole === UserRole.TEAM_MEMBER &&
          u.isActive !== false &&
          !currentMemberUserIds.includes(u.id),
      ),
    [usersData, currentMemberUserIds],
  );

  const filteredAvailable = availableUsers.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.jobTitle?.toLowerCase().includes(q);
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/projects/${projectId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => setError(err.message || 'Failed to add member.'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => setError(err.message || 'Failed to remove member.'),
  });

  return (
    <AppShell>
      <FormPageLayout
        title="Manage Members"
        description="Keep project visibility separate from task assignment. Only active team members can be added."
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.name || 'Project', href: `/projects/${projectId}` },
          { label: 'Members' },
        ]}
        footer={
          <Link href={`/projects/${projectId}`}>
            <Button variant="primary">Done</Button>
          </Link>
        }
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="bg-white border border-fx-border rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
            Current Team
          </h2>
          {projectLoading ? (
            <p className="p-4 text-center text-xs text-fx-text-muted">Loading project team...</p>
          ) : currentMembers.length === 0 ? (
            <p className="rounded border border-fx-border bg-fx-bg p-4 text-center text-xs text-fx-text-muted">
              No team members currently assigned.
            </p>
          ) : (
            <div className="rounded-lg border border-fx-border divide-y divide-fx-border/60 overflow-hidden">
              {currentMembers.map((m) => (
                <div key={m.id || m.userId} className="flex items-center justify-between gap-3 p-3 text-xs">
                  <div>
                    <p className="font-semibold text-fx-text-primary">
                      {m.user?.firstName} {m.user?.lastName}
                    </p>
                    <p className="text-[11px] text-fx-text-muted">{m.user?.jobTitle || 'Team Member'}</p>
                  </div>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-red-700 hover:bg-red-50"
                    loading={removeMemberMutation.isPending}
                    onClick={() => removeMemberMutation.mutate(m.userId)}
                    leftIcon={<Trash2 className="h-3 w-3" />}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-fx-border rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
            Add Member
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fx-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search available team members..."
              className="w-full rounded-md border border-fx-border bg-white py-2 pl-8 pr-3 text-xs focus:border-fx-green focus:outline-none focus:ring-1 focus:ring-fx-green"
            />
          </div>
          {usersLoading ? (
            <p className="p-4 text-center text-xs text-fx-text-muted">Loading available members...</p>
          ) : filteredAvailable.length === 0 ? (
            <p className="rounded border border-fx-border bg-fx-bg p-4 text-center text-xs text-fx-text-muted">
              No active team members are available to add.
            </p>
          ) : (
            <div className="rounded-lg border border-fx-border divide-y divide-fx-border/60 overflow-hidden">
              {filteredAvailable.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                  <div>
                    <p className="font-semibold text-fx-text-primary">{user.firstName} {user.lastName}</p>
                    <p className="text-[11px] text-fx-text-muted">{user.jobTitle || 'Team Member'}</p>
                  </div>
                  <Button
                    size="xs"
                    variant="secondary"
                    loading={addMemberMutation.isPending}
                    onClick={() => addMemberMutation.mutate(user.id)}
                    leftIcon={<Plus className="h-3 w-3" />}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </FormPageLayout>
    </AppShell>
  );
}
