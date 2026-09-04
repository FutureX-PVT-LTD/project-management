'use client';

import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  dividerAfter?: boolean;
}

interface ActionMenuProps {
  items?: ActionMenuItem[];
  trigger?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  collisionPadding?: number;
  className?: string;
  children?: React.ReactNode;
}

export function ActionMenu({
  items,
  trigger,
  align = 'end',
  side = 'bottom',
  sideOffset = 4,
  collisionPadding = 12,
  className,
  children,
}: ActionMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button
            type="button"
            className="p-1.5 rounded-md text-fx-text-muted hover:text-fx-text-primary hover:bg-fx-bg-hover fx-transition focus:outline-none focus:ring-1 focus:ring-[#315F7D]"
            aria-label="Actions menu"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(
            'min-w-[190px] rounded-[8px] bg-white border border-fx-border p-1 shadow-popover z-dropdown animate-fadeIn focus:outline-none text-xs select-none',
            className,
          )}
        >
          {items ? (
            items.map((item, idx) => {
              const isDanger = item.variant === 'danger';
              const content = (
                <div
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer fx-transition select-none',
                    isDanger
                      ? 'text-fx-semantic-danger hover:bg-red-50/80 focus:bg-red-50/80'
                      : 'text-fx-text-primary hover:bg-fx-bg-hover focus:bg-fx-bg-hover',
                    item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                  )}
                >
                  {item.icon && (
                    <span
                      className={cn(
                        'w-4 h-4 shrink-0 flex items-center justify-center',
                        isDanger ? 'text-fx-semantic-danger' : 'text-fx-text-muted',
                      )}
                    >
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </div>
              );

              return (
                <React.Fragment key={idx}>
                  <DropdownMenu.Item
                    asChild={!!item.href}
                    disabled={item.disabled}
                    onSelect={(e) => {
                      if (item.disabled) {
                        e.preventDefault();
                        return;
                      }
                      item.onClick?.();
                    }}
                    className="focus:outline-none"
                  >
                    {item.href ? (
                      <Link href={item.href} className="block w-full">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </DropdownMenu.Item>
                  {item.dividerAfter && (
                    <DropdownMenu.Separator className="h-px bg-fx-border/70 my-1" />
                  )}
                </React.Fragment>
              );
            })
          ) : (
            children
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export const DropdownMenuItem = DropdownMenu.Item;
export const DropdownMenuSeparator = DropdownMenu.Separator;
export const DropdownMenuGroup = DropdownMenu.Group;
