'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/features/auth/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid work email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || null;

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      await login(data.email.trim(), data.password, returnTo, rememberMe);
    } catch (err: any) {
      // Security UX: Generic failure message, no technical leak or user enumeration
      if (err?.response?.status === 429 || err?.status === 429) {
        setServerError(
          'Too many sign-in attempts. Please wait a few minutes before trying again.',
        );
      } else {
        setServerError(
          'We couldn’t sign you in. Check your email and password and try again.',
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#17191C] flex flex-col justify-between items-center px-4 py-6 sm:py-12 selection:bg-[#EEF4FF] selection:text-[#1D4ED8]">
      {/* Top breathing room */}
      <div className="w-full max-w-5xl" />

      {/* Main Authentication Section */}
      <main className="w-full max-w-5xl my-auto flex flex-col md:flex-row items-center justify-center gap-7 md:gap-16 lg:gap-24 px-2 sm:px-6">
        {/* Left Column: Brand Context */}
        <section className="w-full md:w-auto md:max-w-[340px] flex flex-col items-center md:items-start text-center md:text-left">
          {/* Official FutureX Logo */}
          <div className="relative w-[140px] md:w-[152px] h-[48px] md:h-[52px] overflow-hidden mb-3 md:mb-5">
            <Image
              src="/images/futurex-logo.png"
              alt="FutureX"
              width={152}
              height={152}
              priority
              className="w-[140px] md:w-[152px] h-[140px] md:h-[152px] -mt-[45px] md:-mt-[49px] object-contain select-none pointer-events-none"
            />
          </div>

          <h2 className="text-[16px] md:text-[17px] font-[650] text-[#17191C] tracking-tight mb-1 md:mb-2">
            Product Development Workspace
          </h2>

          <p className="text-[13px] md:text-[14px] text-[#626A73] leading-relaxed font-normal max-w-[280px]">
            Plan, build and deliver products with clarity.
          </p>

          {/* Restrained Architectural Visual Detail: Subtle brand accent line */}
          <div className="hidden md:block w-8 h-[2px] bg-[#2563EB] mt-7 rounded-full opacity-80" />
        </section>

        {/* Subtle Column Divider on Desktop */}
        <div
          aria-hidden="true"
          className="hidden md:block w-px h-[320px] bg-[#E0E5EA] self-center"
        />

        {/* Right Column: Login Form Surface */}
        <section className="w-full max-w-[420px]">
          <div className="bg-white border border-[#E7EBF0] rounded-[18px] p-6 sm:p-9 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_6px_20px_rgba(0,0,0,0.02)] transition-all animate-fxLoginFadeIn">
            <div className="mb-5 sm:mb-6">
              <h1 className="text-[24px] sm:text-[28px] font-[650] tracking-tight text-[#17191C]">
                Welcome back
              </h1>
              <p className="text-[13px] sm:text-[14px] text-[#626A73] mt-1 font-normal">
                Sign in to continue to your workspace.
              </p>
            </div>

            {/* Inline Error Message */}
            {serverError && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-5 p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FEE2E2] flex items-start gap-2.5 text-[13px] text-[#991B1B] font-normal leading-snug"
              >
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Email Address Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-[13px] font-[550] text-[#17191C]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="name@futurex.com"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full h-[46px] px-3.5 bg-white text-[14px] text-[#17191C] rounded-[10px] border border-[#DDE2E8] placeholder:text-[#9299A2] transition-colors duration-140',
                    'focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15',
                    'disabled:bg-[#F8F9FB] disabled:text-[#9299A2] disabled:cursor-not-allowed',
                    errors.email &&
                      'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/15',
                  )}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-[12px] text-[#DC2626] font-normal">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field with Visibility Toggle */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-[550] text-[#17191C]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    disabled={isSubmitting}
                    className={cn(
                      'w-full h-[46px] pl-3.5 pr-11 bg-white text-[14px] text-[#17191C] rounded-[10px] border border-[#DDE2E8] placeholder:text-[#9299A2] transition-colors duration-140',
                      'focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15',
                      'disabled:bg-[#F8F9FB] disabled:text-[#9299A2] disabled:cursor-not-allowed',
                      errors.password &&
                        'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/15',
                    )}
                    {...register('password')}
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
                {errors.password && (
                  <p className="text-[12px] text-[#DC2626] font-normal">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Options Row: Keep me signed in & Forgot password? */}
              <div className="flex items-center justify-between pt-1">
                <label
                  htmlFor="remember-me"
                  className="flex items-center gap-2 cursor-pointer select-none text-[13px] text-[#626A73] hover:text-[#17191C] transition-colors"
                >
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                    className="w-4 h-4 rounded-[4px] border-[#DDE2E8] text-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer accent-[#2563EB]"
                  />
                  <span>Keep me signed in</span>
                </label>

                <Link
                  href="/forgot-password"
                  className="text-[13px] text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-[500] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Primary Sign-In CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[46px] mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-[14px] font-[600] rounded-[10px] transition-colors duration-140 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Subtle Internal Portal Footer */}
      <footer className="mt-8 text-center text-[12px] text-[#9299A2] select-none font-normal">
        FutureX Internal Workspace
      </footer>
    </div>
  );
}
