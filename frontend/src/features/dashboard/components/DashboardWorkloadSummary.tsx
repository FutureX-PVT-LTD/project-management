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
            ? 'bg-[#EFF6FF] border-[#DBEAFE] text-[#1D4ED8] font-medium hover:bg-[#DBEAFE]/50'
            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]',
        )}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            counts.current > 0 ? 'bg-[#2563EB]' : 'bg-[#94A3B8]',
          )}
        />
        <span>Current:</span>
        <span className="font-semibold font-mono text-[#0F172A]">{counts.current}</span>
      </Link>

      {/* Not started */}
      <Link
        href="/my-work?tab=READY"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border transition-colors',
          counts.readyDisplayed > 0
            ? 'bg-[#F0FDF4] border-[#DCFCE7] text-[#15803D] font-medium hover:bg-[#DCFCE7]/60'
            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]',
        )}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            counts.readyDisplayed > 0 ? 'bg-[#16A34A]' : 'bg-[#94A3B8]',
          )}
        />
        <span>Not Started:</span>
        <span className="font-semibold font-mono text-[#0F172A]">{counts.readyDisplayed}</span>
      </Link>

      {/* Waiting / Blocked */}
      {(counts.waiting > 0 || counts.blocked > 0) && (
        <Link
          href="/my-work?tab=WAITING"
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border transition-colors',
            counts.blocked > 0
              ? 'bg-[#FEF2F2] border-[#FEE2E2] text-[#DC2626] font-medium hover:bg-[#FEE2E2]/70'
              : 'bg-[#FFFBEB] border-[#FEF3C7] text-[#D97706] font-medium hover:bg-[#FEF3C7]/70',
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              counts.blocked > 0 ? 'bg-[#DC2626]' : 'bg-[#D97706]',
            )}
          />
          <span>{counts.blocked > 0 ? `${counts.blocked} Blocked · ` : ''}Waiting:</span>
          <span className="font-semibold font-mono text-[#0F172A]">{counts.waiting}</span>
        </Link>
      )}

      {/* In Review */}
      {counts.inReview > 0 && (
        <Link
          href="/my-work?tab=REVIEW"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-[#EDE9FE] bg-[#F5F3FF] text-[#7C3AED] font-medium hover:bg-[#EDE9FE]/70 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shrink-0" />
          <span>In Review:</span>
          <span className="font-semibold font-mono text-[#0F172A]">{counts.inReview}</span>
        </Link>
      )}

      {/* Later */}
      {counts.later > 0 && (
        <Link
          href="/my-work?tab=READY"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <span className="text-[#94A3B8]">•</span>
          <span>{counts.later} later</span>
        </Link>
      )}

      {/* Completed */}
      {counts.completed > 0 && (
        <Link
          href="/my-work?tab=COMPLETED"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-transparent text-[#64748B] hover:text-[#2563EB] ml-auto font-medium transition-colors"
        >
          <span>{counts.completed} completed</span>
        </Link>
      )}
    </div>
  );
}
