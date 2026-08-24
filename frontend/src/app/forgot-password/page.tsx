'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api/api-client';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

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
      setError(err?.message || 'Unable to process your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center px-4 py-8 sm:py-12 bg-fx-bg">
      <div className="w-full" />

      <main className="w-full flex justify-center items-center my-auto">
        <div className="w-full max-w-[420px] bg-white rounded-xl border border-fx-border p-8 shadow-sm">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="h-11 w-11 rounded-lg bg-fx-green text-white flex items-center justify-center font-bold text-lg mb-3.5 shadow-sm">
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
              Reset Password
            </h1>
            <p className="text-sm text-fx-text-secondary mt-1.5 font-normal">
              Enter your work email to receive password reset instructions.
            </p>
          </div>

          {isSubmitted ? (
            <div className="text-center py-2 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-fx-green flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-fx-text-primary">
                  Check your inbox
                </h2>
                <p className="text-xs text-fx-text-secondary leading-relaxed">
                  If an active account is associated with <span className="font-semibold text-fx-text-primary">{email}</span>, password reset instructions have been generated.
                </p>
              </div>
              <div className="pt-3">
                <Link
                  href="/login"
                  className="w-full h-11 bg-fx-green hover:bg-fx-green-hover text-white text-sm font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-2 focus:outline-none"
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
                  className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-700 font-medium"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-[13px] font-semibold text-fx-text-primary mb-1.5"
                  >
                    Work Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="name@futurex.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-11 px-3.5 text-sm text-fx-text-primary bg-white border border-[#D7DED9] rounded-lg placeholder:text-fx-text-muted transition duration-150 focus:outline-none focus:border-fx-green focus:ring-1 focus:ring-fx-green disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 mt-2 bg-fx-green hover:bg-fx-green-hover text-white text-sm font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-fx-green focus:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending instructions…</span>
                    </>
                  ) : (
                    <span>Send reset link</span>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-fx-text-secondary hover:text-fx-text-primary font-medium transition duration-150"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="mt-8 text-center text-xs text-fx-text-muted select-none">
        © 2026 FutureX (Pvt) Ltd.
      </footer>
    </div>
  );
}
