'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/services/api/api-client';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your work email address.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: trimmedEmail });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to process your request. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center px-4 py-8 sm:py-12 bg-[#F7F9FC] text-[#17191C] selection:bg-[#EEF4FF] selection:text-[#1D4ED8]">
      <div className="w-full" />

      <main className="w-full flex justify-center items-center my-auto px-2 sm:px-6">
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
              Reset password
            </h1>
            <p className="text-[14px] text-[#626A73] mt-1 font-normal">
              Enter your work email to receive reset instructions.
            </p>
          </div>

          {isSubmitted ? (
            <div className="text-center py-2 space-y-4">
              <div className="h-12 w-12 rounded-full bg-[#EDF8F2] text-[#237A57] flex items-center justify-center mx-auto border border-[#EDF8F2]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-[#17191C]">
                  Check your inbox
                </h2>
                <p className="text-xs text-[#626A73] leading-relaxed">
                  If an active account is associated with{' '}
                  <span className="font-semibold text-[#17191C]">{email}</span>,
                  password reset instructions have been sent.
                </p>
              </div>
              <div className="pt-3">
                <Link
                  href="/login"
                  className="w-full h-[46px] bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-[14px] font-[600] rounded-[10px] transition-colors duration-140 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
                >
                  Return to sign in
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
                    htmlFor="reset-email"
                    className="block text-[13px] font-[550] text-[#17191C]"
                  >
                    Work Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    placeholder="name@futurex.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      <span>Sending instructions…</span>
                    </>
                  ) : (
                    <span>Send reset link</span>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-[13px] text-[#626A73] hover:text-[#17191C] font-[500] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="mt-8 text-center text-[12px] text-[#9299A2] select-none font-normal">
        FutureX Internal Workspace
      </footer>
    </div>
  );
}
