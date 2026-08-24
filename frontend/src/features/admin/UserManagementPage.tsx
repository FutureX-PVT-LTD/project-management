'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Search,
  Plus,
  UserCheck,
  UserX,
  KeyRound,
  Edit2,
  Mail,
  Inbox,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { UserRole } from '@futurex/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { AppShell } from '@/components/layout/AppShell';
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [resetPassUser, setResetPassUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Create User Form state
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.TEAM_MEMBER);
  const [error, setError] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () =>
      api.get(`/users?search=${encodeURIComponent(search)}&role=${roleFilter}`),
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (dto: any) => api.post('/users', dto),
    onSuccess: () => {
      setCreateUserOpen(false);
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewJobTitle('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => setError(err.message || 'Failed to create user'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      api.patch(`/users/${id}`, updates),
    onSuccess: () => {
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => setError(err.message || 'Failed to update user'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}/toggle-active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => alert(err.message || 'Failed to toggle active state'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, pass }: { id: string; pass: string }) =>
      api.post(`/users/${id}/reset-password`, { newPassword: pass }),
    onSuccess: () => {
      setResetPassUser(null);
      setNewPassword('');
      alert('Password reset successfully!');
    },
    onError: (err: any) => alert(err.message || 'Failed to reset password'),
  });

  const allUsers = (users as any[]) || [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFirstName || !newLastName) {
      setError('Email, First Name, and Last Name are required');
      return;
    }
    createUserMutation.mutate({
      email: newEmail,
      firstName: newFirstName,
      lastName: newLastName,
      jobTitle: newJobTitle || undefined,
      globalRole: newRole,
    });
  };

  return (
    <AppShell>
      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-medium mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Kasun"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Mendis"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Work Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="name@futurex.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Job Title
              </label>
              <Input
                placeholder="e.g. 3D Environment Artist"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                Role Permission Level
              </label>
              <select
                value={newRole}
                onChange={(e: any) => setNewRole(e.target.value)}
                className="w-full h-9 rounded-md border border-fx-border bg-white px-3 text-xs text-fx-text-primary focus:border-fx-green-700 focus:outline-none"
              >
                <option value={UserRole.TEAM_MEMBER}>TEAM_MEMBER (Individual Contributor)</option>
                <option value={UserRole.PROJECT_MANAGER}>PROJECT_MANAGER (Producer / Lead)</option>
                <option value={UserRole.ADMIN}>ADMIN (System Administrator)</option>
                <option value={UserRole.OWNER}>OWNER (Studio Executive)</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setCreateUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={createUserMutation.isPending}>
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle>Edit Team Member: {editUser.firstName} {editUser.lastName}</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUserMutation.mutate({
                  id: editUser.id,
                  updates: {
                    firstName: editUser.firstName,
                    lastName: editUser.lastName,
                    jobTitle: editUser.jobTitle,
                    globalRole: editUser.globalRole,
                  },
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                    First Name
                  </label>
                  <Input
                    value={editUser.firstName}
                    onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                    Last Name
                  </label>
                  <Input
                    value={editUser.lastName}
                    onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                  Job Title
                </label>
                <Input
                  value={editUser.jobTitle || ''}
                  onChange={(e) => setEditUser({ ...editUser, jobTitle: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                  Role Permission Level
                </label>
                <select
                  value={editUser.globalRole}
                  onChange={(e: any) => setEditUser({ ...editUser, globalRole: e.target.value })}
                  className="w-full h-9 rounded-md border border-fx-border bg-white px-3 text-xs text-fx-text-primary focus:border-fx-green-700 focus:outline-none"
                >
                  <option value={UserRole.TEAM_MEMBER}>TEAM_MEMBER (Individual Contributor)</option>
                  <option value={UserRole.PROJECT_MANAGER}>PROJECT_MANAGER (Producer / Lead)</option>
                  <option value={UserRole.ADMIN}>ADMIN (System Administrator)</option>
                  <option value={UserRole.OWNER}>OWNER (Studio Executive)</option>
                </select>
              </div>

              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={updateUserMutation.isPending}>
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Password Reset Dialog */}
      {resetPassUser && (
        <Dialog open={!!resetPassUser} onOpenChange={() => setResetPassUser(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle>Reset Password: {resetPassUser.email}</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPassword.trim()) return;
                resetPasswordMutation.mutate({
                  id: resetPassUser.id,
                  pass: newPassword.trim(),
                });
              }}
              className="space-y-4 text-xs"
            >
              <p className="text-fx-text-secondary leading-relaxed">
                Set a secure temporary password for this user. They can change it after logging in.
              </p>
              <div>
                <label className="block text-xs font-semibold text-fx-text-primary mb-1">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="Min 8 characters..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setResetPassUser(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={resetPasswordMutation.isPending}
                >
                  Confirm Reset
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fx-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
                User Management
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-fx-green-50 text-fx-green-900 font-semibold border border-fx-green-100">
                {allUsers.length} users
              </span>
            </div>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Account provisioning, role permissions, and access controls for FutureX staff.
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setCreateUserOpen(true)}
            className="gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Add Member
          </Button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-fx-border shadow-card text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="h-8 text-xs bg-fx-bg-subtle"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-md border border-fx-border bg-fx-bg-subtle px-2.5 text-xs text-fx-text-primary focus:border-fx-green-700 focus:outline-none"
            >
              <option value="">All Roles</option>
              {Object.values(UserRole).map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <Card padding="none" className="bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-fx-text-muted">Loading user accounts...</div>
          ) : allUsers.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-5 h-5 text-fx-green-700" />}
              title="No users found"
              description="No user accounts match your search filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-fx-bg-subtle/80 text-fx-text-muted border-b border-fx-border select-none text-[11px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 hidden md:table-cell">Job Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60">
                  {allUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-fx-bg-subtle fx-transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={u.avatarUrl}
                            firstName={u.firstName}
                            lastName={u.lastName}
                            size="sm"
                          />
                          <div>
                            <p className="font-semibold text-fx-text-primary text-[13px]">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-[11px] text-fx-text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-fx-bg-subtle text-fx-text-primary border border-fx-border">
                          {u.globalRole?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell text-fx-text-secondary whitespace-nowrap">
                        {u.jobTitle || '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-[4px]',
                            u.isActive
                              ? 'bg-fx-green-50 text-fx-green-900 border border-fx-green-100'
                              : 'bg-red-50 text-fx-semantic-danger border border-red-100',
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              u.isActive ? 'bg-fx-green-700' : 'bg-fx-semantic-danger',
                            )}
                          />
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 hidden sm:table-cell text-fx-text-muted whitespace-nowrap font-mono text-[11px]">
                        {u.lastLoginAt ? formatTimeAgo(u.lastLoginAt) : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditUser(u)}
                            className="p-1.5 rounded hover:bg-gray-100 text-fx-text-secondary hover:text-fx-text-primary"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setResetPassUser(u)}
                            className="p-1.5 rounded hover:bg-gray-100 text-fx-text-secondary hover:text-fx-text-primary"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })
                            }
                            className={cn(
                              'p-1.5 rounded hover:bg-gray-100',
                              u.isActive
                                ? 'text-fx-semantic-danger hover:bg-red-50'
                                : 'text-fx-green-700 hover:bg-fx-green-50',
                            )}
                            title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {u.isActive ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
