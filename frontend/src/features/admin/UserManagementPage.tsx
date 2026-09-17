'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit3, UserX, UserCheck, KeyRound, Trash2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { UserRole } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';
import { cn } from '@/lib/utils';
import { roleLabel } from '@/lib/role-labels';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

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
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: Error) => setActionError(error.message),
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EBEF] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
              User Management
            </h1>
            <p className="text-xs text-[#60666F] mt-1">
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
        {actionError && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-3 flex flex-wrap items-center justify-between gap-3 shadow-none">
          <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="h-8 text-xs bg-[#F8F9FB]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-[#F8F9FB] border border-[#E8EBEF] rounded-[9px] text-[#17191C] focus:bg-white focus:outline-none focus:border-[#2463EB]"
            >
              <option value="ALL">All Roles</option>
              <option value={UserRole.OWNER}>Super Admin</option>
              <option value={UserRole.ADMIN}>Admin (Manager)</option>
              <option value={UserRole.TEAM_MEMBER}>Team Member</option>
            </select>
          </div>

          <span className="text-xs text-[#8C939E] font-mono">
            {users.length} {users.length === 1 ? 'user' : 'users'} registered
          </span>
        </div>

        {/* User Table */}
        {isLoading ? (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-10 text-center text-xs text-[#8C939E]">
            Loading team members...
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-8 text-center text-xs text-[#8C939E]">
            No users found matching your search.
          </div>
        ) : (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAFBFC] text-[#60666F] font-medium border-b border-[#E8EBEF]">
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-3">Functional Roles</th>
                    <th className="py-2.5 px-3">System Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Registered</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBEF] text-[#17191C]">
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
                      ...(!isActive && currentUser?.globalRole === UserRole.OWNER
                        ? [{
                            label: 'Delete User',
                            icon: <Trash2 className="w-3.5 h-3.5" />,
                            variant: 'danger' as const,
                            onClick: () => {
                              const confirmed = window.confirm(
                                `Delete ${u.firstName} ${u.lastName}? Their account will be removed, open assignments will become unassigned, and historical activity will be preserved.`,
                              );
                              if (confirmed) deleteMutation.mutate(u.id);
                            },
                          }]
                        : []),
                    ];

                    return (
                      <tr key={u.id} className="hover:bg-[#F8F9FB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#EEF4FF] text-[#2463EB] font-medium text-[11px] flex items-center justify-center shrink-0">
                              {u.firstName?.[0]}
                              {u.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-[#17191C]">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="text-[11px] text-[#8C939E] font-mono">{u.email}</p>
                              {u.jobTitle && <p className="text-[11px] text-[#8C939E]">Job title: {u.jobTitle}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#60666F]">
                          <span className={cn(!u.functionalRoles?.length && 'font-medium text-amber-700')}>
                            {roleLabel(u.functionalRoles, 'Not assigned')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'text-[10px] font-medium uppercase px-2 py-0.5 rounded-[4px] border',
                              isAdminUser
                                ? 'bg-[#EEF4FF] text-[#2463EB] border-[#D0E1FD]'
                                : 'bg-[#F8F9FB] text-[#60666F] border-[#E8EBEF]',
                            )}
                          >
                            {u.globalRole === UserRole.ADMIN
                              ? 'Admin (Manager)'
                              : u.globalRole === UserRole.OWNER
                                ? 'Super Admin'
                                : 'Team Member'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'text-[10px] uppercase font-medium px-2 py-0.5 rounded-[4px] border',
                              isActive
                                ? 'bg-[#EDF7F2] text-[#26715A] border-[#C6E6D6]'
                                : 'bg-[#FCEEEE] text-[#B54747] border-[#F2C0C0]',
                            )}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#8C939E] text-[11px]">
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
