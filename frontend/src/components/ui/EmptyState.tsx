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
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center select-none',
        className,
      )}
    >
      {icon && (
        <div className="h-10 w-10 rounded-full bg-fx-bg-subtle border border-fx-border flex items-center justify-center text-fx-text-muted mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-fx-text-primary">{title}</h4>
      {description && (
        <p className="text-xs text-fx-text-secondary mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
