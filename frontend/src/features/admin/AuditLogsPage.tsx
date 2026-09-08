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
        <div className="border-b border-[#E8EBEF] pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
            Security & Audit Trail
          </h1>
          <p className="text-xs text-[#60666F] mt-1">
            Immutable log of user authentication, state mutations, and workspace access events.
          </p>
        </div>

        {/* Search Toolbar */}
        <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-3 flex items-center justify-between shadow-none">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search audit actions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5" />}
              className="h-8 text-xs bg-[#F8F9FB]"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        {isLoading ? (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-10 text-center text-xs text-[#8C939E]">
            Loading security logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-8 text-center text-xs text-[#8C939E]">
            No audit records found.
          </div>
        ) : (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] overflow-hidden">
            <div className="px-4 py-2 border-b border-[#E8EBEF] bg-[#FAFBFC] text-[11px] text-[#8C939E]">
              Showing {logs.length} of {totalLogs} audit records
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAFBFC] text-[#60666F] font-medium border-b border-[#E8EBEF]">
                    <th className="py-2.5 px-4">Event Action</th>
                    <th className="py-2.5 px-3">Actor / User</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBEF] text-[#17191C]">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-[#F8F9FB] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#17191C]">
                        {log.action}
                      </td>
                      <td className="py-3 px-3 text-[#60666F]">
                        {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#8C939E]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#8C939E] text-[11px]">
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
