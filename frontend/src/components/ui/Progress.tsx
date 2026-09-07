import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: string;
}

export function Progress({
  value = 0,
  max = 100,
  className,
  size = 'sm',
  showLabel = false,
  color = 'bg-[#2563EB]',
}: ProgressProps) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const sizeStyles = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  };

  return (
    <div className={cn('w-full flex items-center gap-2', className)}>
      <div
        className={cn(
          'w-full bg-[#F2F4F7] rounded-full overflow-hidden',
          sizeStyles[size],
        )}
      >
        <div
          className={cn('h-full fx-transition rounded-full', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-mono text-[#626A73] w-7 text-right shrink-0">
          {percentage}%
        </span>
      )}
    </div>
  );
}
