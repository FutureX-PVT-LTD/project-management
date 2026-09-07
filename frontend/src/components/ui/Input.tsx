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
            <div className="absolute left-3 text-[#929AA3] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3.5 py-2 bg-[#F7F8FA] text-[13px] text-[#181B20] rounded-[10px] border border-[#E3E7EC] placeholder:text-[#929AA3] fx-transition',
              'focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]',
              'disabled:bg-[#F2F4F7] disabled:text-[#929AA3] disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-[#C24141] focus:border-[#C24141] focus:ring-[#C24141]',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#929AA3] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[#C24141]">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
