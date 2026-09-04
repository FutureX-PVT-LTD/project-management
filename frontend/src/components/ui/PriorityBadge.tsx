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
    icon: <AlertTriangle className="w-3 h-3 text-[#C24141]" />,
    text: 'text-[#C24141]',
    bg: 'bg-[#FDEEEE]',
  },
  [TaskPriority.HIGH]: {
    label: 'High',
    icon: <ArrowUp className="w-3 h-3 text-[#B45A20]" />,
    text: 'text-[#B45A20]',
    bg: 'bg-[#FFF1E7]',
  },
  [TaskPriority.MEDIUM]: {
    label: 'Medium',
    icon: <Minus className="w-3 h-3 text-[#0077E6]" />,
    text: 'text-[#0077E6]',
    bg: 'bg-[#EAF5FF]',
  },
  [TaskPriority.LOW]: {
    label: 'Low',
    icon: <ArrowDown className="w-3 h-3 text-[#5F6368]" />,
    text: 'text-[#5F6368]',
    bg: 'bg-[#F4F6F8]',
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
    icon: <Minus className="w-3 h-3 text-[#92979E]" />,
    text: 'text-[#92979E]',
    bg: 'bg-[#F4F6F8]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[6px] text-[11px] font-medium select-none',
        config.bg,
        config.text,
        isCompact ? 'p-1' : 'px-2 py-0.5',
        className,
      )}
      title={`Priority: ${config.label}`}
    >
      {config.icon}
      {!isCompact && <span>{config.label}</span>}
    </span>
  );
}
