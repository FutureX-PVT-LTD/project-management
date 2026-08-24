'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/layout/AppShell';
import { formatTimeAgo, cn } from '@/lib/utils';

export function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const allNotifications = (data?.notifications as any[]) || [];
  const unreadCount = data?.unreadCount || 0;

  const filtered = allNotifications.filter((n: any) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const handleItemClick = (n: any) => {
    if (!n.isRead) {
      markReadMutation.mutate(n.id);
    }
    if (n.linkUrl) {
      router.push(n.linkUrl);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-fx-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
                Notification Center
              </h1>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-fx-green-50 text-fx-green-900 font-semibold border border-fx-green-100">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
              Task assignments, prerequisite completions, and project alerts.
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => markAllReadMutation.mutate()}
              isLoading={markAllReadMutation.isPending}
              className="gap-1.5"
            >
              <CheckCheck className="w-4 h-4 text-fx-green-700" /> Mark All as Read
            </Button>
          )}
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-md font-medium fx-transition select-none text-xs',
              filter === 'all'
                ? 'bg-fx-green-50 text-fx-green-900 font-semibold shadow-subtle'
                : 'text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-subtle',
            )}
          >
            All ({allNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'px-3.5 py-1.5 rounded-md font-medium fx-transition select-none text-xs',
              filter === 'unread'
                ? 'bg-fx-green-50 text-fx-green-900 font-semibold shadow-subtle'
                : 'text-fx-text-secondary hover:text-fx-text-primary hover:bg-fx-bg-subtle',
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <Card padding="none" className="bg-white">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-fx-text-muted">
              Loading notifications...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-5 h-5 text-fx-green-700" />}
              title="You're all caught up"
              description="No unread notifications at the moment."
            />
          ) : (
            <div className="divide-y divide-fx-border/60">
              {filtered.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    'p-4 hover:bg-fx-bg-subtle cursor-pointer fx-transition flex items-start gap-3.5 text-xs',
                    !n.isRead && 'bg-fx-green-50/20 font-medium',
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-full mt-0.5 shrink-0',
                      !n.isRead
                        ? 'bg-fx-green-50 text-fx-green-700 border border-fx-green-100'
                        : 'bg-fx-bg-subtle text-fx-text-muted border border-fx-border',
                    )}
                  >
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-fx-text-primary text-[13px]">
                        {n.title}
                      </h3>
                      <span className="text-[11px] text-fx-text-muted shrink-0 font-mono">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-fx-text-secondary mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
