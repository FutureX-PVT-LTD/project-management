'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api/api-client';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

    if (
      newPassword.length < 12 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)
    ) {
      setError(
        'Password must be at least 12 characters long and include uppercase, lowercase, numbers, and special characters.',
      );
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
        err?.response?.data?.message ||
          err?.message ||
          'Password reset link is invalid or has expired. Please request a new link.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-[420px] bg-white rounded-[18px] border border-[#E7EBF0] p-7 sm:p-9 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_6px_20px_rgba(0,0,0,0.02)] text-center animate-fxLoginFadeIn">
        <div className="h-12 w-12 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto mb-4 border border-[#FEE2E2]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-[20px] font-[650] text-[#17191C]">Invalid reset link</h1>
        <p className="text-[13px] text-[#626A73] mt-1.5 mb-6">
          No password reset token was provided or the link has expired.
        </p>
        <Link
          href="/forgot-password"
          className="w-full h-[46px] bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-[14px] font-[600] rounded-[10px] transition-colors duration-140 flex items-center justify-center"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] bg-white rounded-[18px] border border-[#E7EBF0] p-7 sm:p-9 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_6px_20px_rgba(0,0,0,0.02)] animate-fxLoginFadeIn">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative w-[148px] h-[52px] overflow-hidden mb-4">
          <Image
            src="/images/futurex-logo.png"
            alt="FutureX"
            width={148}
            height={148}
            priority
            className="w-[148px] h-[148px] -mt-[48px] object-contain select-none pointer-events-none"
          />
        </div>
        <h1 className="text-[24px] sm:text-[26px] font-[650] text-[#17191C] tracking-tight">
          Create new password
        </h1>
        <p className="text-[14px] text-[#626A73] mt-1 font-normal">
          Choose a secure password for your workspace account.
        </p>
      </div>

      {isSuccess ? (
        <div className="text-center py-2 space-y-4">
          <div className="h-12 w-12 rounded-full bg-[#EDF8F2] text-[#237A57] flex items-center justify-center mx-auto border border-[#EDF8F2]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#17191C]">
              Password reset successfully
            </h2>
            <p className="text-xs text-[#626A73] leading-relaxed">
              Your password has been updated. You may now sign in using your new credentials.
            </p>
          </div>
          <div className="pt-3">
            <Link
              href="/login"
              className="w-full h-[46px] bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-[14px] font-[600] rounded-[10px] transition-colors duration-140 flex items-center justify-center"
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
              className="mb-5 p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FEE2E2] flex items-start gap-2.5 text-[13px] text-[#991B1B] font-normal leading-snug"
            >
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="block text-[13px] font-[550] text-[#17191C]"
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimum 12 chars (upper, lower, digit, symbol)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-[46px] pl-3.5 pr-11 bg-white text-[14px] text-[#17191C] rounded-[10px] border border-[#DDE2E8] placeholder:text-[#9299A2] transition-colors duration-140 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 disabled:bg-[#F8F9FB] disabled:text-[#9299A2] disabled:cursor-not-allowed"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#626A73] hover:text-[#17191C] rounded-[6px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="block text-[13px] font-[550] text-[#17191C]"
              >
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full h-[46px] px-3.5 bg-white text-[14px] text-[#17191C] rounded-[10px] border border-[#DDE2E8] placeholder:text-[#9299A2] transition-colors duration-140 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 disabled:bg-[#F8F9FB] disabled:text-[#9299A2] disabled:cursor-not-allowed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[46px] mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-[14px] font-[600] rounded-[10px] transition-colors duration-140 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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
    <div className="min-h-screen flex flex-col justify-between items-center px-4 py-8 sm:py-12 bg-[#F7F9FC] text-[#17191C] selection:bg-[#EEF4FF] selection:text-[#1D4ED8]">
      <div className="w-full" />
      <main className="w-full flex justify-center items-center my-auto px-2 sm:px-6">
        <Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </main>
      <footer className="mt-8 text-center text-[12px] text-[#9299A2] select-none font-normal">
        FutureX Internal Workspace
      </footer>
    </div>
  );
}
