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
    icon: <AlertTriangle className="w-3 h-3 text-[#B54747]" />,
    text: 'text-[#B54747]',
    bg: 'bg-[#FCEEEE]',
  },
  [TaskPriority.HIGH]: {
    label: 'High',
    icon: <ArrowUp className="w-3 h-3 text-[#B45A20]" />,
    text: 'text-[#B45A20]',
    bg: 'bg-[#FFF1E7]',
  },
  [TaskPriority.MEDIUM]: {
    label: 'Medium',
    icon: <Minus className="w-3 h-3 text-[#245EC7]" />,
    text: 'text-[#245EC7]',
    bg: 'bg-[#EEF4FF]',
  },
  [TaskPriority.LOW]: {
    label: 'Low',
    icon: <ArrowDown className="w-3 h-3 text-[#60666F]" />,
    text: 'text-[#60666F]',
    bg: 'bg-[#F1F3F5]',
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
    icon: <Minus className="w-3 h-3 text-[#8B929B]" />,
    text: 'text-[#8B929B]',
    bg: 'bg-[#F1F3F5]',
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
