'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  ListTodo,
  Users,
  Calendar,
  BarChart3,
  Bell,
  ShieldCheck,
  FileText,
  Settings,
  Search,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationDropdown } from './NotificationDropdown';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  onOpenCreateTask?: () => void;
  onOpenCreateProject?: () => void;
}

export function AppShell({
  children,
  onOpenCreateTask,
  onOpenCreateProject,
}: AppShellProps) {
  const { user, logout, hasRole } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const workspaceNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Work', href: '/my-work', icon: CheckSquare },
    { label: 'Projects', href: '/projects', icon: FolderKanban },
    { label: 'Tasks', href: '/tasks', icon: ListTodo },
  ];

  const planningNavItems = [
    { label: 'Timeline', href: '/timeline', icon: Calendar },
    { label: 'Team', href: '/team', icon: Users },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  const systemNavItems = [
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ];

  const adminNavItems = [
    { label: 'User Management', href: '/admin/users', icon: ShieldCheck },
    { label: 'Audit Logs', href: '/admin/audit', icon: FileText },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const isAdminOrOwner = hasRole(UserRole.OWNER, UserRole.ADMIN);
  const canCreate = hasRole(UserRole.OWNER, UserRole.ADMIN, UserRole.PROJECT_MANAGER);

  const getBreadcrumbs = () => {
    if (pathname.startsWith('/dashboard')) return { section: 'Workspace', page: 'Dashboard' };
    if (pathname.startsWith('/my-work')) return { section: 'Workspace', page: 'My Work' };
    if (pathname.startsWith('/projects/')) return { section: 'Projects', page: 'Details' };
    if (pathname.startsWith('/projects')) return { section: 'Workspace', page: 'Projects' };
    if (pathname.startsWith('/tasks')) return { section: 'Workspace', page: 'Tasks' };
    if (pathname.startsWith('/team')) return { section: 'Planning', page: 'Team & Workload' };
    if (pathname.startsWith('/timeline')) return { section: 'Planning', page: 'Timeline' };
    if (pathname.startsWith('/reports')) return { section: 'Planning', page: 'Reports' };
    if (pathname.startsWith('/notifications')) return { section: 'System', page: 'Notifications' };
    if (pathname.startsWith('/admin/users')) return { section: 'Admin', page: 'Users' };
    if (pathname.startsWith('/admin/audit')) return { section: 'Admin', page: 'Audit Logs' };
    if (pathname.startsWith('/admin/settings')) return { section: 'Admin', page: 'Settings' };
    return { section: 'FutureX', page: 'Project Hub' };
  };

  const breadcrumb = getBreadcrumbs();

  const renderNavGroup = (items: typeof workspaceNavItems) => (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium fx-transition group select-none',
              isActive
                ? 'bg-fx-green-50 text-fx-green-900 font-semibold'
                : 'text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-subtle',
              isCollapsed && 'justify-center px-2',
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon
              className={cn(
                'w-[18px] h-[18px] shrink-0',
                isActive
                  ? 'text-fx-green-700'
                  : 'text-fx-text-muted group-hover:text-fx-text-secondary',
              )}
              strokeWidth={1.75}
            />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-fx-bg-app text-fx-text-primary">
      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Desktop Sidebar (240px) */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-white border-r border-fx-border fx-transition z-30 select-none shrink-0 sticky top-0 h-screen',
          isCollapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-fx-border">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-7 w-7 rounded-md bg-fx-green-700 text-white flex items-center justify-center font-bold text-xs tracking-tight shrink-0 shadow-subtle">
              FX
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-[15px] tracking-tight text-fx-text-primary leading-tight">
                  Future<span className="text-fx-green-700">X</span>
                </span>
                <span className="text-[10px] text-fx-text-muted font-medium tracking-wide">
                  PROJECT HUB
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-fx-text-muted hover:text-fx-text-primary rounded-md hover:bg-gray-100 hidden lg:block"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-5">
          {/* Workspace */}
          <div>
            {!isCollapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-fx-text-muted">
                Workspace
              </div>
            )}
            {renderNavGroup(workspaceNavItems)}
          </div>

          {/* Planning */}
          <div>
            {!isCollapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-fx-text-muted">
                Planning
              </div>
            )}
            {renderNavGroup(planningNavItems)}
          </div>

          {/* System */}
          <div>
            {!isCollapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-fx-text-muted">
                System
              </div>
            )}
            {renderNavGroup(systemNavItems)}
          </div>

          {/* Admin Navigation Section */}
          {isAdminOrOwner && (
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-fx-text-muted">
                  Administration
                </div>
              )}
              {renderNavGroup(adminNavItems)}
            </div>
          )}
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="p-3 border-t border-fx-border bg-white">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={cn(
                  'w-full flex items-center gap-2.5 p-1.5 rounded-md hover:bg-fx-bg-subtle fx-transition text-left focus:outline-none',
                  isCollapsed ? 'justify-center' : '',
                )}
              >
                <Avatar
                  src={user?.avatarUrl}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  size={isCollapsed ? 'sm' : 'md'}
                />
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-fx-text-primary truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-[11px] text-fx-text-muted truncate">
                      {user?.jobTitle || user?.globalRole?.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={8}
                className="z-50 w-56 rounded-md bg-white p-1.5 shadow-popover border border-fx-border text-xs focus:outline-none animate-fadeIn"
              >
                <div className="px-2.5 py-2 border-b border-fx-border mb-1">
                  <p className="font-semibold text-fx-text-primary text-sm">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-fx-text-muted text-[11px] truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] uppercase font-bold bg-fx-green-50 text-fx-green-900 px-1.5 py-0.5 rounded-[4px]">
                    {user?.globalRole?.replace('_', ' ')}
                  </span>
                </div>

                {isAdminOrOwner && (
                  <DropdownMenu.Item
                    onClick={() => router.push('/admin/settings')}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-fx-bg text-fx-text-secondary hover:text-fx-text-primary cursor-pointer text-xs focus:outline-none"
                  >
                    <Settings className="w-3.5 h-3.5" /> Workspace Settings
                  </DropdownMenu.Item>
                )}

                <div className="border-t border-fx-border my-1" />

                <DropdownMenu.Item
                  onClick={logout}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-red-50 text-fx-semantic-danger cursor-pointer text-xs font-medium focus:outline-none"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Global Top Bar (64px) */}
        <header className="h-16 bg-white border-b border-fx-border px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md text-fx-text-secondary hover:text-fx-text-primary md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Context */}
            <div className="flex items-center gap-1.5 text-xs text-fx-text-muted">
              <span className="hidden sm:inline font-medium">{breadcrumb.section}</span>
              <span className="hidden sm:inline">/</span>
              <h1 className="text-sm sm:text-base font-bold text-fx-text-primary tracking-tight">
                {breadcrumb.page}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-fx-text-muted bg-fx-bg-subtle border border-fx-border rounded-md hover:border-fx-border-strong fx-transition focus:outline-none w-36 sm:w-72 justify-between"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Search className="w-3.5 h-3.5 text-fx-text-muted shrink-0" />
                <span className="hidden sm:inline">Search projects, tasks or people…</span>
                <span className="sm:hidden">Search…</span>
              </span>
              <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-fx-border">
                ⌘K
              </kbd>
            </button>

            {/* Notifications Bell */}
            <NotificationDropdown />

            {/* Role-Gated Quick Actions Dropdown */}
            {canCreate && (onOpenCreateTask || onOpenCreateProject) && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button size="sm" variant="primary" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New</span>
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    className="z-50 min-w-44 rounded-md bg-white p-1 shadow-popover border border-fx-border text-xs focus:outline-none animate-fadeIn"
                  >
                    {onOpenCreateTask && (
                      <DropdownMenu.Item
                        onClick={onOpenCreateTask}
                        className="flex items-center gap-2 px-2.5 py-2 rounded hover:bg-fx-bg-subtle cursor-pointer text-fx-text-primary font-medium focus:outline-none"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-fx-green-700" /> New Task
                      </DropdownMenu.Item>
                    )}
                    {onOpenCreateProject && (
                      <DropdownMenu.Item
                        onClick={onOpenCreateProject}
                        className="flex items-center gap-2 px-2.5 py-2 rounded hover:bg-fx-bg-subtle cursor-pointer text-fx-text-primary font-medium focus:outline-none"
                      >
                        <FolderKanban className="w-3.5 h-3.5 text-fx-green-700" /> New Project
                      </DropdownMenu.Item>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}

            {/* User Profile Avatar */}
            <Avatar
              src={user?.avatarUrl}
              firstName={user?.firstName}
              lastName={user?.lastName}
              size="sm"
            />
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-black/40 backdrop-blur-[1px]">
            <div className="fixed inset-y-0 left-0 w-64 bg-white p-4 flex flex-col justify-between shadow-popover">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-fx-border">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-fx-green-700 text-white flex items-center justify-center font-bold text-xs">
                      FX
                    </div>
                    <span className="font-bold text-base text-fx-text-primary">FutureX</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-fx-text-muted hover:text-fx-text-primary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-fx-text-muted">
                      Workspace
                    </div>
                    {workspaceNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                            isActive
                              ? 'bg-fx-green-50 text-fx-green-900 font-semibold'
                              : 'text-fx-text-secondary hover:bg-fx-bg-subtle',
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div>
                    <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-fx-text-muted">
                      Planning
                    </div>
                    {planningNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                            isActive
                              ? 'bg-fx-green-50 text-fx-green-900 font-semibold'
                              : 'text-fx-text-secondary hover:bg-fx-bg-subtle',
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {isAdminOrOwner && (
                    <div>
                      <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-fx-text-muted">
                        Administration
                      </div>
                      {adminNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                              isActive
                                ? 'bg-fx-green-50 text-fx-green-900 font-semibold'
                                : 'text-fx-text-secondary hover:bg-fx-bg-subtle',
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-fx-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar
                    src={user?.avatarUrl}
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                    size="sm"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-fx-text-primary">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-fx-text-muted">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-fx-semantic-danger hover:bg-red-50 rounded"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1520px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
