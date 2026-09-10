'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';

function LoginContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo');

  useEffect(() => {
    if (!isLoading && user) {
      if (returnTo && /^\/(?!\/)/.test(returnTo) && !/[\\\u0000-\u0020]/.test(returnTo)) {
        router.push(returnTo);
      } else if (user.globalRole === UserRole.TEAM_MEMBER) {
        router.push('/my-work');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router, returnTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]">
        <div className="h-6 w-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]">
          <div className="h-6 w-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
