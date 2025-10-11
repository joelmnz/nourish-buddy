import type { Context, Next } from 'hono';
import { isProduction } from '../config/env.ts';

export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next();
  
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-XSS-Protection', '1; mode=block');
  
  if (isProduction()) {
    c.header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'");
  }
}
