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
    icon: <AlertTriangle className="w-3 h-3 text-[#DC2626]" />,
    text: 'text-[#DC2626]',
    bg: 'bg-[#FEF2F2] border border-[#FEE2E2]',
  },
  [TaskPriority.HIGH]: {
    label: 'High',
    icon: <ArrowUp className="w-3 h-3 text-[#C2410C]" />,
    text: 'text-[#C2410C]',
    bg: 'bg-[#FFF7ED] border border-[#FFEDD5]',
  },
  [TaskPriority.MEDIUM]: {
    label: 'Medium',
    icon: <Minus className="w-3 h-3 text-[#1D4ED8]" />,
    text: 'text-[#1D4ED8]',
    bg: 'bg-[#EFF6FF] border border-[#DBEAFE]',
  },
  [TaskPriority.LOW]: {
    label: 'Low',
    icon: <ArrowDown className="w-3 h-3 text-[#64748B]" />,
    text: 'text-[#64748B]',
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
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
    label: priority || 'Normal',
    icon: <Minus className="w-3 h-3 text-[#64748B]" />,
    text: 'text-[#64748B]',
    bg: 'bg-[#F8FAFC] border border-[#E2E8F0]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[5px] text-[10.5px] font-medium select-none tracking-tight',
        config.bg,
        config.text,
        isCompact ? 'p-0.5' : 'px-1.5 py-0.5',
        className,
      )}
      title={`Priority: ${config.label}`}
    >
      {config.icon}
      {!isCompact && <span>{config.label}</span>}
    </span>
  );
}
