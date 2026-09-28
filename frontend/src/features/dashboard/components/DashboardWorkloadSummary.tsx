'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface WorkloadCounts {
  current: number;
  readyTotal: number;
  readyDisplayed: number;
  later: number;
  waiting: number;
  blocked: number;
  inReview: number;
  completed: number;
}

interface DashboardWorkloadSummaryProps {
  counts: WorkloadCounts;
}

export function DashboardWorkloadSummary({ counts }: DashboardWorkloadSummaryProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
      {/* Current / Doing */}
      <Link
        href="/my-work?tab=IN_PROGRESS"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border transition-colors',
          counts.current > 0
            ? 'bg-[#EEF4FF] border-[#BFDBFE] text-[#2563EB] font-medium hover:bg-[#BFDBFE]/30'
            : 'bg-[#F7F8FA] border-[#E3E7EC] text-[#626A73] hover:text-[#181B20]',
        )}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            counts.current > 0 ? 'bg-[#2563EB]' : 'bg-[#929AA3]',
          )}
        />
        <span>Current:</span>
        <span className="font-semibold font-mono text-[#181B20]">{counts.current}</span>
      </Link>

      {/* Not started */}
      <Link
        href="/my-work?tab=READY"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border transition-colors',
          counts.readyDisplayed > 0
            ? 'bg-[#EDF8F2] border-[#C6E7D2] text-[#237A57] font-medium hover:bg-[#C6E7D2]/40'
            : 'bg-[#F7F8FA] border-[#E3E7EC] text-[#626A73] hover:text-[#181B20]',
        )}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            counts.readyDisplayed > 0 ? 'bg-[#237A57]' : 'bg-[#929AA3]',
          )}
        />
        <span>Not Started:</span>
        <span className="font-semibold font-mono text-[#181B20]">{counts.readyDisplayed}</span>
      </Link>

      {/* Waiting / Blocked */}
      {(counts.waiting > 0 || counts.blocked > 0) && (
        <Link
          href="/my-work?tab=WAITING"
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border transition-colors',
            counts.blocked > 0
              ? 'bg-[#FDEEEE] border-[#FECACA] text-[#C24141] font-medium hover:bg-[#FECACA]/40'
              : 'bg-[#FFF6E5] border-[#FDE68A] text-[#A86B12] font-medium hover:bg-[#FDE68A]/40',
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              counts.blocked > 0 ? 'bg-[#C24141]' : 'bg-[#A86B12]',
            )}
          />
          <span>{counts.blocked > 0 ? `${counts.blocked} Blocked · ` : ''}Waiting:</span>
          <span className="font-semibold font-mono text-[#181B20]">{counts.waiting}</span>
        </Link>
      )}

      {/* In Review */}
      {counts.inReview > 0 && (
        <Link
          href="/my-work?tab=REVIEW"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-[#DDD6FE] bg-[#F4F0FC] text-[#7557B5] font-medium hover:bg-[#DDD6FE]/40 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#7557B5] shrink-0" />
          <span>Awaiting Review:</span>
          <span className="font-semibold font-mono text-[#181B20]">{counts.inReview}</span>
        </Link>
      )}

      {/* Later */}
      {counts.later > 0 && (
        <Link
          href="/my-work?tab=READY"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-[#E3E7EC] bg-[#F7F8FA] text-[#626A73] hover:text-[#181B20] transition-colors"
        >
          <span className="text-[#929AA3]">•</span>
          <span>{counts.later} later</span>
        </Link>
      )}

      {/* Completed */}
      {counts.completed > 0 && (
        <Link
          href="/my-work?tab=COMPLETED"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-transparent text-[#626A73] hover:text-[#2563EB] ml-auto font-medium transition-colors"
        >
          <span>{counts.completed} completed</span>
        </Link>
      )}
    </div>
  );
}
