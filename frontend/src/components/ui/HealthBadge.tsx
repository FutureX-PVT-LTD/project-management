import React from 'react';
import { ProjectHealth } from '@futurex/shared';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  health: ProjectHealth | string;
  reason?: string | null;
  className?: string;
  showLabel?: boolean;
  showReason?: boolean;
}

const healthConfig: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  [ProjectHealth.ON_TRACK]: {
    label: 'On Track',
    dot: 'bg-[#16A34A]',
    text: 'text-[#15803D]',
    bg: 'bg-[#F0FDF4] border border-[#DCFCE7]',
  },
  [ProjectHealth.AT_RISK]: {
    label: 'At Risk',
    dot: 'bg-[#F59E0B]',
    text: 'text-[#B45309]',
    bg: 'bg-[#FFFBEB] border border-[#FEF3C7]',
  },
  [ProjectHealth.OFF_TRACK]: {
    label: 'Blocked',
    dot: 'bg-[#EF4444]',
    text: 'text-[#DC2626]',
    bg: 'bg-[#FEF2F2] border border-[#FEE2E2]',
  },
  [ProjectHealth.COMPLETED]: {
    label: 'Completed',
    dot: 'bg-[#16A34A]',
    text: 'text-[#15803D]',
    bg: 'bg-[#F0FDF4] border border-[#DCFCE7]',
  },
};

export function HealthBadge({
  health,
  reason,
  className,
  showLabel = true,
}: HealthBadgeProps) {
  const config = healthConfig[health] || {
    label: health || 'Unknown',
    dot: 'bg-[#94A3B8]',
    text: 'text-[#64748B]',
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
  };

  return (
    <div className={cn('inline-flex flex-col gap-0.5', className)} title={reason || undefined}>
      <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] font-medium tracking-tight', config.bg)}>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
        {showLabel && (
          <span className={cn('font-medium select-none', config.text)}>
            {config.label}
          </span>
        )}
      </div>
    </div>
  );
}
