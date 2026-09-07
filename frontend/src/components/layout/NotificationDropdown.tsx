'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell, Check, ExternalLink, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatTimeAgo } from '@/lib/utils';
import * as Popover from '@radix-ui/react-popover';
import { useAuth } from '@/features/auth/AuthContext';

export function NotificationDropdown() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
    staleTime: 15000,
    refetchInterval: 30000,
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previousData = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;
        const currentNotifications = old.notifications || [];
        const updated = currentNotifications.map((n: any) =>
          n.id === id ? { ...n, isRead: true } : n,
        );
        const newUnread = Math.max((old.unreadCount || 0) - 1, 0);
        return { ...old, notifications: updated, unreadCount: newUnread };
      });
      return { previousData };
    },
    onError: (_err, _id, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(['notifications'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previousData = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;
        const currentNotifications = old.notifications || [];
        const updated = currentNotifications.map((n: any) => ({ ...n, isRead: true }));
        return { ...old, notifications: updated, unreadCount: 0 };
      });
      return { previousData };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(['notifications'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleItemClick = (n: any) => {
    if (!n.isRead) {
      markReadMutation.mutate(n.id);
    }
    if (n.linkUrl) {
      router.push(n.linkUrl);
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="relative p-2 text-fx-text-secondary hover:text-fx-text-primary hover:bg-gray-100 rounded-md fx-transition focus:outline-none"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[9px] font-semibold text-white leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 sm:w-96 rounded-lg bg-white p-0 shadow-popover border border-fx-border focus:outline-none animate-fadeIn"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-fx-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-fx-text-primary">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-[#EEF4FF] text-[#2563EB] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-fx-border/50">
            {isLoading && (
              <div className="p-6 text-center text-xs text-fx-text-muted">Loading notifications...</div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-fx-text-secondary">All caught up!</p>
                <p className="text-xs text-fx-text-muted mt-0.5">No notifications at the moment.</p>
              </div>
            )}

            {notifications.slice(0, 10).map((n: any) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3.5 hover:bg-fx-bg/70 cursor-pointer fx-transition text-xs flex gap-3 ${
                  !n.isRead ? 'bg-[#EEF4FF]/50' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-fx-text-primary">{n.title}</p>
                    <span className="text-[11px] text-fx-text-muted shrink-0">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-fx-text-secondary mt-1 line-clamp-2">{n.message}</p>
                </div>
                {!n.isRead && (
                  <span className="h-2 w-2 rounded-full bg-[#2563EB] mt-1 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-fx-border text-center bg-gray-50/50 rounded-b-lg">
            <button
              onClick={() => router.push('/notifications')}
              className="text-xs text-fx-text-secondary hover:text-fx-text-primary font-medium"
            >
              View all notifications
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
