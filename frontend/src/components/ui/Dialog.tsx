'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-backdrop bg-black/25 backdrop-blur-xs fx-transition animate-fadeIn" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-[50%] top-[50%] z-modal w-[calc(100vw-32px)] max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-[16px] bg-white shadow-modal border border-[#E8EBEF] animate-fadeIn focus:outline-none max-h-[calc(100dvh-48px)] flex flex-col overflow-hidden',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-[#8B929B] hover:text-[#17191C] hover:bg-[#F8F9FB] fx-transition focus:outline-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close dialog</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 pt-5 pb-3 shrink-0 flex flex-col space-y-1 text-left border-b border-[#E8EBEF]', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-base font-semibold text-[#17191C] tracking-tight', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  );
}

export function DialogDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-xs text-[#60666F] leading-normal', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Description>
  );
}

export function DialogBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-6 space-y-4 text-xs', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-[#E8EBEF] bg-[#F8F9FB] shrink-0', className)} {...props}>
      {children}
    </div>
  );
}
