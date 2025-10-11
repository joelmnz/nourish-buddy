import type { Context, Next } from 'hono';
import { getEnv, isProduction } from '../config/env.ts';

export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next();
  
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-XSS-Protection', '1; mode=block');
  
  if (isProduction()) {
    const env = getEnv();
    if (env.INSECURE_DISABLE_ORIGIN_CHECKS) {
      // Relax CSP to permit cross-origin API calls through tunnels/CDNs.
      // Note: This is less secure and intended for controlled environments.
      c.header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src *");
    } else {
      c.header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'");
    }
  }
}
