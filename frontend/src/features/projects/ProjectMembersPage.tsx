'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';
import { UserRole } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { roleLabel } from '@/lib/role-labels';

export function ProjectMembersPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const requestedRoleId = searchParams.get('roleId');
  const requestedReturnTo = searchParams.get('returnTo');
  const assignmentReturnTo = `/projects/${projectId}/setup`;
  const returnTo = requestedReturnTo === assignmentReturnTo
    ? assignmentReturnTo
    : `/projects/${projectId}`;
  const [search, setSearch] = useState('');
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'eligible-members'],
    queryFn: () => api.get('/users?isActive=true'),
    enabled: !!projectId,
  });

  const project = asRecord(projectData);
  const currentMembers = asArray<any>(project.members);
  const currentMemberUserIds = currentMembers.map((m) => m.userId);

  const availableUsers = useMemo(
    () =>
      asArray<any>(usersData).filter(
        (u) =>
          u.isActive !== false &&
          !currentMemberUserIds.includes(u.id) && (!requestedRoleId || u.functionalRoles?.some((role: any) => role.id === requestedRoleId)),
      ),
    [usersData, currentMemberUserIds, requestedRoleId],
  );

  const filteredAvailable = availableUsers.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.jobTitle?.toLowerCase().includes(q);
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, functionalRoleIds }: { userId: string; functionalRoleIds: string[] }) => api.post(`/projects/${projectId}/members`, { userId, functionalRoleIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['assignment-workspace', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => setError(err.message || 'Failed to add member.'),
  });

  const updateRolesMutation = useMutation({
    mutationFn: ({ userId, functionalRoleIds }: { userId: string; functionalRoleIds: string[] }) => api.patch(`/projects/${projectId}/members/${userId}/roles`, { functionalRoleIds }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', projectId] }); queryClient.invalidateQueries({ queryKey: ['assignment-workspace', projectId] }); },
    onError: (err: any) => setError(err.message || 'Project Roles could not be updated.'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['assignment-workspace', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => setError(err.message || 'Failed to remove member.'),
  });

  return (
    <AppShell>
      <FormPageLayout
        title="Product Team"
        description="Choose who participates, then select the Functional Roles each person performs on this Product."
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.name || 'Project', href: `/projects/${projectId}` },
          { label: 'Members' },
        ]}
        footer={
          <Link href={returnTo}>
            <Button variant="primary">{returnTo.endsWith('/setup') ? 'Back to Assignments' : 'Done'}</Button>
          </Link>
        }
      >
        {error && (
          <div className="rounded-[8px] border border-[#FECACA] bg-[#FDEEEE] p-3 text-xs font-medium text-[#C24141] flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="bg-white border border-[#E3E7EC] rounded-[10px] p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#626A73]">
            Current Team
          </h2>
          {projectLoading ? (
            <p className="p-4 text-center text-xs text-[#929AA3]">Loading project team...</p>
          ) : currentMembers.length === 0 ? (
            <p className="rounded-[8px] border border-[#E3E7EC] bg-[#F7F8FA] p-4 text-center text-xs text-[#929AA3]">
              No team members currently assigned.
            </p>
          ) : (
            <div className="rounded-[8px] border border-[#E3E7EC] divide-y divide-[#E3E7EC] overflow-hidden">
              {currentMembers.map((m) => (
                <div key={m.id || m.userId} className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-[#F7F8FA] transition-colors">
                  <div>
                    <p className="font-semibold text-[13.5px] text-[#181B20]">
                      {m.user?.firstName} {m.user?.lastName}
                    </p>
                    <p className="text-[11.5px] font-medium text-[#2563EB]">{roleLabel(m.projectRoles, 'No project role assigned')}</p>
                    {m.user?.jobTitle && <p className="text-[11.5px] text-[#626A73]">{m.user.jobTitle}</p>}
                    <p className="mt-1 text-[11px] text-[#626A73]">{m.activeAssignmentsCount || 0} active assignments</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(m.user?.functionalRoleLinks || m.user?.functionalRoles || []).map((entry: any) => {
                        const role = entry.functionalRole || entry;
                        const current = roleDrafts[m.userId] ?? (m.projectRoles || []).map((item: any) => item.id);
                        return (
                          <label key={role.id} className="flex items-center gap-1.5 rounded-[6px] border border-[#E3E7EC] bg-[#F7F8FA] px-2 py-0.5 text-[11px] text-[#181B20]">
                            <input
                              type="checkbox"
                              checked={current.includes(role.id)}
                              onChange={(event) =>
                                setRoleDrafts((drafts) => ({
                                  ...drafts,
                                  [m.userId]: event.target.checked
                                    ? [...current, role.id]
                                    : current.filter((id: string) => id !== role.id),
                                }))
                              }
                              className="rounded border-[#E3E7EC] text-[#2563EB]"
                            />
                            {role.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={roleDrafts[m.userId] === undefined}
                      loading={updateRolesMutation.isPending}
                      onClick={() => updateRolesMutation.mutate({ userId: m.userId, functionalRoleIds: roleDrafts[m.userId] })}
                    >
                      Save Roles
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-[#C24141] hover:bg-[#FDEEEE]"
                      loading={removeMemberMutation.isPending}
                      onClick={() => removeMemberMutation.mutate(m.userId)}
                      leftIcon={<Trash2 className="h-3 w-3" />}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-[#E3E7EC] rounded-[10px] p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#626A73]">
            Add Member
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#929AA3]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search available team members..."
              className="w-full rounded-[8px] border border-[#E3E7EC] bg-white py-2 pl-8 pr-3 text-xs text-[#181B20] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>
          {usersLoading ? (
            <p className="p-4 text-center text-xs text-[#929AA3]">Loading available members...</p>
          ) : filteredAvailable.length === 0 ? (
            <p className="rounded-[8px] border border-[#E3E7EC] bg-[#F7F8FA] p-4 text-center text-xs text-[#929AA3]">
              No active team members are available to add.
            </p>
          ) : (
            <div className="rounded-[8px] border border-[#E3E7EC] divide-y divide-[#E3E7EC] overflow-hidden">
              {filteredAvailable.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-[#F7F8FA] transition-colors">
                  <div>
                    <p className="font-semibold text-[13.5px] text-[#181B20]">{user.firstName} {user.lastName}</p>
                    <p className="text-[11.5px] font-medium text-[#2563EB]">{roleLabel(user.functionalRoles)}</p>
                    {user.jobTitle && <p className="text-[11.5px] text-[#626A73]">{user.jobTitle}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(user.functionalRoles || []).map((role: any) => {
                        const current = roleDrafts[user.id] || [];
                        return (
                          <label key={role.id} className="flex items-center gap-1.5 rounded-[6px] border border-[#E3E7EC] bg-[#F7F8FA] px-2 py-0.5 text-[11px] text-[#181B20]">
                            <input
                              type="checkbox"
                              checked={current.includes(role.id)}
                              onChange={(event) =>
                                setRoleDrafts((drafts) => ({
                                  ...drafts,
                                  [user.id]: event.target.checked
                                    ? [...current, role.id]
                                    : current.filter((id: string) => id !== role.id),
                                }))
                              }
                              className="rounded border-[#E3E7EC] text-[#2563EB]"
                            />
                            {role.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="secondary"
                    loading={addMemberMutation.isPending}
                    onClick={() => addMemberMutation.mutate({ userId: user.id, functionalRoleIds: roleDrafts[user.id] || [] })}
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
