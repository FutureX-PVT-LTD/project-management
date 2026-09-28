'use client';

import React from 'react';
import { formatTimeAgo } from '@/lib/utils';
import { Activity } from 'lucide-react';

interface RecentUpdate {
  id: string;
  text: string;
  projectName?: string;
  taskHumanId?: string;
  createdAt: string;
}

interface RecentPersonalActivityProps {
  updates: RecentUpdate[];
}

export function RecentPersonalActivity({ updates }: RecentPersonalActivityProps) {
  if (updates.length === 0) return null;

  return (
    <section className="space-y-2.5" aria-labelledby="recent-updates-heading">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
        <h3 id="recent-updates-heading" className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-[#64748B]" />
          Recent Updates
        </h3>
      </div>

      <div className="divide-y divide-[#F1F5F9]">
        {updates.map((update) => (
          <div key={update.id} className="py-2.5 text-xs space-y-0.5">
            <p className="text-[#0F172A] leading-snug">{update.text}</p>
            <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
              {update.projectName && <span>{update.projectName}</span>}
              {update.projectName && <span>·</span>}
              <span className="font-mono">{formatTimeAgo(update.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
