import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ className, padding = 'md', children, ...props }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3.5',
    md: 'p-4 sm:p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'bg-fx-surface rounded-[10px] border border-fx-border shadow-card overflow-hidden',
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-3.5 border-b border-fx-border/70',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold text-fx-text-primary tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}
