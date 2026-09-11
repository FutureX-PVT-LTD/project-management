export type TimeGreeting = 'Good morning' | 'Good afternoon' | 'Good evening';

/**
 * Returns the appropriate time-based greeting for a given hour of the day (0-23).
 *
 * Rules:
 * - 00:00 – 11:59 (hours 0..11)  -> "Good morning"
 * - 12:00 – 17:59 (hours 12..17) -> "Good afternoon"
 * - 18:00 – 23:59 (hours 18..23) -> "Good evening"
 */
export function getGreetingByHour(hour: number): TimeGreeting {
  const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24;
  if (normalizedHour < 12) {
    return 'Good morning';
  }
  if (normalizedHour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

/**
 * Returns the time greeting for the given Date object (defaults to current client time).
 */
export function getTimeGreeting(date: Date = new Date()): TimeGreeting {
  return getGreetingByHour(date.getHours());
}

/**
 * Formats a greeting with an optional user display name.
 * e.g. "Good morning, Anjana" or "Good morning" if no name is provided.
 */
export function formatGreeting(greeting: string, userName?: string | null): string {
  const trimmed = userName?.trim();
  if (trimmed) {
    return `${greeting}, ${trimmed}`;
  }
  return greeting;
}

/**
 * Resolves a safe display name from a user object or fallback.
 */
export function resolveUserDisplayName(
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null,
  fallback: string = '',
): string {
  if (!user) return fallback;
  if (user.firstName?.trim()) return user.firstName.trim();
  if (user.lastName?.trim()) return user.lastName.trim();
  if (user.email?.trim()) {
    const prefix = user.email.split('@')[0];
    if (prefix) return prefix;
  }
  return fallback;
}
