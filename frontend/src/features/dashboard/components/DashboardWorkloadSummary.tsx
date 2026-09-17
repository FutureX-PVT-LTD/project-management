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
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border transition-colors',
          counts.current > 0
            ? 'bg-[#EEF4FF] border-[#2463EB]/20 text-[#2463EB] font-medium hover:bg-[#E0ECFF]'
            : 'bg-[#F8FAFC] border-[#E8ECF1] text-[#60666F] hover:text-[#17191C]',
        )}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            counts.current > 0 ? 'bg-[#2463EB]' : 'bg-[#8B929B]',
          )}
        />
        <span>Current:</span>
        <span className="font-semibold font-mono text-[#17191C]">{counts.current}</span>
      </Link>

      {/* Ready Next */}
      <Link
        href="/my-work?tab=READY"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border transition-colors',
          counts.readyDisplayed > 0
            ? 'bg-[#EFF8F3] border-[#237A57]/20 text-[#237A57] font-medium hover:bg-[#E1F2E8]'
            : 'bg-[#F8FAFC] border-[#E8ECF1] text-[#60666F] hover:text-[#17191C]',
        )}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            counts.readyDisplayed > 0 ? 'bg-[#237A57]' : 'bg-[#8B929B]',
          )}
        />
        <span>Ready Next:</span>
        <span className="font-semibold font-mono text-[#17191C]">{counts.readyDisplayed}</span>
      </Link>

      {/* Waiting / Blocked */}
      {(counts.waiting > 0 || counts.blocked > 0) && (
        <Link
          href="/my-work?tab=WAITING"
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border transition-colors',
            counts.blocked > 0
              ? 'bg-[#FFF2F2] border-[#B54747]/20 text-[#B54747] font-medium hover:bg-[#FFE5E5]'
              : 'bg-[#FFF7E8] border-[#9A6515]/20 text-[#9A6515] font-medium hover:bg-[#FDEFD1]',
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              counts.blocked > 0 ? 'bg-[#B54747]' : 'bg-[#9A6515]',
            )}
          />
          <span>{counts.blocked > 0 ? `${counts.blocked} Blocked · ` : ''}Waiting:</span>
          <span className="font-semibold font-mono text-[#17191C]">{counts.waiting}</span>
        </Link>
      )}

      {/* In Review */}
      {counts.inReview > 0 && (
        <Link
          href="/my-work?tab=REVIEW"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#6D52A3]/20 bg-[#F5F1FB] text-[#6D52A3] font-medium hover:bg-[#ECE5F7] transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#6D52A3] shrink-0" />
          <span>In Review:</span>
          <span className="font-semibold font-mono text-[#17191C]">{counts.inReview}</span>
        </Link>
      )}

      {/* Later */}
      {counts.later > 0 && (
        <Link
          href="/my-work?tab=READY"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#E8ECF1] bg-[#F8FAFC] text-[#60666F] hover:text-[#17191C] transition-colors"
        >
          <span className="text-[#8B929B]">•</span>
          <span>{counts.later} later</span>
        </Link>
      )}

      {/* Completed */}
      {counts.completed > 0 && (
        <Link
          href="/my-work?tab=COMPLETED"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-transparent text-[#60666F] hover:text-[#2463EB] ml-auto font-medium transition-colors"
        >
          <span>{counts.completed} completed</span>
        </Link>
      )}
    </div>
  );
}
