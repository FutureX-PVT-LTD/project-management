'use client';

import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';
import { TeamMemberDashboard } from './TeamMemberDashboard';
import { PMDashboard } from './PMDashboard';
import { OwnerDashboard } from './OwnerDashboard';
import { AppShell } from '@/components/layout/AppShell';

export function DashboardRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-fx-text-muted font-medium">Loading your workspace...</p>
        </div>
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
