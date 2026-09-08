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
    dot: 'bg-[#237A57]',
    text: 'text-[#237A57]',
    bg: 'bg-[#EFF8F3]',
  },
  [ProjectHealth.AT_RISK]: {
    label: 'At Risk',
    dot: 'bg-[#9A6515]',
    text: 'text-[#9A6515]',
    bg: 'bg-[#FFF7E8]',
  },
  [ProjectHealth.OFF_TRACK]: {
    label: 'Blocked',
    dot: 'bg-[#B54747]',
    text: 'text-[#B54747]',
    bg: 'bg-[#FCEEEE]',
  },
  [ProjectHealth.COMPLETED]: {
    label: 'Completed',
    dot: 'bg-[#26715A]',
    text: 'text-[#26715A]',
    bg: 'bg-[#EDF7F2]',
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
    dot: 'bg-[#8B929B]',
    text: 'text-[#60666F]',
    bg: 'bg-[#F1F3F5]',
  };

  return (
    <div className={cn('inline-flex flex-col gap-0.5', className)} title={reason || undefined}>
      <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-xs font-medium', config.bg)}>
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
