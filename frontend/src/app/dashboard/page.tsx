'use client';

import React, { Suspense } from 'react';
import { DashboardRouter } from '@/features/dashboard/DashboardRouter';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-fx-bg">
          <div className="h-7 w-7 border-2 border-[#315F7D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardRouter />
    </Suspense>
  );
}
