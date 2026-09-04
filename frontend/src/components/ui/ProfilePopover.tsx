'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useAuth } from '@/features/auth/AuthContext';
import {
  User as UserIcon,
  Shield,
  Bell,
  LogOut,
  Check,
  ChevronRight,
  Briefcase,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ProfilePopoverProps {
  children: React.ReactNode;
}

export function ProfilePopover({ children }: ProfilePopoverProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return <>{children}</>;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'FX';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  const roleDisplay = (user.jobTitle || (user as any).role || user.globalRole || 'Team Member').toString().replace(/_/g, ' ');


  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          side="top"
          sideOffset={8}
          className={cn(
            'w-72 rounded-[8px] bg-white border border-fx-border p-2 shadow-popover z-50 animate-fadeIn focus:outline-none',
          )}
        >
          {/* User Header */}
          <div className="p-3 border-b border-fx-border/70 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EDF4F8] text-[#274E68] border border-[#315F7D]/20 font-semibold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fx-text-primary truncate">{fullName}</p>
              <p className="text-xs text-fx-text-secondary truncate">{user.email}</p>
              <span className="inline-block mt-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-fx-bg-subtle text-fx-text-muted border border-fx-border/60">
                {roleDisplay}
              </span>
            </div>
          </div>

          {/* Active Workspace */}
          <div className="px-3 py-2.5 my-1.5 bg-fx-bg-subtle rounded-lg border border-fx-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-[#315F7D] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                FX
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-fx-text-primary truncate">FutureX Studio</p>
                <p className="text-[11px] text-fx-text-muted truncate">Production Workspace</p>
              </div>
            </div>
            <Check className="w-3.5 h-3.5 text-[#315F7D] shrink-0" />
          </div>

          {/* Navigation Links */}
          <div className="py-1 space-y-0.5 text-xs text-fx-text-primary">
            <Link
              href="/my-work"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-fx-bg-hover fx-transition"
            >
              <span className="flex items-center gap-2.5">
                <Briefcase className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>My Active Work</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-fx-text-muted" />
            </Link>

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-fx-bg-hover fx-transition"
            >
              <span className="flex items-center gap-2.5">
                <Bell className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>Notification Alerts</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-fx-text-muted" />
            </Link>

            <Link
              href="/admin/settings"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-fx-bg-hover fx-transition"
            >
              <span className="flex items-center gap-2.5">
                <Shield className="w-3.5 h-3.5 text-fx-text-muted" />
                <span>Security & Workspace</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-fx-text-muted" />
            </Link>
          </div>

          <div className="h-px bg-fx-border/70 my-1" />

          {/* Sign Out */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-fx-semantic-danger hover:bg-red-50/70 rounded-md fx-transition"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
