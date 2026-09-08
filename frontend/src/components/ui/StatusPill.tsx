import React from 'react';
import { TaskStatus } from '@futurex/shared';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface StatusPillProps {
  status?: TaskStatus | string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showDot?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot?: string; icon?: React.ReactNode }
> = {
  [TaskStatus.UNASSIGNED]: {
    label: 'Unassigned',
    bg: 'bg-[#F1F3F5]',
    text: 'text-[#626A73]',
  },
  [TaskStatus.TODO]: {
    label: 'To Do',
    bg: 'bg-[#F1F3F5]',
    text: 'text-[#626A73]',
  },
  [TaskStatus.PLANNED]: {
    label: 'Planned',
    bg: 'bg-[#F1F3F5]',
    text: 'text-[#8B929B]',
  },
  [TaskStatus.WAITING]: {
    label: 'Waiting',
    bg: 'bg-[#FFF7E8]',
    text: 'text-[#9A6515]',
    icon: <Lock className="w-2.5 h-2.5 text-[#9A6515] shrink-0" />,
  },
  [TaskStatus.READY]: {
    label: 'Ready',
    bg: 'bg-[#EFF8F3]',
    text: 'text-[#237A57]',
    dot: 'bg-[#237A57]',
  },
  [TaskStatus.IN_PROGRESS]: {
    label: 'In Progress',
    bg: 'bg-[#EEF4FF]',
    text: 'text-[#245EC7]',
    dot: 'bg-[#245EC7]',
  },
  [TaskStatus.IN_REVIEW]: {
    label: 'In Review',
    bg: 'bg-[#F5F1FB]',
    text: 'text-[#6D52A3]',
    dot: 'bg-[#6D52A3]',
  },
  [TaskStatus.BLOCKED]: {
    label: 'Blocked',
    bg: 'bg-[#FCEEEE]',
    text: 'text-[#B54747]',
    dot: 'bg-[#B54747]',
  },
  [TaskStatus.BACKLOG]: {
    label: 'Backlog',
    bg: 'bg-[#F1F3F5]',
    text: 'text-[#8B929B]',
  },
  [TaskStatus.DONE]: {
    label: 'Completed',
    bg: 'bg-[#EDF7F2]',
    text: 'text-[#26715A]',
    dot: 'bg-[#26715A]',
  },
  [TaskStatus.N_A]: {
    label: 'N/A',
    bg: 'bg-[#F1F3F5]',
    text: 'text-[#8B929B]',
  },
  [TaskStatus.CANCELED]: {
    label: 'Cancelled',
    bg: 'bg-[#F1F3F5]',
    text: 'text-[#8B929B]',
  },
};

export function StatusPill({ status, size = 'sm', className, showDot = true }: StatusPillProps) {
  const safeStatus = status || 'UNKNOWN';
  const config = statusConfig[safeStatus] || {
    label: safeStatus.replace(/_/g, ' '),
    bg: 'bg-[#F1F3F5]',
    text: 'text-[#626A73]',
  };

  const sizeStyles = {
    xs: 'h-5 px-1.5 text-[11px] gap-1 rounded-[5px]',
    sm: 'h-[22px] px-2 text-[12px] gap-1.5 rounded-[6px]',
    md: 'h-6 px-2.5 text-xs gap-1.5 rounded-[6px]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium select-none tracking-tight whitespace-nowrap',
        config.bg,
        config.text,
        sizeStyles[size],
        className,
      )}
    >
      {config.icon ? (
        config.icon
      ) : showDot && config.dot ? (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      ) : null}
      <span>{config.label}</span>
    </span>
  );
}
