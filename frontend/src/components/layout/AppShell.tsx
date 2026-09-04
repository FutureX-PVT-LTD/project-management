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
          'fixed inset-y-0 left-0 z-50 w-[216px] bg-white border-r border-[#E4E7EB] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-drawer' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Workspace Brand / Header */}
          <div className="h-[56px] px-4 border-b border-[#E4E7EB] flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-6 h-6 rounded-[7px] bg-[#0088FF] text-white flex items-center justify-center font-semibold text-[11px] shadow-none">
                FX
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs tracking-tight text-[#15171A] group-hover:text-[#0088FF] fx-transition">
                  FutureX
                </span>
                <span className="text-[10px] text-[#92979E] leading-tight font-medium">
                  Game Operations
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-[#92979E] hover:text-[#15171A] p-1 rounded-lg hover:bg-[#F8F9FB]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-4">
            <div>
              <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#92979E] select-none">
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
                          ? 'bg-[#EAF5FF] text-[#006CCB] font-semibold border-r-[2px] border-[#0088FF]'
                          : 'text-[#5F6368] hover:text-[#15171A] hover:bg-[#F8F9FB]',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 fx-transition',
                            isActive ? 'text-[#0088FF]' : 'text-[#92979E] group-hover:text-[#5F6368]',
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-[#0088FF] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
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
                <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#92979E] select-none">
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
                            ? 'bg-[#EAF5FF] text-[#006CCB] font-semibold border-r-[2px] border-[#0088FF]'
                            : 'text-[#5F6368] hover:text-[#15171A] hover:bg-[#F8F9FB]',
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 fx-transition',
                            isActive ? 'text-[#0088FF]' : 'text-[#92979E] group-hover:text-[#5F6368]',
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
          <div className="p-2.5 border-t border-[#E4E7EB] bg-white">
            <ProfilePopover>
              <button
                type="button"
                className="w-full flex items-center justify-between p-2 rounded-[10px] hover:bg-[#F8F9FB] fx-transition text-left group border border-transparent hover:border-[#E4E7EB]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#EAF5FF] text-[#0077E6] border border-[#BDE0FF] font-semibold text-[11px] flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#15171A] truncate">{fullName}</p>
                    <p className="text-[10px] text-[#92979E] truncate capitalize">
                      {(user?.jobTitle || (user as any)?.role || user?.globalRole || 'Team Member').toString().toLowerCase().replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <MoreVertical className="w-3.5 h-3.5 text-[#92979E] group-hover:text-[#15171A] shrink-0" />
              </button>
            </ProfilePopover>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[216px]">
        {/* Top Bar (56px) */}
        <header className="h-[56px] bg-white border-b border-[#E4E7EB] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-[#5F6368] hover:text-[#15171A] p-1.5 rounded-lg hover:bg-[#F8F9FB]"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-medium text-[#5F6368] truncate hidden sm:inline">
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
                className="w-72 h-9 px-3.5 bg-[#F8F9FB] text-[13px] text-[#92979E] rounded-[11px] border border-[#E4E7EB] hover:border-[#D8DDE3] hover:bg-white flex items-center justify-between fx-transition focus:outline-none focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-[#92979E]" />
                  <span>Search tasks or projects...</span>
                </span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-[5px] bg-white text-[#5F6368] border border-[#E4E7EB] shadow-none">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Mobile Search Icon Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 text-[#5F6368] hover:text-[#15171A] hover:bg-[#F8F9FB] rounded-[8px] fx-transition"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative p-2 text-[#5F6368] hover:text-[#15171A] hover:bg-[#F8F9FB] rounded-[8px] fx-transition"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0088FF] rounded-full ring-2 ring-white" />
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
                          icon: <CheckSquare className="w-3.5 h-3.5 text-[#0088FF]" />,
                          onClick: () => onOpenCreateTask(),
                        },
                      ]
                    : []),
                  ...(onOpenCreateProject
                    ? [
                        {
                          label: 'New Project',
                          icon: <FolderKanban className="w-3.5 h-3.5 text-[#0088FF]" />,
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
