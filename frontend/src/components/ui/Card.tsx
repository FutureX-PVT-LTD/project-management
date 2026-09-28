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
    default: 'bg-white border border-[#E3E7EC] text-[#181B20]',
    subtle: 'bg-[#F7F8FA] border border-[#E3E7EC] text-[#181B20]',
    outline: 'bg-transparent border border-[#E3E7EC] text-[#181B20]',
    interactive:
      'bg-white border border-[#E3E7EC] hover:border-[#D4DAE1] cursor-pointer text-[#181B20]',
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
