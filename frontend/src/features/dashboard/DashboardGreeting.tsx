'use client';

import React from 'react';
import { useGreeting, UseGreetingOptions } from '@/hooks/useGreeting';

export interface DashboardGreetingProps extends UseGreetingOptions {
  /**
   * The authenticated user's display name or first name.
   */
  userName?: string | null;
  /**
   * HTML element tag to render as. Default: 'span'.
   */
  as?: 'span' | 'h1' | 'h2' | 'p' | 'div';
  /**
   * Optional additional className.
   */
  className?: string;
}

/**
 * Reusable client component for displaying a time-based greeting.
 * Uses the browser's local time after client hydration to prevent SSR mismatch.
 * Automatically updates across time boundaries every 60 seconds.
 */
export function DashboardGreeting({
  userName,
  fallbackGreeting = 'Welcome',
  fallbackName,
  updateIntervalMs = 60000,
  as: Component = 'span',
  className,
}: DashboardGreetingProps) {
  const { greetingText } = useGreeting(userName, {
    fallbackGreeting,
    fallbackName,
    updateIntervalMs,
  });

  return (
    <Component className={className} suppressHydrationWarning>
      {greetingText}
    </Component>
  );
}
