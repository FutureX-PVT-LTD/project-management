import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-10 px-4 text-center select-none',
        className,
      )}
    >
      {icon && (
        <div className="h-9 w-9 rounded-full bg-[#F7F8FA] border border-[#E3E7EC] flex items-center justify-center text-[#626A73] mb-3">
          {icon}
        </div>
      )}
      <p className="text-[13.5px] font-semibold text-[#181B20]">{title}</p>
      {description && (
        <p className="text-[12.5px] text-[#626A73] mt-1 max-w-sm leading-normal">
          {description}
        </p>
      )}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}
