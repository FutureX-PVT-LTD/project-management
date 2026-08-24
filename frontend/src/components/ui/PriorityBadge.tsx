import React from 'react';
import { TaskPriority } from '@futurex/shared';
import { ArrowUp, ArrowRight, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: TaskPriority | string;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function PriorityBadge({
  priority,
  showLabel = true,
  size = 'sm',
  className,
}: PriorityBadgeProps) {
  const config: Record<
    string,
    { label: string; text: string; icon: React.ReactNode; symbol: string }
  > = {
    [TaskPriority.URGENT]: {
      label: 'Urgent',
      text: 'text-[#C33A3A] font-semibold',
      icon: <ArrowUp className="w-3.5 h-3.5 text-[#C33A3A] shrink-0" strokeWidth={2.5} />,
      symbol: '↑',
    },
    [TaskPriority.HIGH]: {
      label: 'High',
      text: 'text-[#B76E00] font-medium',
      icon: <ArrowUp className="w-3.5 h-3.5 text-[#B76E00] shrink-0" strokeWidth={2} />,
      symbol: '↑',
    },
    [TaskPriority.MEDIUM]: {
      label: 'Medium',
      text: 'text-[#5F6B64]',
      icon: <Minus className="w-3.5 h-3.5 text-[#8A948E] shrink-0" strokeWidth={2} />,
      symbol: '—',
    },
    [TaskPriority.LOW]: {
      label: 'Low',
      text: 'text-[#8A948E]',
      icon: <ArrowDown className="w-3.5 h-3.5 text-[#8A948E] shrink-0" strokeWidth={1.75} />,
      symbol: '↓',
    },
    [TaskPriority.NONE]: {
      label: 'None',
      text: 'text-[#8A948E]',
      icon: <Minus className="w-3 h-3 text-[#CDD5D0] shrink-0" />,
      symbol: '—',
    },
  };

  const current = config[priority] || config[TaskPriority.NONE];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs select-none',
        current.text,
        className,
      )}
      title={`Priority: ${current.label}`}
    >
      {current.icon}
      {showLabel && <span className="text-[12px] font-medium">{current.label}</span>}
    </span>
  );
}
