'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  width?: string;
  title?: string;
}

export function SlideOver({
  open,
  onOpenChange,
  children,
  width = 'max-w-2xl',
  title,
}: SlideOverProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] fx-transition animate-fadeIn" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-white shadow-popover border-l border-fx-border focus:outline-none overflow-hidden animate-fadeIn sm:max-w-xl md:max-w-2xl lg:max-w-3xl',
            width,
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-fx-border shrink-0 bg-white">
              <DialogPrimitive.Title className="text-sm font-semibold text-fx-text-primary">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="rounded p-1 text-fx-text-muted hover:text-fx-text-primary hover:bg-gray-100 focus:outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
