import React from 'react';
import { ProjectHealth } from '@futurex/shared';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  health: ProjectHealth | string;
  reason?: string | null;
  className?: string;
}

export function HealthBadge({ health, reason, className }: HealthBadgeProps) {
  const config: Record<
    string,
    { label: string; dot: string; text: string; bg: string }
  > = {
    [ProjectHealth.ON_TRACK]: {
      label: 'On Track',
      dot: 'bg-[#14804A]',
      text: 'text-[#064E35]',
      bg: 'bg-[#E8F5EE]',
    },
    [ProjectHealth.AT_RISK]: {
      label: 'At Risk',
      dot: 'bg-[#B76E00]',
      text: 'text-[#8A5200]',
      bg: 'bg-[#FEF6E6]',
    },
    [ProjectHealth.OFF_TRACK]: {
      label: 'Off Track',
      dot: 'bg-[#C33A3A]',
      text: 'text-[#9E2828]',
      bg: 'bg-[#FDF2F2]',
    },
    [ProjectHealth.COMPLETED]: {
      label: 'Completed',
      dot: 'bg-[#087A4B]',
      text: 'text-[#076241]',
      bg: 'bg-[#E8F5EE]',
    },
  };

  const current = config[health] || config[ProjectHealth.ON_TRACK];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold select-none whitespace-nowrap',
        current.bg,
        current.text,
        className,
      )}
      title={reason ? `Health: ${current.label} (${reason})` : `Health: ${current.label}`}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', current.dot)} />
      <span>{current.label}</span>
    </span>
  );
}
