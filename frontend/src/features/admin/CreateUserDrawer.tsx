'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { UserRole } from '@futurex/shared';
import { AlertCircle, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';

interface CreateUserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDrawer({ open, onOpenChange }: CreateUserDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TEAM_MEMBER);
  const [password, setPassword] = useState('FutureX2026!@#');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setJobTitle('');
      setRole(UserRole.TEAM_MEMBER);
      setPassword('FutureX2026!@#');
      setError(null);
    }
  }, [open]);

  const createUserMutation = useMutation({
    mutationFn: (dto: any) => api.post('/users', dto),
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Failed to create user');
    },
  });

  if (!open) return null;
  const canCreateSuperAdmin = user?.globalRole === UserRole.OWNER;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name, and work email are required');
      return;
    }

    createUserMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      jobTitle: jobTitle.trim() || undefined,
      globalRole: role,
      password: password || undefined,
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Create New User"
      description="Provision a team member or administrator account for the workspace."
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
            form="create-user-form"
            variant="primary"
            size="md"
            isLoading={createUserMutation.isPending}
          >
            Create User Account
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} id="create-user-form" className="space-y-5 text-xs">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-fx-semantic-danger animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              First Name <span className="text-fx-semantic-danger">*</span>
            </label>
            <Input
              placeholder="e.g. Nimal"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              Last Name <span className="text-fx-semantic-danger">*</span>
            </label>
            <Input
              placeholder="e.g. Fernando"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Work Email Address <span className="text-fx-semantic-danger">*</span>
          </label>
          <Input
            type="email"
            placeholder="e.g. nimal@futurex.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Job Title */}
        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Job Title / Discipline
          </label>
          <Input
            placeholder="e.g. Game Developer, 3D Artist, QA Engineer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>

        {/* System Role Selection */}
        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-2">
            System Role & Permissions <span className="text-fx-semantic-danger">*</span>
          </label>
          <div className={cn('grid gap-3', canCreateSuperAdmin ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2')}>
            <div
              onClick={() => setRole(UserRole.TEAM_MEMBER)}
              className={cn(
                'p-3.5 border rounded-[8px] cursor-pointer fx-transition select-none space-y-1',
                role === UserRole.TEAM_MEMBER
                  ? 'border-[#2563EB] bg-[#EEF4FF]/50 ring-1 ring-[#2563EB]'
                  : 'border-fx-border hover:bg-fx-bg-hover bg-white',
              )}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#2563EB]" />
                <span className="font-semibold text-xs text-fx-text-primary">Team Member</span>
              </div>
              <p className="text-[11px] text-fx-text-secondary leading-snug">
                Executes assigned work, submits daily updates, and logs progress.
              </p>
            </div>

            <div
              onClick={() => setRole(UserRole.ADMIN)}
              className={cn(
                'p-3.5 border rounded-[8px] cursor-pointer fx-transition select-none space-y-1',
                role === UserRole.ADMIN
                  ? 'border-[#2563EB] bg-[#EEF4FF]/50 ring-1 ring-[#2563EB]'
                  : 'border-fx-border hover:bg-fx-bg-hover bg-white',
              )}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2563EB]" />
                <span className="font-semibold text-xs text-fx-text-primary">Admin (Manager)</span>
              </div>
              <p className="text-[11px] text-fx-text-secondary leading-snug">
                Manages projects, assigns work, reviews deliverables, and provisions users.
              </p>
            </div>

            {canCreateSuperAdmin && (
              <div
                onClick={() => setRole(UserRole.OWNER)}
                className={cn(
                  'p-3.5 border rounded-[8px] cursor-pointer fx-transition select-none space-y-1',
                  role === UserRole.OWNER
                    ? 'border-[#2563EB] bg-[#EEF4FF]/50 ring-1 ring-[#2563EB]'
                    : 'border-fx-border hover:bg-fx-bg-hover bg-white',
                )}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#7557B5]" />
                  <span className="font-semibold text-xs text-fx-text-primary">Super Admin</span>
                </div>
                <p className="text-[11px] text-fx-text-secondary leading-snug">
                  Full workspace control, including project deletion and Super Admin creation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Temporary Password */}
        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Initial / Temporary Password
          </label>
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Temporary login password"
          />
          <p className="text-[11px] text-fx-text-muted mt-1">
            Default: <span className="font-mono font-medium">FutureX2026!@#</span> (The user will use this for initial login).
          </p>
        </div>
      </form>
    </Drawer>
  );
}
