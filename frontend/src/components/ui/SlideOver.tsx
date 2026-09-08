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
  title?: React.ReactNode;
}

export function SlideOver({
  open,
  onOpenChange,
  children,
  width = 'max-w-[460px]',
  title,
}: SlideOverProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-backdrop bg-black/20 backdrop-blur-xs fx-transition animate-fadeIn" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-drawer flex h-[100dvh] w-full flex-col bg-white shadow-drawer border-l border-[#E8EBEF] focus:outline-none overflow-hidden animate-drawerIn sm:max-w-[460px]',
            width,
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E8EBEF] shrink-0 bg-white">
              <DialogPrimitive.Title className="text-sm font-semibold text-[#17191C] tracking-tight truncate">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="rounded-md p-1 text-[#8B929B] hover:text-[#17191C] hover:bg-[#F8F9FB] fx-transition focus:outline-none">
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
