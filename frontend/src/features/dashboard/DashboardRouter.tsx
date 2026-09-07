'use client';

import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';
import { TeamMemberDashboard } from './TeamMemberDashboard';
import { PMDashboard } from './PMDashboard';
import { OwnerDashboard } from './OwnerDashboard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { AppShell } from '@/components/layout/AppShell';

export function DashboardRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppShell>
        <DashboardSkeleton />
      </AppShell>
    );
  }

  const renderDashboard = () => {
    if (!user) return null;

    if (user.globalRole === UserRole.OWNER) {
      return <OwnerDashboard />;
    }
    if (user.globalRole === UserRole.ADMIN) {
      return <PMDashboard />;
    }
    return <TeamMemberDashboard />;
  };

  return (
    <AppShell>
      {renderDashboard()}
    </AppShell>
  );
}
