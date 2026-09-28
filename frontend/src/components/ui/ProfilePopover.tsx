'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useAuth } from '@/features/auth/AuthContext';
import { FutureXLogo } from '@/components/branding/FutureXLogo';
import {
  Shield,
  Bell,
  LogOut,
  Check,
  ChevronRight,
  Briefcase,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { UserRole } from '@futurex/shared';

interface ProfilePopoverProps {
  children: React.ReactNode;
}

export function ProfilePopover({ children }: ProfilePopoverProps) {
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return <>{children}</>;

  const canViewAdminSettings = hasRole(UserRole.OWNER, UserRole.ADMIN);
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
            'w-72 rounded-[10px] bg-white border border-[#E3E7EC] p-2 shadow-lg z-50 animate-fadeIn focus:outline-none',
          )}
        >
          {/* User Header */}
          <div className="p-3 border-b border-[#E3E7EC] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EEF4FF] text-[#2563EB] border border-[#2563EB]/20 font-semibold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#181B20] truncate">{fullName}</p>
              <p className="text-xs text-[#626A73] truncate">{user.email}</p>
              <span className="inline-block mt-1 text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-[#F7F8FA] text-[#626A73] border border-[#E3E7EC]">
                {roleDisplay}
              </span>
            </div>
          </div>

          {/* Active Workspace */}
          <div className="px-3 py-2 my-1.5 bg-[#F7F8FA] rounded-[8px] border border-[#E3E7EC] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FutureXLogo size="small" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#181B20] truncate">FutureX Studio</p>
                <p className="text-[11px] text-[#929AA3] truncate">Production Workspace</p>
              </div>
            </div>
            <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
          </div>

          {/* Navigation Links */}
          <div className="py-1 space-y-0.5 text-xs text-[#181B20]">
            <Link
              href="/my-work"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-[6px] hover:bg-[#F7F8FA] transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Briefcase className="w-3.5 h-3.5 text-[#929AA3]" />
                <span>My Active Work</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#929AA3]" />
            </Link>

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-[6px] hover:bg-[#F7F8FA] transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Bell className="w-3.5 h-3.5 text-[#929AA3]" />
                <span>Notification Alerts</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#929AA3]" />
            </Link>

            <Link
              href="/account/security"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-[6px] hover:bg-[#F7F8FA] transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <KeyRound className="w-3.5 h-3.5 text-[#929AA3]" />
                <span>Change Password</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#929AA3]" />
            </Link>

            {canViewAdminSettings && (
              <Link
                href="/admin/settings"
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-[6px] hover:bg-[#F7F8FA] transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Shield className="w-3.5 h-3.5 text-[#929AA3]" />
                  <span>Security & Workspace</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#929AA3]" />
              </Link>
            )}
          </div>

          <div className="h-px bg-[#E3E7EC] my-1" />

          {/* Sign Out */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-[#C24141] hover:bg-[#FDEEEE] rounded-[6px] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
