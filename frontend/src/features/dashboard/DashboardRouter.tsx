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
        <div className="flex items-center justify-center p-24">
          <div className="h-7 w-7 border-2 border-fx-green border-t-transparent rounded-full animate-spin" />
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
