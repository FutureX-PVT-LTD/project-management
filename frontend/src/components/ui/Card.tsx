import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'outline' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  className,
  variant = 'default',
  padding = 'md',
  children,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-lg fx-transition';

  const variants = {
    default: 'bg-white border border-fx-border text-fx-text-primary shadow-none',
    subtle: 'bg-fx-bg-subtle border border-fx-border text-fx-text-primary shadow-none',
    outline: 'bg-transparent border border-fx-border text-fx-text-primary shadow-none',
    interactive:
      'bg-white border border-fx-border hover:border-fx-border-strong hover:bg-fx-bg-hover cursor-pointer text-fx-text-primary shadow-none',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };

  return (
    <div className={cn(baseStyles, variants[variant], paddings[padding], className)} {...props}>
      {children}
    </div>
  );
}
