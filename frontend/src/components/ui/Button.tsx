import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isSpinnerActive = loading || isLoading;
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-[9px] fx-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2463EB]/25 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

    const variants = {
      primary:
        'bg-[#2463EB] text-white hover:bg-[#1D4ED8] active:bg-[#1B44B8] border border-transparent shadow-none',
      secondary:
        'bg-white text-[#17191C] border border-[#DCE1E7] hover:bg-[#F8F9FB] hover:border-[#CCD3DD] active:bg-[#F3F5F7]',
      ghost:
        'bg-transparent text-[#60666F] hover:text-[#17191C] hover:bg-[#F8F9FB] border border-transparent',
      danger:
        'bg-[#B54747] text-white hover:bg-[#A33B3B] active:bg-[#8F3232] border border-transparent',
      // Backward-compatible aliases
      soft:
        'bg-[#EEF4FF] text-[#2463EB] hover:bg-[#E0ECFF] active:bg-[#D4E4FF] border border-transparent',
      outline:
        'bg-transparent text-[#17191C] border border-[#DCE1E7] hover:bg-[#F8F9FB]',
    };

    const sizes = {
      xs: 'h-7 px-2.5 text-xs gap-1 rounded-[7px] font-medium',
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-[8px] font-medium',
      md: 'h-[36px] px-3.5 text-[13px] gap-2 font-medium rounded-[9px]',
      lg: 'h-[40px] px-4 text-sm gap-2 font-semibold rounded-[9px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isSpinnerActive}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isSpinnerActive ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isSpinnerActive && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
