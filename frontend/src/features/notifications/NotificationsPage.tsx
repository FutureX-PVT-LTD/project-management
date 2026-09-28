'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, cn } from '@/lib/utils';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filterUnread, setFilterUnread] = useState(false);

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications', filterUnread],
    queryFn: () => api.get('/notifications'),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const allNotifications = asArray<any>(notifData, 'notifications');
  const notifications = filterUnread
    ? allNotifications.filter((n) => !n.isRead)
    : allNotifications;

  return (
    <AppShell>
      <div className="space-y-6 w-full max-w-3xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E7EC] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#181B20]">
              Notifications
            </h1>
            <p className="text-xs text-[#626A73] mt-1">
              Prerequisite unlocks, status updates, and assignment alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFilterUnread(!filterUnread)}
            >
              {filterUnread ? 'Show All' : 'Unread Only'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={markAllAsReadMutation.isPending}
              onClick={() => markAllAsReadMutation.mutate()}
              leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
            >
              Mark all as read
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="bg-white border border-[#E3E7EC] rounded-[8px] p-10 text-center text-xs text-[#929AA3]">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-5 h-5 text-[#2563EB]" />}
            title="All caught up"
            description="You have no new alerts or notifications."
          />
        ) : (
          <div className="bg-white border border-[#E3E7EC] rounded-[8px] divide-y divide-[#E3E7EC] overflow-hidden shadow-none">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markAsReadMutation.mutate(n.id)}
                className={cn(
                  'p-3.5 hover:bg-[#F7F8FA] transition-colors flex items-start gap-3 text-xs cursor-pointer',
                  !n.isRead && 'bg-[#F6F9FF]',
                )}
              >
                <div className="mt-1 shrink-0">
                  {!n.isRead ? (
                    <span className="w-2 h-2 rounded-full bg-[#2563EB] block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-transparent block" />
                  )}
                </div>

                <div className="space-y-0.5 flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs font-semibold',
                      !n.isRead ? 'text-[#181B20]' : 'text-[#626A73]',
                    )}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-[#626A73] leading-relaxed">{n.message}</p>
                  <p className="text-[10.5px] text-[#929AA3] font-mono pt-0.5">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
