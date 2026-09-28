'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';
import { useDebounce } from '@/hooks/useDebounce';

function auditContext(log: any) {
  try {
    const details = log.detailsJson ? JSON.parse(log.detailsJson) : {};
    const label = details.projectName || details.projectKey || details.title || details.email;
    return label ? `${log.entityType || 'System'} · ${label}` : `${log.entityType || 'System'}${log.entityId ? ` · ${String(log.entityId).slice(0, 8)}` : ''}`;
  } catch {
    return `${log.entityType || 'System'}${log.entityId ? ` · ${String(log.entityId).slice(0, 8)}` : ''}`;
  }
}

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const owner = user?.globalRole === UserRole.OWNER;
  const [filters, setFilters] = useState({ action: '', actorId: '', entityType: '', outcome: '', startDate: '', endDate: '' });
  const [offset, setOffset] = useState(0);
  const debouncedSearch = useDebounce(search, 250);
  const params = new URLSearchParams({ limit: '50', offset: String(offset) });
  if (debouncedSearch) params.set('search', debouncedSearch);
  Object.entries(filters).forEach(([key, value]) => {
    if (value && key !== 'startDate' && key !== 'endDate') params.set(key, value);
  });
  if (filters.startDate && filters.endDate) {
    params.set('startDate', `${filters.startDate}T00:00:00.000Z`);
    params.set('endDate', `${filters.endDate}T23:59:59.999Z`);
  }
  const { data: users = [] } = useQuery<{ id: string; firstName: string; lastName: string }[]>({ queryKey: ['audit-users', user?.id], queryFn: () => api.get('/users'), enabled: owner });

  const { data: auditData, isLoading, error } = useQuery({
    queryKey: ['admin', 'audit-logs', user?.id, params.toString()],
    queryFn: () => api.get(`/audit-logs?${params}`),
    enabled: owner,
  });

  const audit = asRecord(auditData);
  const logs = asArray(auditData, 'logs');
  const totalLogs = typeof audit.total === 'number' ? audit.total : logs.length;

  if (!owner) return <AppShell><p className="py-6 text-sm">Owner access required.</p></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6 w-full max-w-7xl">
        {/* Header */}
        <div className="border-b border-[#E3E7EC] pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#181B20]">
            System Audit Log
          </h1>
          <p className="mt-1 text-xs text-[#626A73]">
            Authentication, account security, and administrative actions across FutureX.
          </p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-end gap-3 border-b border-[#E3E7EC] pb-4">
          <div className="w-full sm:w-64">
            <label className="grid gap-1 text-xs font-medium text-[#181B20]">
              Search
              <Input
                placeholder="Search audit actions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                leftIcon={<Search className="w-3.5 h-3.5 text-[#929AA3]" />}
                className="h-8.5 text-xs bg-white"
              />
            </label>
          </div>
          <label className="grid gap-1 text-xs font-medium text-[#181B20]">
            User
            <select
              value={filters.actorId}
              onChange={(e) => {
                setFilters({ ...filters, actorId: e.target.value });
                setOffset(0);
              }}
              className="h-8.5 max-w-52 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">All users</option>
              {users.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.firstName} {person.lastName}
                </option>
              ))}
            </select>
          </label>
          {(['action', 'entityType'] as const).map((field) => (
            <label key={field} className="grid gap-1 text-xs font-medium text-[#181B20]">
              {field === 'action' ? 'Action' : 'Category'}
              <input
                value={filters[field]}
                maxLength={100}
                placeholder={field === 'action' ? 'e.g. LOGIN' : 'e.g. Project'}
                onChange={(e) => {
                  setFilters({ ...filters, [field]: e.target.value });
                  setOffset(0);
                }}
                className="h-8.5 w-36 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
              />
            </label>
          ))}
          <label className="grid gap-1 text-xs font-medium text-[#181B20]">
            Result
            <select
              value={filters.outcome}
              onChange={(e) => {
                setFilters({ ...filters, outcome: e.target.value });
                setOffset(0);
              }}
              className="h-8.5 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">All results</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          {(['startDate', 'endDate'] as const).map((field) => (
            <label key={field} className="grid gap-1 text-xs font-medium text-[#181B20]">
              {field === 'startDate' ? 'From (UTC)' : 'To (UTC)'}
              <input
                type="date"
                value={filters[field]}
                onChange={(e) => {
                  setFilters({ ...filters, [field]: e.target.value });
                  setOffset(0);
                }}
                className="h-8.5 rounded-[8px] border border-[#E3E7EC] bg-white px-2 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
              />
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-xs text-[#C24141]">
            {error.message}
          </p>
        )}

        {/* Audit Log Table */}
        {isLoading ? (
          <div className="bg-white border border-[#E3E7EC] rounded-[8px] p-10 text-center text-xs text-[#929AA3]">
            Loading security logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white border border-[#E3E7EC] rounded-[8px] p-8 text-center text-xs text-[#929AA3]">
            No audit records found.
          </div>
        ) : (
          <div className="bg-white border border-[#E3E7EC] rounded-[8px] overflow-hidden shadow-none">
            <div className="px-4 py-2 border-b border-[#E3E7EC] bg-[#F7F8FA] text-[11px] text-[#929AA3]">
              Showing {logs.length} of {totalLogs} audit records
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7F8FA] text-[#626A73] font-medium border-b border-[#E3E7EC]">
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Target / Context</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-4">Device / IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E7EC] text-[#181B20]">
                  {logs.map((log: any) => {
                    const isFailed = String(log.action).endsWith('_FAILED');
                    return (
                      <tr key={log.id} className="hover:bg-[#F7F8FA] transition-colors">
                        <td className="whitespace-nowrap py-3 px-4 font-mono text-[11px] text-[#929AA3]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-[#626A73]">
                          {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}
                        </td>
                        <td className="py-3 px-3 font-medium text-[#181B20]">
                          {String(log.action).replace(/_/g, ' ')}
                        </td>
                        <td
                          className="max-w-56 truncate py-3 px-3 text-[#626A73]"
                          title={auditContext(log)}
                        >
                          {auditContext(log)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={
                              isFailed
                                ? 'text-[11px] font-medium text-[#C24141]'
                                : 'text-[11px] font-medium text-[#237A57]'
                            }
                          >
                            {isFailed ? 'Failed' : 'Success'}
                          </span>
                        </td>
                        <td className="max-w-52 py-3 px-4 text-[11px] text-[#929AA3]">
                          <span
                            className="block truncate"
                            title={log.userAgent || ''}
                          >
                            {log.userAgent || 'Device unavailable'}
                          </span>
                          <span className="font-mono text-[10px]">
                            {log.ipAddress || 'IP unavailable'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-[#626A73]">
          <button
            type="button"
            title="Previous page"
            aria-label="Previous page"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - 50))}
            className="p-1 rounded-[6px] border border-[#E3E7EC] hover:bg-[#F7F8FA] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span>Page {Math.floor(offset / 50) + 1}</span>
          <button
            type="button"
            title="Next page"
            aria-label="Next page"
            disabled={offset + 50 >= totalLogs}
            onClick={() => setOffset(offset + 50)}
            className="p-1 rounded-[6px] border border-[#E3E7EC] hover:bg-[#F7F8FA] disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
