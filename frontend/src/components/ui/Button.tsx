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
      'inline-flex items-center justify-center font-medium rounded-[8px] fx-transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none active:scale-[0.99]';

    const variants = {
      primary:
        'bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF] border border-transparent shadow-[0_1px_2px_rgba(37,99,235,0.12)]',
      secondary:
        'bg-white text-[#0F172A] border border-[#DCE0E5] hover:bg-[#F8FAFC] hover:border-[#CAD0D8] active:bg-[#F1F5F9] shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
      ghost:
        'bg-transparent text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-transparent',
      danger:
        'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] border border-transparent shadow-[0_1px_2px_rgba(220,38,38,0.12)]',
      // Backward-compatible aliases
      soft:
        'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] active:bg-[#BFDBFE] border border-transparent',
      outline:
        'bg-transparent text-[#0F172A] border border-[#DCE0E5] hover:bg-[#F8FAFC] active:bg-[#F1F5F9]',
    };

    const sizes = {
      xs: 'h-7 px-2.5 text-[11px] gap-1 rounded-[6px] font-medium',
      sm: 'h-[30px] px-3 text-[12px] gap-1.5 rounded-[7px] font-medium',
      md: 'h-[34px] px-3.5 text-[12.5px] gap-2 font-medium rounded-[8px]',
      lg: 'h-[38px] px-4 text-[13px] gap-2 font-semibold rounded-[8px]',
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
