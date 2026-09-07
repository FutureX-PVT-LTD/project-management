'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  FolderKanban,
  CheckSquare,
  Users,
  ArrowRight,
  X,
  CornerDownLeft,
  Calendar,
  LayoutDashboard,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { StatusPill } from '@/components/ui/StatusPill';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { getInitials, cn } from '@/lib/utils';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global ESC and Cmd/Ctrl+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch search results from backend
  const { data: searchData, isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(query.trim())}`),
    enabled: isOpen && query.trim().length > 0,
    staleTime: 5000,
  });

  const projects = (searchData as any)?.projects || [];
  const tasks = (searchData as any)?.tasks || [];
  const users = (searchData as any)?.users || [];

  // Flatten searchable list for keyboard up/down navigation
  const flatItems = useMemo(() => {
    if (!query.trim()) {
      return [
        { type: 'quick', title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { type: 'quick', title: 'Projects Directory', href: '/projects', icon: FolderKanban },
        { type: 'quick', title: 'My Work', href: '/my-work', icon: CheckSquare },
        { type: 'quick', title: 'Project Calendar', href: '/calendar', icon: Calendar },
        { type: 'quick', title: 'Team Capacity', href: '/team', icon: Users },
      ];
    }

    const items: any[] = [];
    projects.forEach((p: any) => items.push({ type: 'project', data: p }));
    tasks.forEach((t: any) => items.push({ type: 'task', data: t }));
    users.forEach((u: any) => items.push({ type: 'user', data: u }));
    return items;
  }, [query, projects, tasks, users]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item: any) => {
    if (!item) return;

    if (item.type === 'quick') {
      router.push(item.href);
    } else if (item.type === 'project') {
      router.push(`/projects/${item.data.id}`);
    } else if (item.type === 'task') {
      router.push(`/projects/${item.data.projectId}?taskId=${item.data.id}`);
    } else if (item.type === 'user') {
      router.push('/team');
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (flatItems.length > 0 ? (prev + 1) % flatItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (flatItems.length > 0 ? (prev - 1 + flatItems.length) % flatItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleSelect(flatItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/25 backdrop-blur-[2px] fx-transition animate-fadeIn"
      />

      {/* Floating Dialog Container */}
      <div className="min-h-full flex items-start justify-center pt-16 sm:pt-24 px-4 pb-8">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-white rounded-[18px] border border-[#E3E7EC] shadow-[0_10px_30px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col fx-transition animate-fadeIn"
        >
          {/* Search Header Bar */}
          <div className="relative border-b border-[#E3E7EC] flex items-center px-4">
            <Search className="w-4 h-4 text-[#929AA3] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search projects, tasks, or team members..."
              className="w-full h-13 pl-3 pr-20 text-[14px] text-[#181B20] placeholder:text-[#929AA3] bg-transparent outline-none font-medium"
            />

            <div className="absolute right-4 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-[#929AA3] hover:text-[#181B20] rounded-[5px] fx-transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-[5px] bg-[#F2F4F7] text-[#626A73] border border-[#E3E7EC]">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results Area */}
          <div className="max-h-[380px] overflow-y-auto p-2 divide-y-0">
            {isLoading ? (
              <div className="py-10 text-center text-xs text-[#929AA3]">
                Searching workspace...
              </div>
            ) : !query.trim() ? (
              /* Quick Navigation Suggestions */
              <div className="space-y-1">
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#929AA3]">
                  Quick Navigation
                </p>
                {flatItems.map((item: any, idx: number) => {
                  const Icon = item.icon;
                  const isSelected = selectedIndex === idx;
                  return (
                    <div
                      key={item.href}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'px-3 py-2.5 rounded-[10px] flex items-center justify-between cursor-pointer fx-transition text-xs',
                        isSelected ? 'bg-[#EEF4FF] text-[#2563EB]' : 'hover:bg-[#F7F8FA] text-[#181B20]',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('w-4 h-4', isSelected ? 'text-[#2563EB]' : 'text-[#929AA3]')} />
                        <span className="font-medium text-[13px]">{item.title}</span>
                      </div>
                      <ArrowRight className={cn('w-3.5 h-3.5', isSelected ? 'text-[#2563EB]' : 'text-[#929AA3]')} />
                    </div>
                  );
                })}
              </div>
            ) : flatItems.length === 0 ? (
              <div className="py-12 text-center space-y-1">
                <p className="text-sm font-semibold text-[#181B20]">No results found</p>
                <p className="text-xs text-[#626A73]">
                  No projects, tasks, or people matched "{query}".
                </p>
              </div>
            ) : (
              /* Grouped Results */
              <div className="space-y-3">
                {/* Projects Section */}
                {projects.length > 0 && (
                  <div>
                    <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#929AA3]">
                      Projects ({projects.length})
                    </p>
                    <div className="space-y-0.5">
                      {projects.map((p: any) => {
                        const itemIdx = flatItems.findIndex((it) => it.type === 'project' && it.data.id === p.id);
                        const isSelected = selectedIndex === itemIdx;

                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelect({ type: 'project', data: p })}
                            onMouseEnter={() => setSelectedIndex(itemIdx)}
                            className={cn(
                              'px-3 py-2 rounded-[10px] flex items-center justify-between cursor-pointer fx-transition text-xs',
                              isSelected ? 'bg-[#EEF4FF] text-[#2563EB]' : 'hover:bg-[#F7F8FA] text-[#181B20]',
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FolderKanban className={cn('w-4 h-4 shrink-0', isSelected ? 'text-[#2563EB]' : 'text-[#929AA3]')} />
                              <div className="truncate">
                                <span className="font-semibold text-[13px]">{p.name}</span>
                                <span className="ml-2 font-mono text-[11px] text-[#929AA3]">{p.key}</span>
                              </div>
                            </div>
                            <HealthBadge health={p.health} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tasks Section */}
                {tasks.length > 0 && (
                  <div>
                    <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#929AA3]">
                      Tasks ({tasks.length})
                    </p>
                    <div className="space-y-0.5">
                      {tasks.map((t: any) => {
                        const itemIdx = flatItems.findIndex((it) => it.type === 'task' && it.data.id === t.id);
                        const isSelected = selectedIndex === itemIdx;

                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelect({ type: 'task', data: t })}
                            onMouseEnter={() => setSelectedIndex(itemIdx)}
                            className={cn(
                              'px-3 py-2 rounded-[10px] flex items-center justify-between cursor-pointer fx-transition text-xs',
                              isSelected ? 'bg-[#EEF4FF] text-[#2563EB]' : 'hover:bg-[#F7F8FA] text-[#181B20]',
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <CheckSquare className={cn('w-4 h-4 shrink-0', isSelected ? 'text-[#2563EB]' : 'text-[#929AA3]')} />
                              <div className="truncate min-w-0">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-mono text-[11px] font-semibold text-[#626A73]">{t.humanId}</span>
                                  <span className="font-semibold text-[13px] truncate">{t.title}</span>
                                </div>
                                <p className="text-[11px] text-[#929AA3] truncate">{t.projectName}</p>
                              </div>
                            </div>
                            <div className="shrink-0 ml-2">
                              <StatusPill status={t.status} size="xs" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Users Section */}
                {users.length > 0 && (
                  <div>
                    <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#929AA3]">
                      Team Members ({users.length})
                    </p>
                    <div className="space-y-0.5">
                      {users.map((u: any) => {
                        const itemIdx = flatItems.findIndex((it) => it.type === 'user' && it.data.id === u.id);
                        const isSelected = selectedIndex === itemIdx;

                        return (
                          <div
                            key={u.id}
                            onClick={() => handleSelect({ type: 'user', data: u })}
                            onMouseEnter={() => setSelectedIndex(itemIdx)}
                            className={cn(
                              'px-3 py-2 rounded-[10px] flex items-center justify-between cursor-pointer fx-transition text-xs',
                              isSelected ? 'bg-[#EEF4FF] text-[#2563EB]' : 'hover:bg-[#F7F8FA] text-[#181B20]',
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-[#EEF4FF] text-[#2563EB] text-[10px] font-semibold flex items-center justify-center shrink-0">
                                {getInitials(u.firstName, u.lastName)}
                              </div>
                              <div className="truncate">
                                <span className="font-semibold text-[13px]">{u.firstName} {u.lastName}</span>
                                <span className="ml-2 text-[11px] text-[#929AA3]">{u.jobTitle || 'Team Member'}</span>
                              </div>
                            </div>
                            <span className="text-[11px] text-[#2563EB] font-medium">Profile →</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Keyboard Hints */}
          <div className="px-4 py-2.5 bg-[#F7F8FA] border-t border-[#E3E7EC] flex items-center justify-between text-[11px] text-[#929AA3]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="font-mono px-1 py-0.2 rounded bg-white border border-[#E3E7EC] text-[10px]">↑</kbd>
                <kbd className="font-mono px-1 py-0.2 rounded bg-white border border-[#E3E7EC] text-[10px]">↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono px-1 py-0.2 rounded bg-white border border-[#E3E7EC] text-[10px]">↵</kbd>
                <span>select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono px-1 py-0.2 rounded bg-white border border-[#E3E7EC] text-[10px]">esc</kbd>
                <span>close</span>
              </span>
            </div>
            <span className="text-[10px] font-medium text-[#626A73]">
              FutureX Global Command
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
