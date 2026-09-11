'use client';

import { useState, useEffect } from 'react';
import {
  getGreetingByHour,
  formatGreeting,
  type TimeGreeting,
} from '@/lib/greeting';

export interface UseTimeGreetingOptions {
  /**
   * Interval in milliseconds between time boundary checks.
   * Defaults to 60,000ms (1 minute).
   */
  updateIntervalMs?: number;
  /**
   * Neutral fallback greeting rendered during SSR / before client hydration mount.
   * Defaults to 'Welcome'.
   */
  fallbackGreeting?: string;
}

/**
 * Hook to retrieve the current time-based greeting using browser-local time.
 * Hydration safe: Returns a neutral fallback until after client hydration.
 * Dynamically updates every 60 seconds across time boundaries.
 */
export function useTimeGreeting(options: UseTimeGreetingOptions = {}) {
  const { updateIntervalMs = 60000, fallbackGreeting = 'Welcome' } = options;
  const [timeGreeting, setTimeGreeting] = useState<TimeGreeting | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Determine browser local time immediately on mount
    const updateTime = () => {
      const currentHour = new Date().getHours();
      setTimeGreeting(getGreetingByHour(currentHour));
    };

    updateTime();
    setIsMounted(true);

    // Update across time boundaries (e.g. 11:59 AM -> 12:00 PM)
    const timer = setInterval(updateTime, updateIntervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [updateIntervalMs]);

  const activeGreeting = isMounted && timeGreeting ? timeGreeting : fallbackGreeting;

  return {
    greeting: activeGreeting,
    timeGreeting,
    isMounted,
  };
}

export interface UseGreetingOptions extends UseTimeGreetingOptions {
  /**
   * Safe fallback for the user name if undefined/empty.
   */
  fallbackName?: string;
}

/**
 * Full greeting hook combining time greeting and user display name.
 * Handles SSR safety, browser time, interval updates, and name fallbacks.
 */
export function useGreeting(userName?: string | null, options: UseGreetingOptions = {}) {
  const { fallbackName, ...timeOptions } = options;
  const { greeting, timeGreeting, isMounted } = useTimeGreeting(timeOptions);

  const resolvedName = userName?.trim() || fallbackName?.trim() || '';
  const greetingText = formatGreeting(greeting, resolvedName);

  return {
    greetingText,
    timeGreeting,
    rawGreeting: greeting,
    isMounted,
    displayName: resolvedName,
  };
}
