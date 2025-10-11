import type { Context, Next } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 60 * 1000 },
  write: { maxRequests: 60, windowMs: 60 * 1000 },
};

function getClientId(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]?.trim() : c.req.header('x-real-ip') || 'unknown';
  return ip || 'unknown';
}

export function createRateLimiter(type: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[type];
  
  return async (c: Context, next: Next) => {
    const clientId = `${type}:${getClientId(c)}`;
    const now = Date.now();
    
    const entry = rateLimitStore.get(clientId);
    
    if (entry && entry.resetAt > now) {
      if (entry.count >= config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        c.header('Retry-After', retryAfter.toString());
        return c.json({ error: 'Too many requests' }, 429);
      }
      entry.count++;
    } else {
      rateLimitStore.set(clientId, {
        count: 1,
        resetAt: now + config.windowMs,
      });
    }
    
    return next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000);
