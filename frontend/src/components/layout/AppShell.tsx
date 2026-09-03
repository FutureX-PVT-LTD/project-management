'use client';

import React, { useState } from 'react';
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


  // Unread notifications count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications'),
    refetchInterval: 30000,
  });
  const unreadCount = (unreadData as any)?.unreadCount || 0;

  const isOwner = hasRole(UserRole.OWNER);
  const isAdmin = hasRole(UserRole.ADMIN);
  const canManage = isOwner || isAdmin;


  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Work', href: '/my-work', icon: CheckSquare },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
    ...(canManage ? [{ name: 'Team Capacity', href: '/team', icon: Users }] : []),
    { name: 'Timeline', href: '/timeline', icon: GanttChartSquare },
    ...(canManage ? [{ name: 'Reports', href: '/reports', icon: BarChart3 }] : []),
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount },
  ];

  const adminNav = [
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Workspace Settings', href: '/admin/settings', icon: Settings },
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
    <div className="min-h-screen bg-fx-bg flex">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        />
      )}


      {/* Sidebar (Desktop 228px / Mobile Drawer) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[228px] bg-white border-r border-fx-border flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-drawer' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Workspace Brand / Header */}
          <div className="h-[58px] px-4 border-b border-fx-border/70 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-md bg-fx-green text-white flex items-center justify-center font-bold text-xs shadow-none">
                FX
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs tracking-tight text-fx-text-primary group-hover:text-fx-green fx-transition">
                  FutureX
                </span>
                <span className="text-[10px] text-fx-text-muted leading-tight">
                  Game Studio Work
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-fx-text-muted hover:text-fx-text-primary p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fx-text-muted">
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
                        'h-[38px] flex items-center justify-between px-2.5 rounded-md text-[13px] font-medium fx-transition',
                        isActive
                          ? 'bg-fx-green-soft text-fx-green-dark font-semibold'
                          : 'text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-hover',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0',
                            isActive ? 'text-fx-green' : 'text-fx-text-muted',
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-fx-green text-white text-[10px] font-bold flex items-center justify-center shrink-0">
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
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fx-text-muted">
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
                          'h-[38px] flex items-center gap-2.5 px-2.5 rounded-md text-[13px] font-medium fx-transition',
                          isActive
                            ? 'bg-fx-green-soft text-fx-green-dark font-semibold'
                            : 'text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-hover',
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0',
                            isActive ? 'text-fx-green' : 'text-fx-text-muted',
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
          <div className="p-2.5 border-t border-fx-border/70 bg-white">
            <ProfilePopover>
              <button
                type="button"
                className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-fx-bg-hover fx-transition text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-fx-green-soft text-fx-green-dark border border-fx-green/20 font-semibold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-fx-text-primary truncate">{fullName}</p>
                    <p className="text-[11px] text-fx-text-muted truncate capitalize">
                      {(user?.jobTitle || (user as any)?.role || user?.globalRole || 'Team Member').toString().toLowerCase().replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <MoreVertical className="w-3.5 h-3.5 text-fx-text-muted group-hover:text-fx-text-primary shrink-0" />
              </button>
            </ProfilePopover>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[228px]">
        {/* Top Bar (58px) */}
        <header className="h-[58px] bg-white border-b border-fx-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-fx-text-secondary hover:text-fx-text-primary p-1.5 rounded-md hover:bg-fx-bg-hover"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-medium text-fx-text-secondary truncate hidden sm:inline">
              {getBreadcrumbs()}
            </span>
          </div>

          {/* Quick Search & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Global Search trigger (Ctrl+K ready) */}
            <div className="relative hidden md:block">
              <Link
                href="/my-work"
                className="w-64 h-8 px-2.5 bg-fx-bg text-xs text-fx-text-muted rounded-md border border-fx-border hover:border-fx-border-strong flex items-center justify-between fx-transition"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-fx-text-muted" />
                  <span>Search tasks or projects...</span>
                </span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-fx-text-secondary border border-fx-border/80">
                  ⌘K
                </kbd>
              </Link>
            </div>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative p-2 text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-hover rounded-md fx-transition"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-fx-green rounded-full ring-2 ring-white" />
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
                          icon: <CheckSquare className="w-3.5 h-3.5 text-fx-green" />,
                          onClick: () => onOpenCreateTask(),
                        },
                      ]
                    : []),
                  ...(onOpenCreateProject
                    ? [
                        {
                          label: 'New Project',
                          icon: <FolderKanban className="w-3.5 h-3.5 text-fx-green" />,
                          onClick: () => onOpenCreateProject(),
                        },
                      ]
                    : []),
                ]}
              />
            )}

          </div>
        </header>

        {/* Main Content Workspace Canvas */}
        <main
          className={cn(
            'flex-1 p-4 sm:p-6 lg:p-7',
            fullWidth ? 'max-w-full' : 'max-w-7xl mx-auto w-full',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
