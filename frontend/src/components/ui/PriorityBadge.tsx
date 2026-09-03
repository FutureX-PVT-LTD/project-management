import React from 'react';
import { TaskPriority } from '@futurex/shared';
import { cn } from '@/lib/utils';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';

interface PriorityBadgeProps {
  priority: TaskPriority | string;
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
}

const priorityConfig: Record<
  string,
  { label: string; icon: React.ReactNode; text: string; bg: string }
> = {
  [TaskPriority.URGENT]: {
    label: 'Urgent',
    icon: <AlertTriangle className="w-3 h-3 text-red-600" />,
    text: 'text-red-700 font-semibold',
    bg: 'bg-red-50/80 border-red-200/70',
  },
  [TaskPriority.HIGH]: {
    label: 'High',
    icon: <ArrowUp className="w-3 h-3 text-amber-600" />,
    text: 'text-amber-800 font-medium',
    bg: 'bg-amber-50/80 border-amber-200/70',
  },
  [TaskPriority.MEDIUM]: {
    label: 'Medium',
    icon: <Minus className="w-3 h-3 text-blue-500" />,
    text: 'text-blue-700 font-medium',
    bg: 'bg-blue-50/70 border-blue-200/70',
  },
  [TaskPriority.LOW]: {
    label: 'Low',
    icon: <ArrowDown className="w-3 h-3 text-gray-500" />,
    text: 'text-gray-600 font-medium',
    bg: 'bg-gray-50 border-gray-200/70',
  },
};

export function PriorityBadge({
  priority,
  className,
  compact = false,
  showLabel = true,
}: PriorityBadgeProps) {
  const isCompact = compact || !showLabel;
  const config = priorityConfig[priority] || {
    label: priority,
    icon: <Minus className="w-3 h-3 text-gray-400" />,
    text: 'text-gray-600',
    bg: 'bg-gray-50 border-gray-200',
  };

  if (isCompact) {
    return (
      <span className={cn('inline-flex items-center', className)} title={`${config.label} Priority`}>
        {config.icon}
      </span>
    );
  }


  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded border select-none',
        config.bg,
        config.text,
        className,
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
