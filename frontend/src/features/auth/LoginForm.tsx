'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your work email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(trimmedEmail, password, returnTo, rememberMe);
    } catch (err: any) {
      const message = err?.message || '';
      if (message.toLowerCase().includes('deactivated') || message.toLowerCase().includes('disabled')) {
        setError('Your account is currently disabled. Contact your administrator.');
      } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('unauthorized')) {
        setError('Incorrect email or password.');
      } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('failed to fetch')) {
        setError('Unable to connect. Please try again.');
      } else {
        setError(message || 'Incorrect email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          FutureX Project Hub
        </h1>
        <p className="text-sm text-fx-text-secondary mt-1.5 font-normal">
          Sign in to continue to your workspace.
        </p>
      </div>

      {/* Accessible Error Notification */}
      {error && (
        <div
          id="login-error"
          role="alert"
          className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-700 font-medium"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="work-email"
            className="block text-[13px] font-semibold text-fx-text-primary mb-1.5"
          >
            Work Email
          </label>
          <input
            id="work-email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="name@futurex.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'login-error' : undefined}
            disabled={isLoading}
            className="w-full h-11 px-3.5 text-sm text-fx-text-primary bg-white border border-[#D7DED9] rounded-lg placeholder:text-fx-text-muted transition duration-150 focus:outline-none focus:border-fx-green focus:ring-1 focus:ring-fx-green disabled:bg-gray-50 disabled:cursor-not-allowed"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-[13px] font-semibold text-fx-text-primary"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-fx-green hover:underline font-medium focus:outline-none focus-visible:underline"
              tabIndex={0}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'login-error' : undefined}
              disabled={isLoading}
              className="w-full h-11 pl-3.5 pr-11 text-sm text-fx-text-primary bg-white border border-[#D7DED9] rounded-lg placeholder:text-fx-text-muted transition duration-150 focus:outline-none focus:border-fx-green focus:ring-1 focus:ring-fx-green disabled:bg-gray-50 disabled:cursor-not-allowed"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fx-text-muted hover:text-fx-text-primary p-1 focus:outline-none rounded"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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

        <div className="flex items-center pt-0.5">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 rounded border-[#D7DED9] text-fx-green focus:ring-fx-green cursor-pointer"
          />
          <label
            htmlFor="remember-me"
            className="ml-2 block text-xs text-fx-text-secondary select-none cursor-pointer"
          >
            Remember me
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 mt-2 bg-fx-green hover:bg-fx-green-hover active:bg-[#085a37] text-white text-sm font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-fx-green focus:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </button>
      </form>
    </div>
  );
}
