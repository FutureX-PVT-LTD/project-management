'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import Link from 'next/link';

export function AccountSecurityPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('Password updated. Please sign in again.');
      const channel = new BroadcastChannel('futurex-auth');
      channel.postMessage('changed');
      channel.close();
      window.location.assign('/login');
    },
    onError: (err) => {
      setSuccess('');
      setError(err instanceof ApiError ? err.message : 'Unable to update password.');
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill all password fields.');
      return;
    }

    if (
      newPassword.length < 12 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)
    ) {
      setError(
        'New password must be at least 12 characters long and include uppercase, lowercase, numbers, and special characters.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    changePasswordMutation.mutate();
  };

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Your account';

  return (
    <AppShell>
      <Link href="/account/login-history" className="mb-4 inline-block text-sm text-blue-600">My Login History</Link>
      <div className="max-w-3xl space-y-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
            Account Security
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary">
            Update the password used to sign in as {fullName}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-4 items-start">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-fx-border rounded-[8px] p-5 sm:p-6 space-y-4 shadow-none"
          >
            {error && (
              <div className="flex items-start gap-2 rounded-[8px] border border-[#F0C8C8] bg-[#FFF5F5] px-3 py-2 text-xs text-[#AD3636]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 rounded-[8px] border border-[#BFE5D2] bg-[#F3FBF7] px-3 py-2 text-xs text-[#237A57]">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="current-password" className="text-xs font-semibold text-fx-text-primary">
                Current password
              </label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-xs font-semibold text-fx-text-primary">
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 12 chars (upper, lower, digit, symbol)"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-xs font-semibold text-fx-text-primary">
                Confirm new password
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter new password"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" loading={changePasswordMutation.isPending} leftIcon={<KeyRound className="w-3.5 h-3.5" />}>
                Update Password
              </Button>
            </div>
          </form>

          <aside className="bg-[#F7F8FA] border border-fx-border rounded-[8px] p-4 text-xs text-fx-text-secondary space-y-2">
            <div className="w-8 h-8 rounded-[8px] bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="font-semibold text-fx-text-primary">Keep your account private</p>
            <p className="leading-relaxed">
              Use this after your first login if an administrator created your initial password.
            </p>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
