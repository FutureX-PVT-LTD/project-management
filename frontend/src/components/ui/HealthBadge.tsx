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
    dot: 'bg-[#248A5B]',
    text: 'text-[#248A5B]',
    bg: 'bg-[#EDF8F2]',
  },
  [ProjectHealth.AT_RISK]: {
    label: 'At Risk',
    dot: 'bg-[#A96F12]',
    text: 'text-[#A96F12]',
    bg: 'bg-[#FFF6E5]',
  },
  [ProjectHealth.OFF_TRACK]: {
    label: 'Off Track',
    dot: 'bg-[#C24141]',
    text: 'text-[#C24141]',
    bg: 'bg-[#FDEEEE]',
  },
  [ProjectHealth.COMPLETED]: {
    label: 'Completed',
    dot: 'bg-[#5F6368]',
    text: 'text-[#15171A]',
    bg: 'bg-[#F4F6F8]',
  },
};

export function HealthBadge({
  health,
  reason,
  className,
  showLabel = true,
  showReason = true,
}: HealthBadgeProps) {
  const config = healthConfig[health] || {
    label: health,
    dot: 'bg-[#92979E]',
    text: 'text-[#5F6368]',
    bg: 'bg-[#F4F6F8]',
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
