import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

export function allowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN || process.env.WEB_URL;
  const origins = configured ? configured.split(',').map((v) => v.trim()) :
    ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid CORS origin');
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production requires HTTPS origins');
  }
  if (process.env.NODE_ENV === 'production' && !configured) throw new Error('Production CORS_ORIGIN is required');
  return origins;
}

export function validateSecurityEnvironment() {
  allowedOrigins();
  if (process.env.NODE_ENV === 'production') {
    if (process.env.COOKIE_SECURE !== 'true') throw new Error('Production requires COOKIE_SECURE=true');
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) throw new Error('JWT signing secrets must differ');
    if (process.env.ENABLE_API_DOCS === 'true') throw new Error('Public production API documentation is disabled');
  }
  if (process.env.COOKIE_SAMESITE && !['lax', 'strict'].includes(process.env.COOKIE_SAMESITE)) {
    throw new Error('COOKIE_SAMESITE must be lax or strict');
  }
  if (process.env.TRUST_PROXY && !['loopback', 'false'].includes(process.env.TRUST_PROXY)) {
    throw new Error('TRUST_PROXY must be loopback or false');
  }
}

// A custom header makes browser mutations non-simple requests; exact origin checking
// also protects same-site sibling origins and applies before multipart parsing.
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (req.get('X-Requested-With') !== 'FutureX' ||
      (origin && !allowedOrigins().includes(origin)) || origin === 'null') {
    return res.status(403).json({ message: 'Request origin verification failed' });
  }
  next();
}

export function requestLimits() {
  const buckets = new Map<string, { count: number; until: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
    const auth = /\/auth\/(login|forgot-password|reset-password)$/.test(req.path);
    const refresh = req.path.endsWith('/auth/refresh');
    const scope = auth ? 'auth' : refresh ? 'refresh' : 'api';
    const keys = [`${scope}:${req.ip}`];
    if (auth && typeof req.body?.email === 'string') {
      keys.push(`account:${createHash('sha256').update(req.body.email.trim().toLowerCase()).digest('hex')}`);
    }
    const limit = auth ? 20 : refresh ? 120 : 1200;
    const windowMs = auth ? 15 * 60 * 1000 : 60 * 1000;
    for (const key of keys) {
      let bucket = buckets.get(key);
      if (!bucket) {
        if (buckets.size >= 10000) return res.status(429).json({ message: 'Try again later' });
        bucket = { count: 0, until: now + windowMs };
        buckets.set(key, bucket);
      }
      if (++bucket.count > limit) {
        res.setHeader('Retry-After', String(Math.ceil((bucket.until - now) / 1000)));
        return res.status(429).json({ message: 'Too many requests. Try again later.' });
      }
    }
    next();
  };
}
