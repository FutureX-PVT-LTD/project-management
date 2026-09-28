import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, leftIcon, rightIcon, inputSize = 'md', disabled, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-[34px] px-3 text-[12.5px]',
      md: 'h-[42px] px-3.5 text-[13.5px]',
      lg: 'h-[46px] px-4 text-[14px]',
    };

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
              'w-full bg-[#FFFFFF] text-[#181B20] rounded-[9px] border border-[#E3E7EC] placeholder:text-[#929AA3] fx-transition',
              sizeClasses[inputSize],
              'focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15',
              'disabled:bg-[#F2F4F7] disabled:text-[#929AA3] disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-[#C24141] focus:border-[#C24141] focus:ring-[#C24141]/20',
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
        {error && <p className="mt-1 text-[12px] text-[#C24141] font-medium">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
