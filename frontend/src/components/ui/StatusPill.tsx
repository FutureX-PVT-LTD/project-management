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
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
    text: 'text-[#64748B]',
  },
  [TaskStatus.TODO]: {
    label: 'To Do',
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
    text: 'text-[#64748B]',
  },
  [TaskStatus.PLANNED]: {
    label: 'Planned',
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
    text: 'text-[#64748B]',
  },
  [TaskStatus.WAITING]: {
    label: 'Waiting',
    bg: 'bg-[#FFFBEB] border border-[#FEF3C7]',
    text: 'text-[#B45309]',
    icon: <Lock className="w-2.5 h-2.5 text-[#B45309] shrink-0" />,
  },
  [TaskStatus.READY]: {
    label: 'Not Started',
    bg: 'bg-[#F1F5F9] border border-[#E2E8F0]',
    text: 'text-[#475569]',
    dot: 'bg-[#94A3B8]',
  },
  [TaskStatus.IN_PROGRESS]: {
    label: 'In Progress',
    bg: 'bg-[#EFF6FF] border border-[#DBEAFE]',
    text: 'text-[#1D4ED8]',
    dot: 'bg-[#2563EB]',
  },
  [TaskStatus.IN_REVIEW]: {
    label: 'In Review',
    bg: 'bg-[#F5F3FF] border border-[#EDE9FE]',
    text: 'text-[#6D28D9]',
    dot: 'bg-[#7C3AED]',
  },
  [TaskStatus.BLOCKED]: {
    label: 'Blocked',
    bg: 'bg-[#FEF2F2] border border-[#FEE2E2]',
    text: 'text-[#DC2626]',
    dot: 'bg-[#EF4444]',
  },
  [TaskStatus.BACKLOG]: {
    label: 'Backlog',
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
    text: 'text-[#64748B]',
  },
  [TaskStatus.DONE]: {
    label: 'Completed',
    bg: 'bg-[#F0FDF4] border border-[#DCFCE7]',
    text: 'text-[#15803D]',
    dot: 'bg-[#16A34A]',
  },
  [TaskStatus.N_A]: {
    label: 'N/A',
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
    text: 'text-[#64748B]',
  },
  [TaskStatus.CANCELED]: {
    label: 'Cancelled',
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
    text: 'text-[#64748B]',
  },
};

export function StatusPill({ status, size = 'sm', className, showDot = true }: StatusPillProps) {
  const safeStatus = status || 'UNKNOWN';
  const config = statusConfig[safeStatus] || {
    label: safeStatus.replace(/_/g, ' '),
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
    text: 'text-[#64748B]',
  };

  const sizeStyles = {
    xs: 'h-[19px] px-1.5 text-[10.5px] gap-1 rounded-[5px]',
    sm: 'h-[21px] px-2 text-[11px] gap-1.5 rounded-[5px]',
    md: 'h-[24px] px-2.5 text-[11.5px] gap-1.5 rounded-[6px]',
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
