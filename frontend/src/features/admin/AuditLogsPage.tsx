'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, Filter } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';

export function AuditLogsPage() {
  const [search, setSearch] = useState('');

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', search],
    queryFn: () => api.get(`/audit-logs${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });

  const audit = asRecord(auditData);
  const logs = asArray(auditData, 'logs');
  const totalLogs = typeof audit.total === 'number' ? audit.total : logs.length;

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
            Security & Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            Immutable log of user authentication, state mutations, and workspace access events.
          </p>
        </div>

        {/* Search Toolbar */}
        <div className="bg-white border border-fx-border rounded-[8px] p-3 flex items-center justify-between shadow-none">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search audit actions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5" />}
              className="h-8 text-xs bg-fx-bg"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        {isLoading ? (
          <div className="bg-white border border-fx-border rounded-[8px] p-10 text-center text-xs text-fx-text-muted shadow-none">
            Loading security logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white border border-fx-border rounded-[8px] p-8 text-center text-xs text-fx-text-muted shadow-none">
            No audit records found.
          </div>
        ) : (
          <div className="bg-white border border-fx-border rounded-[8px] overflow-hidden shadow-none">
            <div className="px-4 py-2 border-b border-fx-border bg-fx-bg text-[11px] text-fx-text-muted">
              Showing {logs.length} of {totalLogs} audit records
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-fx-bg text-fx-text-secondary font-medium border-b border-fx-border">
                    <th className="py-2.5 px-4">Event Action</th>
                    <th className="py-2.5 px-3">Actor / User</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-border/60 text-fx-text-primary">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-fx-bg-hover fx-transition">
                      <td className="py-3 px-4 font-semibold text-fx-text-primary">
                        {log.action}
                      </td>
                      <td className="py-3 px-3 text-fx-text-secondary">
                        {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-fx-text-muted">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-fx-text-secondary">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
