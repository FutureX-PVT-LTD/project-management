import React from 'react';
import { TaskStatus } from '@futurex/shared';
import { cn } from '@/lib/utils';

interface StatusPillProps {
  status: TaskStatus | string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function StatusPill({ status, size = 'sm', className }: StatusPillProps) {
  const config: Record<
    string,
    { label: string; bg: string; text: string; dot: string }
  > = {
    [TaskStatus.BACKLOG]: {
      label: 'BACKLOG',
      bg: 'bg-[#F0F3F1]',
      text: 'text-[#5F6B64]',
      dot: 'bg-[#8A948E]',
    },
    [TaskStatus.TODO]: {
      label: 'TO DO',
      bg: 'bg-[#F0F3F1]',
      text: 'text-[#4A554F]',
      dot: 'bg-[#7A8780]',
    },
    [TaskStatus.WAITING]: {
      label: 'WAITING',
      bg: 'bg-[#F4F5F4]',
      text: 'text-[#5A6660] font-medium',
      dot: 'bg-[#8A9690]',
    },
    [TaskStatus.READY]: {
      label: 'READY',
      bg: 'bg-[#E8F5EE]',
      text: 'text-[#064E35] font-semibold',
      dot: 'bg-[#087A4B] animate-pulse',
    },
    [TaskStatus.IN_PROGRESS]: {
      label: 'IN PROGRESS',
      bg: 'bg-[#EFF6FC]',
      text: 'text-[#205896] font-medium',
      dot: 'bg-[#3578C9]',
    },
    [TaskStatus.IN_REVIEW]: {
      label: 'IN REVIEW',
      bg: 'bg-[#FEF6E6]',
      text: 'text-[#8A5200] font-medium',
      dot: 'bg-[#B76E00]',
    },
    [TaskStatus.BLOCKED]: {
      label: 'BLOCKED',
      bg: 'bg-[#FDF2F2]',
      text: 'text-[#9E2828] font-medium',
      dot: 'bg-[#C33A3A]',
    },
    [TaskStatus.DONE]: {
      label: 'DONE',
      bg: 'bg-[#E8F5EE]',
      text: 'text-[#076241] font-medium',
      dot: 'bg-[#087A4B]',
    },
    [TaskStatus.CANCELED]: {
      label: 'CANCELED',
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      dot: 'bg-gray-400',
    },
  };

  const current = config[status] || {
    label: String(status).toUpperCase(),
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  };

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1 font-semibold tracking-wider',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-semibold tracking-wide',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[6px] select-none whitespace-nowrap',
        current.bg,
        current.text,
        sizeClasses[size],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', current.dot)} />
      {current.label}
    </span>
  );
}
