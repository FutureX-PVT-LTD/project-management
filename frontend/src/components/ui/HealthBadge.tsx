import React from 'react';
import { ProjectHealth } from '@futurex/shared';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  health: ProjectHealth | string;
  reason?: string | null;
  className?: string;
  showLabel?: boolean;
}

const healthConfig: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  [ProjectHealth.ON_TRACK]: {
    label: 'On Track',
    dot: 'bg-emerald-600',
    text: 'text-emerald-800',
    bg: 'bg-emerald-50/70',
  },
  [ProjectHealth.AT_RISK]: {
    label: 'At Risk',
    dot: 'bg-amber-600',
    text: 'text-amber-800',
    bg: 'bg-amber-50/70',
  },
  [ProjectHealth.OFF_TRACK]: {
    label: 'Off Track',
    dot: 'bg-rose-600',
    text: 'text-rose-800',
    bg: 'bg-rose-50/70',
  },
  [ProjectHealth.COMPLETED]: {
    label: 'Completed',
    dot: 'bg-fx-green',
    text: 'text-fx-green-dark',
    bg: 'bg-fx-green-soft/70',
  },
};

export function HealthBadge({
  health,
  reason,
  className,
  showLabel = true,
}: HealthBadgeProps) {
  const config = healthConfig[health] || {
    label: health,
    dot: 'bg-gray-400',
    text: 'text-gray-700',
    bg: 'bg-gray-50',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)} title={reason || undefined}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', config.dot)} />
      {showLabel && (
        <span className={cn('text-xs font-medium tracking-tight', config.text)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
