'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit3, UserX, UserCheck, KeyRound } from 'lucide-react';
import { api } from '@/lib/api-client';
import { UserRole } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, roleFilter],
    queryFn: () =>
      api.get(
        `/users?search=${encodeURIComponent(search)}${roleFilter !== 'ALL' ? `&role=${roleFilter}` : ''}`,
      ),
  });

  const users = (usersData as any[]) || [];

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}/toggle-active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/users/${id}/reset-password`, { newPassword: 'FutureX2026!@#' }),
    onSuccess: () => {
      alert('Password reset to default "FutureX2026!@#" successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
              User Management
            </h1>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Team directory, system roles (Admin/Manager & Team Members), and account provisioning.
            </p>
          </div>

          <Link href="/admin/users/new">
            <Button size="sm" variant="primary" type="button" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add User
            </Button>
          </Link>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-fx-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-none">
          <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="h-8 text-xs bg-fx-bg"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-fx-bg border border-fx-border rounded-md text-fx-text-secondary focus:outline-none focus:ring-1 focus:ring-fx-green"
            >
              <option value="ALL">All Roles</option>
              <option value={UserRole.ADMIN}>Admin (Manager)</option>
              <option value={UserRole.TEAM_MEMBER}>Team Member</option>
            </select>
          </div>

          <span className="text-xs text-fx-text-muted font-mono">
            {users.length} {users.length === 1 ? 'user' : 'users'} registered
          </span>
        </div>

        {/* User Table */}
        {isLoading ? (
          <div className="bg-white border border-fx-border rounded-xl p-10 text-center text-xs text-fx-text-muted shadow-none">
            Loading team members...
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white border border-fx-border rounded-xl p-8 text-center text-xs text-fx-text-muted shadow-none">
            No users found matching your search.
          </div>
        ) : (
          <div className="bg-white border border-fx-border rounded-xl overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-fx-bg text-fx-text-secondary font-medium border-b border-fx-border">
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-3">Job Title</th>
                    <th className="py-2.5 px-3">System Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Registered</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60 text-fx-text-primary">
                  {users.map((u: any) => {
                    const isAdminUser = u.globalRole === UserRole.ADMIN || u.globalRole === UserRole.OWNER;
                    const isActive = u.isActive !== false;

                    const rowActions: ActionMenuItem[] = [
                      {
                        label: 'Edit User Profile',
                        icon: <Edit3 className="w-3.5 h-3.5" />,
                        href: `/admin/users/${u.id}/edit`,
                      },
                      {
                        label: 'Reset Password to Default',
                        icon: <KeyRound className="w-3.5 h-3.5" />,
                        onClick: () => resetPasswordMutation.mutate(u.id),
                        dividerAfter: true,
                      },
                      ...(u.globalRole !== UserRole.OWNER
                        ? [
                            {
                              label: isActive ? 'Deactivate Account' : 'Activate Account',
                              icon: isActive ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              ),
                              variant: isActive ? ('danger' as const) : ('default' as const),
                              onClick: () =>
                                toggleActiveMutation.mutate({ id: u.id, isActive: !isActive }),
                            },
                          ]
                        : []),
                    ];

                    return (
                      <tr key={u.id} className="hover:bg-fx-bg-hover fx-transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-fx-green-soft text-fx-green-dark font-semibold text-[11px] flex items-center justify-center shrink-0">
                              {u.firstName?.[0]}
                              {u.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-fx-text-primary">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="text-[11px] text-fx-text-muted font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-fx-text-secondary">
                          {u.jobTitle || (isAdminUser ? 'System Administrator' : 'Team Member')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'text-[11px] font-semibold uppercase px-2 py-0.5 rounded border',
                              isAdminUser
                                ? 'bg-fx-green-soft text-fx-green-dark border-fx-green/30'
                                : 'bg-fx-bg text-fx-text-secondary border-fx-border',
                            )}
                          >
                            {u.globalRole === UserRole.ADMIN
                              ? 'Admin (Manager)'
                              : u.globalRole === UserRole.OWNER
                                ? 'Owner'
                                : 'Team Member'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'text-[10px] uppercase font-semibold px-2 py-0.5 rounded border',
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-800 border-red-200',
                            )}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-fx-text-muted text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <ActionMenu items={rowActions} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
