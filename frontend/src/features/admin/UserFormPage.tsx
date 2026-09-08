'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asRecord } from '@/lib/api-data';
import { UserRole } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';

interface UserFormPageProps {
  mode: 'create' | 'edit';
}

export function UserFormPage({ mode }: UserFormPageProps) {
  const { user: currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params?.id as string | undefined;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TEAM_MEMBER);
  const [password, setPassword] = useState('FutureX2026!@#');
  const [error, setError] = useState<string | null>(null);

  const { data: userData } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => api.get(`/users/${userId}`),
    enabled: mode === 'edit' && !!userId,
  });

  const existingUser = asRecord(userData);

  useEffect(() => {
    if (mode !== 'edit' || !existingUser?.id) return;
    setFirstName(existingUser.firstName || '');
    setLastName(existingUser.lastName || '');
    setEmail(existingUser.email || '');
    setJobTitle(existingUser.jobTitle || '');
    setRole(
      existingUser.globalRole === UserRole.OWNER
        ? UserRole.OWNER
        : existingUser.globalRole === UserRole.ADMIN
          ? UserRole.ADMIN
          : UserRole.TEAM_MEMBER,
    );
  }, [mode, existingUser?.id, existingUser.firstName, existingUser.lastName, existingUser.email, existingUser.jobTitle, existingUser.globalRole]);

  const saveMutation = useMutation({
    mutationFn: () =>
      mode === 'create'
        ? api.post('/users', {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            jobTitle: jobTitle.trim() || undefined,
            globalRole: role,
            password: password || undefined,
          })
        : api.patch(`/users/${userId}`, {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            jobTitle: jobTitle.trim() || undefined,
            globalRole: role,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      router.push('/admin/users');
    },
    onError: (err: any) => setError(err.message || 'User could not be saved.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim() || (mode === 'create' && !email.trim())) {
      setError('Full name and work email are required.');
      return;
    }
    if (role === UserRole.OWNER && currentUser?.globalRole !== UserRole.OWNER) {
      setError('Only a Super Admin can create or assign Super Admin access.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <AppShell>
      <form id="user-form" onSubmit={handleSubmit}>
        <FormPageLayout
          title={mode === 'create' ? 'Add User' : 'Edit User'}
          description="Create a simple FutureX account with either Admin or Team Member access."
          breadcrumbs={[
            { label: 'Users', href: '/admin/users' },
            { label: mode === 'create' ? 'Add User' : 'Edit User' },
          ]}
          footer={
            <>
              <Link href="/admin/users">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" loading={saveMutation.isPending}>
                {mode === 'create' ? 'Create User' : 'Save User'}
              </Button>
            </>
          }
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">Profile</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-fx-text-primary mb-1">First Name *</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-fx-text-primary mb-1">Last Name *</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-fx-text-primary mb-1">Work Email *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={mode === 'edit'} required={mode === 'create'} />
            </div>
            <div>
              <label className="block text-xs font-medium text-fx-text-primary mb-1">Job Title</label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Game Developer" />
            </div>
          </section>

          <section className="bg-white border border-fx-border rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">Role</h2>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-9 w-full rounded-md border border-fx-border bg-white px-3 text-xs focus:border-[#2563EB] focus:outline-none"
            >
              <option value={UserRole.TEAM_MEMBER}>Team Member</option>
              <option value={UserRole.ADMIN}>Admin</option>
              {currentUser?.globalRole === UserRole.OWNER && (
                <option value={UserRole.OWNER}>Super Admin</option>
              )}
            </select>
          </section>

          {mode === 'create' && (
            <section className="bg-white border border-fx-border rounded-lg p-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">Initial Password</h2>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} />
            </section>
          )}
        </FormPageLayout>
      </form>
    </AppShell>
  );
}
