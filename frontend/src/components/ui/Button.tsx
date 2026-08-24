import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium fx-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-green-700/30 disabled:opacity-45 disabled:pointer-events-none text-sm select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-fx-green-700 text-white hover:bg-fx-green-800 shadow-subtle active:translate-y-[0.5px]',
        secondary:
          'bg-white text-fx-text-primary border border-fx-border hover:bg-fx-bg-subtle hover:border-fx-border-strong active:bg-gray-100',
        soft:
          'bg-fx-green-100 text-fx-green-900 hover:bg-fx-green-100/80 font-semibold',
        ghost:
          'text-fx-text-secondary hover:text-fx-text-primary hover:bg-gray-100/80 active:bg-gray-200/60',
        danger:
          'bg-fx-semantic-danger text-white hover:bg-[#b02f2f] shadow-subtle active:translate-y-[0.5px]',
        outline:
          'border border-fx-border text-fx-text-secondary hover:text-fx-text-primary hover:border-fx-border-strong hover:bg-white',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs gap-1 rounded-[6px]',
        sm: 'h-8 px-3 text-xs gap-1.5 rounded-[6px]',
        md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
        lg: 'h-10 px-4 text-sm gap-2 rounded-md',
        icon: 'h-8 w-8 p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
