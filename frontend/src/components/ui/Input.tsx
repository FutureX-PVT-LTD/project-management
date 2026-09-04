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
            <div className="absolute left-3 text-[#92979E] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3.5 py-2 bg-[#F8F9FB] text-[13px] text-[#15171A] rounded-[10px] border border-[#E4E7EB] placeholder:text-[#92979E] fx-transition',
              'focus:outline-none focus:bg-white focus:border-[#0088FF] focus:ring-1 focus:ring-[#0088FF]',
              'disabled:bg-[#F4F6F8] disabled:text-[#92979E] disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-[#C24141] focus:border-[#C24141] focus:ring-[#C24141]',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#92979E] flex items-center justify-center">
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
