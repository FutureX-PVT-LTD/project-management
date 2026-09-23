'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { FutureXLogo } from '@/components/branding/FutureXLogo';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-fx-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-pulse"><FutureXLogo size="sidebar" priority /></div>
        <p className="text-xs text-fx-text-muted">Loading FutureX workspace...</p>
      </div>
    </div>
  );
}
