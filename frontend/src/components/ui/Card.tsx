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
    default: 'bg-white border border-[#E6E8EB] text-[#17191C] shadow-none',
    subtle: 'bg-[#F8F9FA] text-[#17191C] shadow-none',
    outline: 'bg-transparent border border-[#E6E8EB] text-[#17191C] shadow-none',
    interactive:
      'bg-white border border-[#E6E8EB] hover:border-[#D1D6DC] hover:bg-[#F3F5F7] cursor-pointer text-[#17191C] shadow-none',
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
