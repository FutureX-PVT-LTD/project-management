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
      'inline-flex items-center justify-center font-semibold rounded-[9px] fx-transition duration-130 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none active:scale-[0.99]';

    const variants = {
      primary:
        'bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF] border border-transparent shadow-none',
      secondary:
        'bg-white text-[#181B20] border border-[#E3E7EC] hover:bg-[#F7F8FA] hover:border-[#D4DAE1] active:bg-[#F2F4F7] shadow-none',
      ghost:
        'bg-transparent text-[#626A73] hover:text-[#181B20] hover:bg-[#F2F4F7] border border-transparent',
      danger:
        'bg-[#C24141] text-white hover:bg-[#B03535] active:bg-[#9B2A2A] border border-transparent shadow-none',
      soft:
        'bg-[#EEF4FF] text-[#2563EB] hover:bg-[#E0ECFE] active:bg-[#D3E3FD] border border-transparent font-medium',
      outline:
        'bg-transparent text-[#181B20] border border-[#E3E7EC] hover:bg-[#F7F8FA] active:bg-[#F2F4F7]',
    };

    const sizes = {
      xs: 'h-[28px] px-2.5 text-[11.5px] gap-1 rounded-[6px] font-semibold',
      sm: 'h-[32px] px-3 text-[12.5px] gap-1.5 rounded-[8px] font-semibold',
      md: 'h-[36px] px-3.5 text-[13.5px] gap-2 font-semibold rounded-[9px]',
      lg: 'h-[42px] px-4.5 text-[14px] gap-2.5 font-semibold rounded-[9px]',
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
