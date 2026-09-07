'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid work email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
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
      await login(data.email, data.password);
    } catch (err: any) {
      setServerError(
        err.response?.data?.message ||
          err.message ||
          'Invalid credentials. Please verify your email and password.',
      );
    }
  };

  return (
    <div className="min-h-screen bg-fx-bg flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-[8px] bg-[#2563EB] text-white font-bold text-sm shadow-none">
            FX
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-fx-text-primary">
            FutureX Workspace
          </h1>
          <p className="text-xs text-fx-text-secondary">
            Sign in to continue to your project management suite.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-fx-border rounded-[12px] p-6 sm:p-7 space-y-4 shadow-none">

          {serverError && (
            <div className="p-3 bg-red-50/80 border border-red-200/70 rounded-md flex items-start gap-2 text-xs text-fx-semantic-danger animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-fx-text-secondary">
                Work Email
              </label>
              <Input
                type="email"
                placeholder="name@futurex.io"
                leftIcon={<Mail className="w-3.5 h-3.5" />}
                error={errors.email?.message}
                {...register('email')}
                autoComplete="email"
                className="bg-[#F7F8FA]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-fx-text-secondary">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                error={errors.password?.message}
                {...register('password')}
                autoComplete="current-password"
                className="bg-[#F7F8FA]"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-2"
            >
              Sign in to Workspace
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-fx-text-muted">
          FutureX Studio Internal Platform · Strictly Authorized Personnel
        </p>
      </div>
    </div>
  );
}
