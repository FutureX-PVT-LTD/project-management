import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number; // 0 - 100
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  barColor?: string;
}

export function Progress({
  value,
  size = 'sm',
  showLabel = false,
  className,
  barColor,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value || 0));

  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-full bg-[#E2E7E4] rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full fx-transition', barColor || 'bg-fx-green-700')}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[12px] text-fx-text-secondary font-mono font-medium w-8 text-right shrink-0">
          {clamped}%
        </span>
      )}
    </div>
  );
}
