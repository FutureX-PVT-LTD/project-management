'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { FutureXLogo } from '@/components/branding/FutureXLogo';
import { useAuth } from '@/features/auth/AuthContext';
import { api, ApiError } from '@/lib/api-client';

export default function ChangeRequiredPasswordPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/login');
    else if (!user.mustChangePassword) router.replace('/dashboard');
  }, [isLoading, router, user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('Choose a password different from the temporary password.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      const channel = new BroadcastChannel('futurex-auth');
      channel.postMessage({ type: 'changed' });
      channel.close();
      window.location.assign('/login?passwordChanged=1');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Password could not be updated.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user || !user.mustChangePassword) {
    return <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" /></div>;
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-[440px] rounded-[12px] border border-[#E3E7EC] bg-white p-6 sm:p-8">
        <div className="mb-6"><FutureXLogo size="auth" priority /></div>
        <div className="mb-5">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#EEF4FF] text-[#2563EB]"><ShieldCheck className="h-4 w-4" /></div>
          <h1 className="text-xl font-semibold text-[#17191C]">Create your private password</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-[#626A73]">The temporary password can only be used for setup. Choose a new password before entering the workspace.</p>
        </div>

        {error && <div role="alert" className="mb-4 flex gap-2 rounded-[8px] border border-[#F0C8C8] bg-[#FFF5F5] p-3 text-xs text-[#AD3636]"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}

        <form onSubmit={submit} className="space-y-4">
          <PasswordField label="Temporary password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
          <p className="text-[11px] leading-relaxed text-[#7A828C]">Use at least 12 characters with uppercase, lowercase, a number and a special character.</p>
          <button type="submit" disabled={submitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-[#2563EB] text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Set password
          </button>
        </form>
      </section>
    </main>
  );
}

function PasswordField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  return <label className="block space-y-1.5 text-xs font-medium text-[#17191C]">{label}<input type="password" required minLength={12} maxLength={128} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="block h-11 w-full rounded-[8px] border border-[#DDE2E8] px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15" /></label>;
}
