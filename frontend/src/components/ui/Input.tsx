import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, leftIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-fx-text-muted pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-9 w-full rounded-md border border-fx-border bg-white px-3 py-1.5 text-sm text-fx-text-primary placeholder:text-fx-text-muted/80 fx-transition focus-visible:outline-none focus-visible:border-fx-green-700 focus-visible:ring-1 focus-visible:ring-fx-green-700 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-fx-text-muted',
              leftIcon && 'pl-9',
              error && 'border-fx-semantic-danger focus-visible:border-fx-semantic-danger focus-visible:ring-fx-semantic-danger',
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-fx-semantic-danger font-medium">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
