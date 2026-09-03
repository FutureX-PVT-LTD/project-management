import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="w-full relative">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-fx-text-muted pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3 py-2 bg-white text-[13px] text-fx-text-primary rounded-md border border-fx-border placeholder:text-fx-text-muted/80 fx-transition',
              'focus:outline-none focus:border-fx-green focus:ring-1 focus:ring-fx-green',
              'disabled:bg-gray-50 disabled:text-fx-text-muted disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-fx-semantic-danger focus:border-fx-semantic-danger focus:ring-fx-semantic-danger',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-fx-text-muted flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-fx-semantic-danger">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
