import React, { Suspense } from 'react';
import { ProjectDetailsPage } from '@/features/projects/ProjectDetailsPage';
import { ProjectDetailSkeleton } from '@/components/ui/Skeleton';
import { AppShell } from '@/components/layout/AppShell';

export default function Page() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <ProjectDetailSkeleton />
        </AppShell>
      }
    >
      <ProjectDetailsPage />
    </Suspense>
  );
}
