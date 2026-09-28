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
          className="relative p-1.5 text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA] rounded-[6px] transition-colors focus:outline-none"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[9px] font-semibold text-white leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 sm:w-96 rounded-[10px] bg-white p-0 shadow-lg border border-[#E3E7EC] focus:outline-none animate-fadeIn"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E3E7EC]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#181B20]">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-[#EEF4FF] text-[#2563EB] font-semibold px-2 py-0.5 rounded-[4px]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#E3E7EC]">
            {isLoading && (
              <div className="p-6 text-center text-xs text-[#929AA3]">Loading notifications...</div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-[#181B20]">All caught up</p>
                <p className="text-xs text-[#929AA3] mt-0.5">No notifications at the moment.</p>
              </div>
            )}

            {notifications.slice(0, 10).map((n: any) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3.5 hover:bg-[#F7F8FA] cursor-pointer transition-colors text-xs flex gap-3 ${
                  !n.isRead ? 'bg-[#F6F9FF]' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#181B20] truncate">{n.title}</p>
                    <span className="text-[10.5px] font-mono text-[#929AA3] shrink-0">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-[#626A73] mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                </div>
                {!n.isRead && (
                  <span className="h-2 w-2 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="p-2.5 border-t border-[#E3E7EC] text-center bg-[#F7F8FA] rounded-b-[10px]">
            <button
              onClick={() => router.push('/notifications')}
              className="text-xs text-[#626A73] hover:text-[#181B20] font-medium transition-colors"
            >
              View all notifications →
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
