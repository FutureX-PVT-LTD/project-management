'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Clock, Inbox, AlertCircle, Info } from 'lucide-react';
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
      <div className="space-y-5 max-w-3xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EBEF] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
              Notifications
            </h1>
            <p className="text-xs text-[#60666F] mt-1">
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
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-10 text-center text-xs text-[#8C939E]">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-5 h-5 text-[#2463EB]" />}
            title="All caught up"
            description="You have no new alerts or notifications."
          />
        ) : (
          <div className="bg-white border border-[#E8EBEF] rounded-[10px] divide-y divide-[#E8EBEF] overflow-hidden">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markAsReadMutation.mutate(n.id)}
                className={cn(
                  'p-3.5 hover:bg-[#F8F9FB] transition-colors flex items-start gap-3 text-xs cursor-pointer',
                  !n.isRead && 'bg-[#F8FAFF]',
                )}
              >
                <div className="mt-1 shrink-0">
                  {!n.isRead ? (
                    <span className="w-2 h-2 rounded-full bg-[#2463EB] block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-transparent block" />
                  )}
                </div>

                <div className="space-y-0.5 flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs font-medium',
                      !n.isRead ? 'text-[#17191C]' : 'text-[#60666F]',
                    )}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-[#60666F] leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-[#8C939E] font-mono pt-0.5">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
