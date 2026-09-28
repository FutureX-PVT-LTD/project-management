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
  const baseStyles = 'rounded-[12px] fx-transition';

  const variants = {
    default: 'bg-white border border-[#E2E8F0] text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
    subtle: 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] shadow-none',
    outline: 'bg-transparent border border-[#E2E8F0] text-[#0F172A] shadow-none',
    interactive:
      'bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-[0_2px_8px_rgba(15,23,42,0.04)] cursor-pointer text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
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
