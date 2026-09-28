'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';
import {
  LayoutDashboard,
  CheckSquare,
  ClipboardCheck,
  FolderKanban,
  Users,
  Calendar as CalendarIcon,
  GanttChartSquare,
  BarChart3,
  Bell,
  Settings,
  Search,
  Plus,
  Menu,
  X,
  ChevronDown,
  MoreVertical,
  ShieldCheck,
} from 'lucide-react';

import { ProfilePopover } from '@/components/ui/ProfilePopover';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Button } from '@/components/ui/Button';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';
import { cn } from '@/lib/utils';
import { FutureXLogo } from '@/components/branding/FutureXLogo';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface AppShellProps {
  children: React.ReactNode;
  onOpenCreateTask?: () => void;
  onOpenCreateProject?: () => void;
  fullWidth?: boolean;
}

export function AppShell({
  children,
  onOpenCreateTask,
  onOpenCreateProject,
  fullWidth = false,
}: AppShellProps) {
  const pathname = usePathname();
  const { user, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Global keyboard shortcut: Cmd/Ctrl + K opens search anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Shared notifications cache
  const { data: unreadData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
    staleTime: 15000,
    refetchInterval: 30000,
    enabled: !!user,
  });
  const unreadCount = (unreadData as any)?.unreadCount || 0;

  const isOwner = hasRole(UserRole.OWNER);
  const isAdmin = hasRole(UserRole.ADMIN);
  const canManage = isOwner || isAdmin;

  const navigation = canManage
    ? [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Products', href: '/projects', icon: FolderKanban },
        { name: 'My Work', href: '/my-work', icon: CheckSquare },
        { name: 'Team Submissions', href: '/admin/submissions', icon: ClipboardCheck },
        { name: 'Additional Work', href: '/additional-work', icon: Plus },
        { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
        { name: 'Team', href: '/team', icon: Users },
        { name: 'Timeline', href: '/timeline', icon: GanttChartSquare },
        { name: 'Reports', href: '/reports', icon: BarChart3 },
        { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount },
      ]
    : [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Work', href: '/my-work', icon: CheckSquare },
        { name: 'Additional Work', href: '/additional-work', icon: Plus },
        { name: 'Products', href: '/projects', icon: FolderKanban },
        { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
        { name: 'Timeline', href: '/timeline', icon: GanttChartSquare },
        { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount },
      ];

  const adminNav = [
    { name: 'User Directory', href: '/admin/users', icon: Users },
    ...(isOwner ? [{ name: 'Audit Log', href: '/admin/audit', icon: ShieldCheck }] : []),
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  // Breadcrumbs derivation
  const getBreadcrumbs = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'Overview';
    if (pathname === '/my-work') return 'My Work';
    if (pathname === '/additional-work') return 'Additional Work';
    if (pathname === '/admin/submissions') return 'Administration / Team Submissions';
    if (pathname === '/projects') return 'Products';
    if (pathname.startsWith('/projects/')) return 'Products / Details';
    if (pathname === '/tasks') return 'Tasks';
    if (pathname === '/calendar') return 'Calendar';
    if (pathname === '/team') return 'Team';
    if (pathname === '/timeline') return 'Timeline';
    if (pathname === '/reports') return 'Reports';
    if (pathname === '/notifications') return 'Notifications';
    if (pathname === '/account/security') return 'Account / Security';
    if (pathname === '/admin/users') return 'Administration / Users';
    if (pathname === '/admin/audit') return 'Administration / Audit';
    if (pathname === '/admin/settings') return 'Administration / Settings';
    return 'Workspace';
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'FX';
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User';

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar: 224px desktop, clean white bg, subtle border */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[224px] bg-white border-r border-[#E3E7EC] flex flex-col justify-between transition-transform duration-170 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-drawer' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="h-[54px] px-4 border-b border-[#E3E7EC] flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <FutureXLogo size="sidebar" priority />
              <div className="flex items-baseline">
                <span className="text-[11px] text-[#929AA3] font-semibold tracking-tight">
                  Studio
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-[#929AA3] hover:text-[#181B20] p-1 rounded-md hover:bg-[#F7F8FA]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
            <div>
              <p className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#929AA3] select-none">
                Workspace
              </p>
              <nav className="space-y-0.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'h-[34px] flex items-center justify-between px-2.5 rounded-[8px] text-[13px] fx-transition group relative',
                        isActive
                          ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold'
                          : 'text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA] font-normal',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 fx-transition',
                            isActive ? 'text-[#2563EB]' : 'text-[#626A73] group-hover:text-[#181B20]',
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-[#EEF4FF] border border-[#D8E6FD] text-[#2563EB] text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {(isAdmin || isOwner) && (
              <div>
                <p className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#929AA3] select-none">
                  Administration
                </p>
                <nav className="space-y-0.5">
                  {adminNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'h-[34px] flex items-center gap-2.5 px-2.5 rounded-[8px] text-[13px] fx-transition group relative',
                          isActive
                            ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold'
                            : 'text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA] font-normal',
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 fx-transition',
                            isActive ? 'text-[#2563EB]' : 'text-[#626A73] group-hover:text-[#181B20]',
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* User Profile Footer Trigger */}
          <div className="p-2 border-t border-[#E3E7EC] bg-white">
            <ProfilePopover>
              <button
                type="button"
                className="w-full flex items-center justify-between p-1.5 rounded-[8px] hover:bg-[#F7F8FA] fx-transition text-left group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#EEF4FF] text-[#2563EB] font-semibold text-[10.5px] border border-[#D8E6FD] flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#181B20] truncate">{fullName}</p>
                    <p className="text-[10px] text-[#626A73] truncate capitalize">
                      {(user?.jobTitle || (user as any)?.role || user?.globalRole || 'Team Member').toString().toLowerCase().replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <MoreVertical className="w-3.5 h-3.5 text-[#929AA3] group-hover:text-[#181B20] shrink-0" />
              </button>
            </ProfilePopover>
          </div>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[224px]">
        {/* Top Bar (54px) */}
        <header className="h-[54px] bg-white border-b border-[#E3E7EC] px-4 sm:px-6 lg:px-7 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-[#626A73] hover:text-[#181B20] p-1.5 rounded-md hover:bg-[#F7F8FA]"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-[12.5px] text-[#626A73] font-medium truncate hidden sm:inline">
              {getBreadcrumbs()}
            </span>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Desktop Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex w-64 h-[32px] px-2.5 bg-[#F7F8FA] text-[12px] text-[#626A73] rounded-[8px] border border-[#E3E7EC] hover:border-[#D4DAE1] hover:bg-white items-center justify-between fx-transition focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-[#929AA3]" />
                <span>Search tasks, projects...</span>
              </span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded-[4px] bg-white text-[#626A73] border border-[#E3E7EC]">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-1.5 text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA] rounded-[7px] fx-transition"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative p-1.5 text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA] rounded-[7px] fx-transition"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#2563EB] rounded-full" />
              )}
            </Link>

            {/* Quick Action: New Dropdown */}
            {canManage && (onOpenCreateTask || onOpenCreateProject) && (
              <ActionMenu
                align="end"
                side="bottom"
                sideOffset={6}
                trigger={
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    rightIcon={<ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />}
                  >
                    New
                  </Button>
                }
                items={[
                  ...(onOpenCreateTask
                    ? [
                        {
                          label: 'New Task',
                          icon: <CheckSquare className="w-3.5 h-3.5 text-[#2563EB]" />,
                          onClick: () => onOpenCreateTask(),
                        },
                      ]
                    : []),
                  ...(onOpenCreateProject
                    ? [
                        {
                          label: 'New Product',
                          icon: <FolderKanban className="w-3.5 h-3.5 text-[#2563EB]" />,
                          onClick: () => onOpenCreateProject(),
                        },
                      ]
                    : []),
                ]}
              />
            )}
          </div>
        </header>

        {/* Dynamic Main Content Canvas */}
        <main className="min-w-0 flex-1 bg-[#F7F8FA] p-4 sm:p-6 lg:p-7">
          <div className={cn('mx-auto min-w-0', fullWidth ? 'w-full' : 'max-w-[1440px]')}>
            {children}
          </div>
        </main>
      </div>

      {/* Global Command Palette / Search Modal (Rendered once) */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
