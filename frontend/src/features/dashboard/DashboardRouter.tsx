'use client';

import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';
import { TeamMemberDashboard } from './TeamMemberDashboard';
import { PMDashboard } from './PMDashboard';
import { OwnerDashboard } from './OwnerDashboard';
import { AppShell } from '@/components/layout/AppShell';
import { TaskCreateModal } from '@/features/tasks/TaskCreateModal';
import { CreateProjectModal } from '@/features/projects/CreateProjectModal';

export function DashboardRouter() {
  const { user } = useAuth();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const renderDashboard = () => {
    if (!user) return null;

    if (user.globalRole === UserRole.OWNER) {
      return <OwnerDashboard />;
    }
    if (user.globalRole === UserRole.ADMIN) {
      return <OwnerDashboard />;
    }
    if (user.globalRole === UserRole.PROJECT_MANAGER) {
      return <PMDashboard />;
    }
    return <TeamMemberDashboard />;
  };

  const canCreate =
    user?.globalRole === UserRole.OWNER ||
    user?.globalRole === UserRole.ADMIN ||
    user?.globalRole === UserRole.PROJECT_MANAGER;

  return (
    <AppShell
      onOpenCreateTask={canCreate ? () => setCreateTaskOpen(true) : undefined}
      onOpenCreateProject={canCreate ? () => setCreateProjectOpen(true) : undefined}
    >
      {canCreate && (
        <>
          <TaskCreateModal open={createTaskOpen} onOpenChange={setCreateTaskOpen} />
          <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
        </>
      )}
      {renderDashboard()}
    </AppShell>
  );
}
