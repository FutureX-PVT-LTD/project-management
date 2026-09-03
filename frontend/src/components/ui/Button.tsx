import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
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

      'inline-flex items-center justify-center font-medium rounded-md fx-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-green focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none active:scale-[0.99]';

    const variants = {
      primary:
        'bg-fx-green text-white hover:bg-fx-green-hover shadow-none border border-transparent active:bg-[#075F3B]',
      secondary:
        'bg-white text-fx-text-primary border border-fx-border hover:bg-fx-bg-hover hover:border-fx-border-strong active:bg-gray-100',
      outline:
        'bg-transparent text-fx-text-primary border border-fx-border hover:bg-fx-bg-hover hover:border-fx-border-strong',
      ghost:
        'bg-transparent text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-hover',
      danger:
        'bg-fx-semantic-danger text-white hover:bg-red-700 shadow-none border border-transparent',
    };

    const sizes = {
      xs: 'h-7 px-2 text-xs gap-1 rounded-sm',
      sm: 'h-8 px-2.5 text-xs gap-1.5',
      md: 'h-9 px-3.5 text-[13px] gap-2 font-medium',
      lg: 'h-10 px-4 text-sm gap-2 font-semibold',
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
