'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';
import {
  LayoutDashboard,
  CheckSquare,
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
} from 'lucide-react';

import { ProfilePopover } from '@/components/ui/ProfilePopover';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Button } from '@/components/ui/Button';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';
import { cn } from '@/lib/utils';
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

  // Shared notifications cache (deduplicated with NotificationDropdown)
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
        { name: 'Projects', href: '/projects', icon: FolderKanban },
        { name: 'My Work', href: '/my-work', icon: CheckSquare },
        { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
        { name: 'Team', href: '/team', icon: Users },
        { name: 'Timeline', href: '/timeline', icon: GanttChartSquare },
        { name: 'Reports', href: '/reports', icon: BarChart3 },
        { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount },
      ]
    : [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Work', href: '/my-work', icon: CheckSquare },
        { name: 'Projects', href: '/projects', icon: FolderKanban },
        { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
        { name: 'Timeline', href: '/timeline', icon: GanttChartSquare },
        { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount },
      ];

  const adminNav = [
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  // Breadcrumbs derivation
  const getBreadcrumbs = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'Workspace / Overview';
    if (pathname === '/my-work') return 'Workspace / My Work';
    if (pathname === '/projects') return 'Workspace / Projects';
    if (pathname.startsWith('/projects/')) return 'Projects / Project Details';
    if (pathname === '/tasks') return 'Workspace / Task Registry';
    if (pathname === '/calendar') return 'Workspace / Project Calendar';
    if (pathname === '/team') return 'Studio / Team Capacity';
    if (pathname === '/timeline') return 'Delivery / Timeline';
    if (pathname === '/reports') return 'Studio / Performance Reports';
    if (pathname === '/notifications') return 'Workspace / Notifications';
    if (pathname === '/admin/users') return 'Administration / User Directory';
    if (pathname === '/admin/audit') return 'Administration / Audit Logs';
    if (pathname === '/admin/settings') return 'Administration / System Settings';
    return 'FutureX Workspace';
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'FX';
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User';

  return (
    <div className="min-h-screen bg-white flex">
      {/* Global Command Palette / Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar (Desktop 216px / Mobile Drawer) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[216px] bg-white border-r border-[#E3E7EC] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-drawer' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Workspace Brand / Header */}
          <div className="h-[56px] px-4 border-b border-[#E3E7EC] flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-6 h-6 rounded-[7px] bg-[#2563EB] text-white flex items-center justify-center font-semibold text-[11px] shadow-none">
                FX
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs tracking-tight text-[#181B20] group-hover:text-[#2563EB] fx-transition">
                  FutureX
                </span>
                <span className="text-[10px] text-[#929AA3] leading-tight font-medium">
                  Game Operations
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-[#929AA3] hover:text-[#181B20] p-1 rounded-lg hover:bg-[#F7F8FA]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-4">
            <div>
              <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#929AA3] select-none">
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
                        'h-9 flex items-center justify-between px-2.5 rounded-[10px] text-[13px] fx-transition group relative',
                        isActive
                          ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold border-r-[2px] border-[#2563EB]'
                          : 'text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA]',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 fx-transition',
                            isActive ? 'text-[#2563EB]' : 'text-[#929AA3] group-hover:text-[#626A73]',
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-[#EEF4FF] text-[#2563EB] border border-[#2563EB]/20 text-[10px] font-semibold flex items-center justify-center shrink-0">
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
                <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#929AA3] select-none">
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
                          'h-9 flex items-center gap-2.5 px-2.5 rounded-[10px] text-[13px] fx-transition group relative',
                          isActive
                            ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold border-r-[2px] border-[#2563EB]'
                            : 'text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA]',
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 fx-transition',
                            isActive ? 'text-[#2563EB]' : 'text-[#929AA3] group-hover:text-[#626A73]',
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
          <div className="p-2.5 border-t border-[#E3E7EC] bg-white">
            <ProfilePopover>
              <button
                type="button"
                className="w-full flex items-center justify-between p-2 rounded-[10px] hover:bg-[#F7F8FA] fx-transition text-left group border border-transparent hover:border-[#E3E7EC]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#EEF4FF] text-[#2563EB] border border-[#BDE0FF] font-semibold text-[11px] flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#181B20] truncate">{fullName}</p>
                    <p className="text-[10px] text-[#929AA3] truncate capitalize">
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[216px]">
        {/* Top Bar (56px) */}
        <header className="h-[56px] bg-white border-b border-[#E3E7EC] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-[#626A73] hover:text-[#181B20] p-1.5 rounded-lg hover:bg-[#F7F8FA]"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-medium text-[#626A73] truncate hidden sm:inline">
              {getBreadcrumbs()}
            </span>
          </div>

          {/* Quick Search & Actions */}
          <div className="flex items-center gap-3">
            {/* Desktop Global Search trigger button (never routes on click) */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-72 h-9 px-3.5 bg-[#F7F8FA] text-[13px] text-[#929AA3] rounded-[11px] border border-[#E3E7EC] hover:border-[#D4DAE1] hover:bg-white flex items-center justify-between fx-transition focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-[#929AA3]" />
                  <span>Search tasks or projects...</span>
                </span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-[5px] bg-white text-[#626A73] border border-[#E3E7EC] shadow-none">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Mobile Search Icon Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA] rounded-[8px] fx-transition"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative p-2 text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA] rounded-[8px] fx-transition"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full ring-2 ring-white" />
              )}
            </Link>

            {/* Role-gated Quick Action: + New dropdown */}
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
                          label: 'New Project',
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
        <main className="flex-1 bg-white p-4 sm:p-6 lg:p-8">
          <div className={cn('mx-auto', fullWidth ? 'w-full' : 'max-w-[1400px]')}>
            {children}
          </div>
        </main>
      </div>

      {/* Global Command Palette Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
