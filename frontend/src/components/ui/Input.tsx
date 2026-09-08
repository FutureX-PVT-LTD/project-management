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
            <div className="absolute left-3 text-[#8B929B] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-9 px-3 py-1.5 bg-[#F8F9FB] text-[13px] text-[#17191C] rounded-[9px] border border-[#E8EBEF] placeholder:text-[#8B929B] fx-transition',
              'focus:outline-none focus:bg-white focus:border-[#2463EB] focus:ring-1 focus:ring-[#2463EB]',
              'disabled:bg-[#F1F3F5] disabled:text-[#8B929B] disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-[#B54747] focus:border-[#B54747] focus:ring-[#B54747]',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#8B929B] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[#B54747]">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
