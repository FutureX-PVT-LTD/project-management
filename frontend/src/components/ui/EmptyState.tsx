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
        <div className="h-8 w-8 rounded-full bg-[#F8F9FB] border border-[#E8EBEF] flex items-center justify-center text-[#8B929B] mb-2.5">
          {icon}
        </div>
      )}
      <p className="text-[13px] font-medium text-[#17191C]">{title}</p>
      {description && (
        <p className="text-[12px] text-[#60666F] mt-0.5 max-w-sm leading-normal">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
