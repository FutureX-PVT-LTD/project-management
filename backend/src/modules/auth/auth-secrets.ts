import { randomBytes } from 'crypto';
const DEV_ACCESS_SECRET = randomBytes(48).toString('hex');
const DEV_REFRESH_SECRET = randomBytes(48).toString('hex');

function requireSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET', devFallback: string): string {
  const value = process.env[name];

  if (value && value.trim().length >= 32 && !/futurex|change.?me|example|replace/i.test(value)) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be configured with at least 32 characters in production.`);
  }

  return devFallback;
}

export function getJwtAccessSecret(): string {
  return requireSecret('JWT_SECRET', DEV_ACCESS_SECRET);
}

export function getJwtRefreshSecret(): string {
  return requireSecret('JWT_REFRESH_SECRET', DEV_REFRESH_SECRET);
}
