'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';

function LoginContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.globalRole === UserRole.TEAM_MEMBER) {
        router.push('/my-work');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-6 w-6 border-2 border-fx-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between items-center px-4 py-8 sm:py-12 bg-fx-bg">
      <div className="w-full" />
      <main className="w-full flex justify-center items-center my-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <div className="h-6 w-6 border-2 border-fx-green border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <LoginContent />
        </Suspense>
      </main>
      <footer className="mt-8 text-center text-xs text-fx-text-muted select-none">
        © 2026 FutureX (Pvt) Ltd.
      </footer>
    </div>
  );
}
