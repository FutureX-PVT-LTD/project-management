import React, { Suspense } from 'react';
import { DashboardRouter } from '@/features/dashboard/DashboardRouter';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { AppShell } from '@/components/layout/AppShell';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <DashboardSkeleton />
        </AppShell>
      }
    >
      <DashboardRouter />
    </Suspense>
  );
}
