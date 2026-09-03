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
  width = 'max-w-[560px]',
  className,
}: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-backdrop bg-black/25 backdrop-blur-[2px] fx-transition animate-fadeIn" />

        {/* Slide-over Drawer Panel */}
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-drawer flex h-[100dvh] w-full flex-col bg-white shadow-drawer border-l border-fx-border focus:outline-none overflow-hidden animate-fadeIn',
            width,
            className,
          )}
        >
          {/* Fixed Non-scrolling Header */}
          {(title || description) && (
            <div className="px-6 py-4 border-b border-fx-border flex items-start justify-between bg-white shrink-0">
              <div className="space-y-0.5 min-w-0 flex-1 pr-4">
                {title && (
                  <DialogPrimitive.Title className="text-base font-semibold text-fx-text-primary tracking-tight truncate">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-xs text-fx-text-secondary leading-normal">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close className="p-1.5 rounded-md text-fx-text-muted hover:text-fx-text-primary hover:bg-fx-bg-hover fx-transition focus:outline-none shrink-0 -mr-1.5">
                <X className="w-4 h-4" />
                <span className="sr-only">Close drawer</span>
              </DialogPrimitive.Close>
            </div>
          )}

          {/* Scrollable Body (never overflows viewport) */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>

          {/* Fixed Sticky Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-fx-border bg-fx-bg-subtle flex items-center justify-end gap-2.5 shrink-0">
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
  <div className={cn('px-6 py-4 border-b border-fx-border flex items-center justify-between bg-white shrink-0', className)}>
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
  <div className={cn('flex-1 overflow-y-auto p-6', className)}>{children}</div>
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
      'px-6 py-4 border-t border-fx-border bg-fx-bg-subtle flex items-center justify-end gap-2.5 shrink-0',
      className,
    )}
  >
    {children}
  </div>
);
