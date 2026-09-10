'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api-client';
type LoginEvent = { id: string; action: string; createdAt: string; ipAddress: string | null; userAgent: string | null };

export default function LoginHistoryPage() {
  const { user } = useAuth();
  const { data = [], isLoading, isError } = useQuery<LoginEvent[]>({
    queryKey: ['login-history', user?.id], queryFn: () => api.get('/audit-logs/my-login-history'), enabled: !!user,
  });
  return <AppShell>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fx-border pb-4">
      <h1 className="text-xl font-semibold">My Login History</h1><Link href="/account/security" className="text-sm text-blue-600">Account Security</Link>
    </div>
    {isLoading ? <p className="py-6 text-sm">Loading history...</p> : isError ? <p role="alert" className="py-6 text-sm text-red-700">Unable to load login history.</p> : !data.length ? <p className="py-6 text-sm">No login history.</p> :
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b border-fx-border"><th className="py-3 pr-4">Event</th><th className="pr-4">Time</th><th className="pr-4">IP</th><th>Browser</th></tr></thead>
        <tbody>{data.map((log) => <tr key={log.id} className="border-b border-fx-border"><td className="py-3 pr-4">{log.action}</td><td className="pr-4">{new Date(log.createdAt).toLocaleString()}</td><td className="pr-4">{log.ipAddress || 'Unavailable'}</td><td className="max-w-md break-words text-xs">{log.userAgent || 'Unavailable'}</td></tr>)}</tbody>
      </table></div>}
  </AppShell>;
}
