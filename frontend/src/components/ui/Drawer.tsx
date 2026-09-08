'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'max-w-[460px]',
  className,
}: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-backdrop bg-black/20 backdrop-blur-xs fx-transition animate-fadeIn" />

        {/* Slide-over Drawer Panel */}
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-drawer flex h-[100dvh] w-full flex-col bg-white shadow-drawer border-l border-[#E8EBEF] focus:outline-none overflow-hidden animate-drawerIn',
            width,
            className,
          )}
        >
          {/* Fixed Header */}
          {(title || description) && (
            <div className="px-5 py-3.5 border-b border-[#E8EBEF] flex items-start justify-between bg-white shrink-0">
              <div className="space-y-0.5 min-w-0 flex-1 pr-3">
                {title && (
                  <DialogPrimitive.Title className="text-sm font-semibold text-[#17191C] tracking-tight truncate">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-xs text-[#60666F] leading-normal">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close className="p-1 rounded-md text-[#8B929B] hover:text-[#17191C] hover:bg-[#F8F9FB] fx-transition focus:outline-none shrink-0 -mr-1">
                <X className="w-4 h-4" />
                <span className="sr-only">Close drawer</span>
              </DialogPrimitive.Close>
            </div>
          )}

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5">{children}</div>

          {/* Fixed Footer */}
          {footer && (
            <div className="px-5 py-3.5 border-t border-[#E8EBEF] bg-[#F8F9FB] flex items-center justify-end gap-2 shrink-0">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const DrawerHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('px-5 py-3.5 border-b border-[#E8EBEF] flex items-center justify-between bg-white shrink-0', className)}>
    {children}
  </div>
);

export const DrawerBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('flex-1 overflow-y-auto p-5', className)}>{children}</div>
);

export const DrawerFooter = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'px-5 py-3.5 border-t border-[#E8EBEF] bg-[#F8F9FB] flex items-center justify-end gap-2 shrink-0',
      className,
    )}
  >
    {children}
  </div>
);
