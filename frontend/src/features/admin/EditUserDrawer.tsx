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

interface EditUserDrawerProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDrawer({ user, open, onOpenChange }: EditUserDrawerProps) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TEAM_MEMBER);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && open) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setJobTitle(user.jobTitle || '');
      setRole(user.globalRole || UserRole.TEAM_MEMBER);
      setIsActive(user.isActive !== false);
      setError(null);
    }
  }, [user, open]);

  const updateUserMutation = useMutation({
    mutationFn: (dto: any) => api.patch(`/users/${user?.id}`, dto),
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Failed to update user');
    },
  });

  if (!open || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    updateUserMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      jobTitle: jobTitle.trim() || undefined,
      globalRole: role,
      isActive,
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Edit User Profile"
      description="Update team member details, role-based access permissions, and account status."
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
            form="edit-user-form"
            variant="primary"
            size="md"
            isLoading={updateUserMutation.isPending}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} id="edit-user-form" className="space-y-5 text-xs">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-fx-semantic-danger animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Email display */}
        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Work Email Address
          </label>
          <Input
            type="email"
            value={user.email}
            disabled
            className="bg-fx-bg text-fx-text-muted cursor-not-allowed font-mono text-xs"
          />
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-1">
              First Name <span className="text-fx-semantic-danger">*</span>
            </label>
            <Input
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
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Job Title */}
        <div>
          <label className="block text-xs font-medium text-fx-text-primary mb-1">
            Job Title / Discipline
          </label>
          <Input
            placeholder="e.g. Game Developer, 3D Artist"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>

        {/* System Role Selection */}
        {user.globalRole !== UserRole.OWNER && (
          <div>
            <label className="block text-xs font-medium text-fx-text-primary mb-2">
              System Role & Permissions <span className="text-fx-semantic-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
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
                  Executes assigned deliverables and submits daily progress updates.
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
            </div>
          </div>
        )}

        {/* Active Status */}
        {user.globalRole !== UserRole.OWNER && (
          <div className="pt-2 border-t border-fx-border/70 flex items-center justify-between">
            <div>
              <p className="font-medium text-fx-text-primary">Account Status</p>
              <p className="text-[11px] text-fx-text-secondary">
                Inactive accounts cannot sign in or receive task assignments.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                isActive ? 'bg-[#2563EB]' : 'bg-[#E3E7EC]',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                  isActive ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        )}
      </form>
    </Drawer>
  );
}
