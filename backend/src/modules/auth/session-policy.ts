import { createHash } from 'crypto';

export const ACCESS_SECONDS = 15 * 60;
export const IDLE_MS = 60 * 60 * 1000;
export const SESSION_MS = 12 * 60 * 60 * 1000;
export const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
