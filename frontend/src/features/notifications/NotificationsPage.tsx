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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Prerequisite unlocks, status updates, and assignment alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
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
          <div className="bg-white border border-fx-border rounded-[8px] p-10 text-center text-xs text-fx-text-muted shadow-none">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-6 h-6 text-[#315F7D]" />}
            title="All caught up"
            description="You have no new alerts or notifications."
          />
        ) : (
          <div className="bg-white border border-fx-border rounded-[8px] divide-y divide-fx-border/60 overflow-hidden shadow-none">

            {notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markAsReadMutation.mutate(n.id)}
                className={cn(
                  'p-4 hover:bg-fx-bg-hover fx-transition flex items-start gap-3 text-xs cursor-pointer',
                  !n.isRead && 'bg-[#EDF4F8]/40',
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {!n.isRead ? (
                    <span className="w-2 h-2 rounded-full bg-[#315F7D] block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-transparent block" />
                  )}
                </div>

                <div className="space-y-0.5 flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs font-semibold',
                      !n.isRead ? 'text-fx-text-primary' : 'text-fx-text-secondary',
                    )}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-fx-text-secondary leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-fx-text-muted pt-1">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
