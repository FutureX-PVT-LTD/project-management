import React from 'react';
import { TaskStatus } from '@futurex/shared';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface StatusPillProps {
  status?: TaskStatus | string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon?: React.ReactNode }
> = {
  [TaskStatus.TODO]: {
    label: 'To Do',
    bg: 'bg-fx-bg-subtle',
    text: 'text-fx-text-secondary',
    border: 'border-fx-border',
  },
  [TaskStatus.PLANNED]: {
    label: 'Planned',
    bg: 'bg-fx-bg-subtle',
    text: 'text-fx-text-muted',
    border: 'border-fx-border',
  },
  [TaskStatus.WAITING]: {
    label: 'Waiting',
    bg: 'bg-amber-50/80',
    text: 'text-amber-800',
    border: 'border-amber-200/70',
    icon: <Lock className="w-2.5 h-2.5 text-amber-700/80 shrink-0" />,
  },
  [TaskStatus.READY]: {
    label: 'Ready to Start',
    bg: 'bg-fx-green-soft',
    text: 'text-fx-green-dark',
    border: 'border-fx-green/20',
  },
  [TaskStatus.IN_PROGRESS]: {
    label: 'In Progress',
    bg: 'bg-blue-50/80',
    text: 'text-blue-700',
    border: 'border-blue-200/70',
  },
  [TaskStatus.IN_REVIEW]: {
    label: 'In Review',
    bg: 'bg-purple-50/80',
    text: 'text-purple-700',
    border: 'border-purple-200/70',
  },
  [TaskStatus.BLOCKED]: {
    label: 'Blocked',
    bg: 'bg-red-50/80',
    text: 'text-red-700',
    border: 'border-red-200/70',
  },
  [TaskStatus.BACKLOG]: {
    label: 'Backlog',
    bg: 'bg-fx-bg-subtle',
    text: 'text-fx-text-muted',
    border: 'border-fx-border',
  },
  [TaskStatus.DONE]: {
    label: 'Completed',
    bg: 'bg-fx-green-soft/70',
    text: 'text-fx-green-dark',
    border: 'border-fx-green/20',
  },
  [TaskStatus.CANCELED]: {
    label: 'Cancelled',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-200',
  },
};


export function StatusPill({ status, size = 'sm', className }: StatusPillProps) {
  const safeStatus = status || 'UNKNOWN';
  const config = statusConfig[safeStatus] || {
    label: safeStatus.replace(/_/g, ' '),
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
  };

  const sizeStyles = {
    xs: 'h-5 px-1.5 text-[11px] gap-1 rounded',
    sm: 'h-6 px-2 text-xs gap-1 rounded',
    md: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border select-none tracking-tight whitespace-nowrap',
        config.bg,
        config.text,
        config.border,
        sizeStyles[size],
        className,
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
