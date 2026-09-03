const DEV_ACCESS_SECRET = 'futurex_dev_access_secret_change_me';
const DEV_REFRESH_SECRET = 'futurex_dev_refresh_secret_change_me';

function requireSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET', devFallback: string): string {
  const value = process.env[name];

  if (value && value.trim().length >= 32) {
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
