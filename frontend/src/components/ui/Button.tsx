import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'soft' | 'outline' | 'ghost' | 'danger';
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
      'inline-flex items-center justify-center font-semibold rounded-[10px] fx-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF]/30 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none active:scale-[0.99]';

    const variants = {
      primary:
        'bg-[#0088FF] text-white hover:bg-[#0077E6] active:bg-[#0068CC] shadow-none border border-transparent font-semibold',
      secondary:
        'bg-white text-[#15171A] border border-[#E4E7EB] hover:bg-[#F8F9FB] hover:border-[#D8DDE3] active:bg-[#F4F6F8]',
      soft:
        'bg-[#EAF5FF] text-[#005EBA] hover:bg-[#DBEEFF] active:bg-[#C9E4FF] border border-transparent font-semibold',
      outline:
        'bg-transparent text-[#15171A] border border-[#E4E7EB] hover:bg-[#F8F9FB] hover:border-[#D8DDE3]',
      ghost:
        'bg-transparent text-[#5F6368] hover:text-[#15171A] hover:bg-[#F5F7F9]',
      danger:
        'bg-[#C24141] text-white hover:bg-[#AD3636] active:bg-[#992C2C] border border-transparent font-semibold',
    };

    const sizes = {
      xs: 'h-7 px-2.5 text-xs gap-1 rounded-[7px] font-medium',
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-[8px] font-medium',
      md: 'h-[38px] px-3.5 text-[13px] gap-2 font-semibold rounded-[10px]',
      lg: 'h-10 px-4 text-sm gap-2 font-semibold rounded-[10px]',
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
