import React, { Suspense } from 'react';
import { ProjectsListPage } from '@/features/projects/ProjectsListPage';
import { ProjectsListSkeleton } from '@/components/ui/Skeleton';
import { AppShell } from '@/components/layout/AppShell';

export default function Page() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <ProjectsListSkeleton />
        </AppShell>
      }
    >
      <ProjectsListPage />
    </Suspense>
  );
}
