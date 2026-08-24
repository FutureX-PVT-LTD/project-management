'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, FileText, Search, Filter, Inbox } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { formatDate, formatTimeAgo } from '@/lib/utils';

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter],
    queryFn: () => api.get(`/audit?action=${actionFilter}`),
  });

  const allLogs = ((logs as any[]) || []).filter((l: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(s) ||
      l.entityType?.toLowerCase().includes(s) ||
      l.user?.firstName?.toLowerCase().includes(s) ||
      l.user?.lastName?.toLowerCase().includes(s)
    );
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fx-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
                Security & Action Audit Logs
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-fx-green-50 text-fx-green-900 font-semibold border border-fx-green-100">
                {allLogs.length} entries
              </span>
            </div>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Immutable ledger of sensitive workspace actions, role changes, and system logins.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-fx-border shadow-card text-xs">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search audit records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5" />}
              className="h-8 text-xs bg-fx-bg-subtle"
            />
          </div>
        </div>

        {/* Audit Table */}
        <Card padding="none" className="bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-fx-bg-subtle/80 text-fx-text-muted border-b border-fx-border select-none text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Details / Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fx-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-fx-text-muted">
                      Loading audit records...
                    </td>
                  </tr>
                ) : allLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<FileText className="w-5 h-5 text-fx-green-700" />}
                        title="No audit records found"
                        description="No audit logs matched your search filters."
                      />
                    </td>
                  </tr>
                ) : (
                  allLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-fx-bg-subtle fx-transition">
                      <td className="py-3.5 px-4 text-fx-text-muted font-mono whitespace-nowrap text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-fx-text-secondary whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={log.user?.avatarUrl}
                            firstName={log.user?.firstName}
                            size="xs"
                          />
                          <span className="font-medium text-fx-text-primary">
                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-semibold bg-fx-bg-subtle px-2 py-0.5 rounded border border-fx-border text-fx-text-primary">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-fx-text-secondary font-medium whitespace-nowrap">
                        {log.entityType || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-fx-text-muted font-mono text-[11px] whitespace-nowrap">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3.5 px-4 text-fx-text-secondary max-w-xs truncate font-mono text-[11px]">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
