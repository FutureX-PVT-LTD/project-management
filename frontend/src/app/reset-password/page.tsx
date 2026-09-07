'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api/api-client';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Password reset token is missing. Please request a new reset link.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(
        err?.message || 'Password reset link is invalid or has expired. Please request a new link.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-[420px] bg-white rounded-[8px] border border-fx-border p-8 shadow-sm text-center">
        <div className="h-11 w-11 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3.5">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-fx-text-primary">Invalid Reset Link</h1>
        <p className="text-xs text-fx-text-secondary mt-1.5 mb-6">
          No password reset token was provided or the link has expired.
        </p>
        <Link
          href="/forgot-password"
          className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg transition duration-150 flex items-center justify-center"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] bg-white rounded-[8px] border border-fx-border p-8 shadow-sm">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-7">
        <div className="h-11 w-11 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold text-lg mb-3.5 shadow-sm">
          <svg
            className="w-6 h-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <h1 className="text-[22px] font-bold text-fx-text-primary tracking-tight">
          Create New Password
        </h1>
        <p className="text-sm text-fx-text-secondary mt-1.5 font-normal">
          Choose a secure password for your workspace account.
        </p>
      </div>

      {isSuccess ? (
        <div className="text-center py-2 space-y-4">
          <div className="h-12 w-12 rounded-full bg-[#EDF8F2] text-[#237A57] flex items-center justify-center mx-auto border border-[#EDF8F2]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-fx-text-primary">
              Password reset successfully
            </h2>
            <p className="text-xs text-fx-text-secondary leading-relaxed">
              Your password has been updated. You may now sign in using your new credentials.
            </p>
          </div>
          <div className="pt-3">
            <Link
              href="/login"
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg transition duration-150 flex items-center justify-center"
            >
              Sign in to FutureX
            </Link>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-700 font-medium"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="new-password"
                className="block text-[13px] font-semibold text-fx-text-primary mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-11 pl-3.5 pr-11 text-sm text-fx-text-primary bg-white border border-[#E3E7EC] rounded-lg placeholder:text-fx-text-muted transition duration-150 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-50 disabled:cursor-not-allowed"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fx-text-muted hover:text-fx-text-primary p-1 focus:outline-none rounded"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-[13px] font-semibold text-fx-text-primary mb-1.5"
              >
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 px-3.5 text-sm text-fx-text-primary bg-white border border-[#E3E7EC] rounded-lg placeholder:text-fx-text-muted transition duration-150 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-50 disabled:cursor-not-allowed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating password…</span>
                </>
              ) : (
                <span>Reset password</span>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between items-center px-4 py-8 sm:py-12 bg-fx-bg">
      <div className="w-full" />
      <main className="w-full flex justify-center items-center my-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <div className="h-6 w-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </main>
      <footer className="mt-8 text-center text-xs text-fx-text-muted select-none">
        © 2026 FutureX (Pvt) Ltd.
      </footer>
    </div>
  );
}
