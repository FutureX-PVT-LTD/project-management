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
    bg: 'bg-[#FDEEEE] border border-[#FBD4D4]',
  },
  [TaskPriority.HIGH]: {
    label: 'High',
    icon: <ArrowUp className="w-3 h-3 text-[#A86B12]" />,
    text: 'text-[#A86B12]',
    bg: 'bg-[#FFF6E5] border border-[#FEEBCA]',
  },
  [TaskPriority.MEDIUM]: {
    label: 'Medium',
    icon: <Minus className="w-3 h-3 text-[#2563EB]" />,
    text: 'text-[#2563EB]',
    bg: 'bg-[#EEF4FF] border border-[#D8E6FD]',
  },
  [TaskPriority.LOW]: {
    label: 'Low',
    icon: <ArrowDown className="w-3 h-3 text-[#626A73]" />,
    text: 'text-[#626A73]',
    bg: 'bg-[#F7F8FA] border border-[#E3E7EC]',
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
    icon: <Minus className="w-3 h-3 text-[#626A73]" />,
    text: 'text-[#626A73]',
    bg: 'bg-[#F7F8FA] border border-[#E3E7EC]',
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
