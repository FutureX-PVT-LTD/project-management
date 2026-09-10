'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { UserRole } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';
import { asRecord } from '@/lib/api-data';
import { useAuth } from '@/features/auth/AuthContext';

function sessionState(session: any) {
  if (session.isRevoked) return 'Revoked';
  if (new Date(session.expiresAt).getTime() <= Date.now()) return 'Expired';
  return 'Active';
}

export function UserSecurityPage() {
  const params = useParams();
  const userId = String(params?.id || '');
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const owner = currentUser?.globalRole === UserRole.OWNER;
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', userId, 'security'],
    queryFn: () => api.get(`/users/${userId}/security`),
    enabled: owner && !!userId,
  });
  const result = asRecord(data);
  const person = asRecord(result.user);
  const sessions = Array.isArray(result.sessions) ? result.sessions : [];
  const history = Array.isArray(result.loginHistory) ? result.loginHistory : [];
  const revoke = useMutation({
    mutationFn: (sessionId: string) => api.patch(`/users/${userId}/sessions/${sessionId}/revoke`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', userId, 'security'] }),
  });
  const revokeAll = useMutation({
    mutationFn: () => api.post(`/users/${userId}/sessions/revoke-all`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', userId, 'security'] }),
  });

  if (!owner) return <AppShell><p className="py-6 text-sm">Owner access required.</p></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E8EBEF] pb-4">
          <div>
            <p className="text-xs text-[#8B929B]"><Link href="/admin/users" className="hover:text-[#2463EB]">Users</Link> / Security</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-[#17191C]"><ShieldCheck className="h-5 w-5" /> Account Security</h1>
            <p className="mt-1 text-[13px] text-[#60666F]">{person.firstName ? `${person.firstName} ${person.lastName} · ${person.email}` : 'User account session and sign-in history.'}</p>
          </div>
          <Button type="button" variant="secondary" loading={revokeAll.isPending} disabled={!sessions.some((item: any) => sessionState(item) === 'Active')} onClick={() => revokeAll.mutate()}>Revoke all sessions</Button>
        </header>
        {isLoading && <p className="text-sm text-[#60666F]">Loading account security...</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error.message}</p>}

        {!isLoading && !error && <>
          <section className="space-y-3">
            <div className="flex flex-wrap gap-6 border-b border-[#E8EBEF] pb-3 text-xs">
              <span><strong>Status:</strong> {person.isActive ? 'Active' : 'Inactive'}</span>
              <span><strong>Role:</strong> {String(person.globalRole || '').replace(/_/g, ' ')}</span>
              <span><strong>Last login:</strong> {person.lastLoginAt ? new Date(person.lastLoginAt).toLocaleString() : 'Never'}</span>
            </div>
            <h2 className="text-sm font-semibold text-[#17191C]">Sessions</h2>
            <p className="text-xs text-[#8B929B]">Session records contain timestamps only. Device and network details are shown in sign-in history when available.</p>
            <div className="overflow-x-auto border border-[#E8EBEF] rounded-lg">
              <table className="w-full text-left text-xs"><thead><tr className="bg-[#FAFBFC] text-[#60666F]"><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Last seen</th><th className="px-3 py-2">Expires</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-[#E8EBEF]">{sessions.length ? sessions.map((session: any) => <tr key={session.id}><td className="px-3 py-2 font-medium">{sessionState(session)}</td><td className="px-3 py-2">{new Date(session.createdAt).toLocaleString()}</td><td className="px-3 py-2">{new Date(session.lastSeenAt).toLocaleString()}</td><td className="px-3 py-2">{new Date(session.expiresAt).toLocaleString()}</td><td className="px-3 py-2 text-right">{sessionState(session) === 'Active' && <button className="font-medium text-[#B54747] hover:underline disabled:opacity-40" disabled={revoke.isPending} onClick={() => revoke.mutate(session.id)}>Revoke</button>}</td></tr>) : <tr><td colSpan={5} className="px-3 py-6 text-center text-[#8B929B]">No sessions recorded.</td></tr>}</tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#17191C]">Sign-in History</h2>
            <div className="overflow-x-auto border border-[#E8EBEF] rounded-lg">
              <table className="w-full text-left text-xs"><thead><tr className="bg-[#FAFBFC] text-[#60666F]"><th className="px-3 py-2">Time</th><th className="px-3 py-2">Event</th><th className="px-3 py-2">IP</th><th className="px-3 py-2">Device</th></tr></thead>
                <tbody className="divide-y divide-[#E8EBEF]">{history.length ? history.map((event: any) => <tr key={event.id}><td className="whitespace-nowrap px-3 py-2">{new Date(event.createdAt).toLocaleString()}</td><td className="px-3 py-2 font-medium">{String(event.action).replace(/_/g, ' ')}</td><td className="px-3 py-2 font-mono">{event.ipAddress || 'Unavailable'}</td><td className="max-w-96 truncate px-3 py-2" title={event.userAgent || ''}>{event.userAgent || 'Unavailable'}</td></tr>) : <tr><td colSpan={4} className="px-3 py-6 text-center text-[#8B929B]">No sign-in activity recorded.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        </>}
      </div>
    </AppShell>
  );
}
