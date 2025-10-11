import type { Context } from 'hono';
import { cors as honoCors } from 'hono/cors';
import { getEnv } from '../config/env.ts';

export function corsMiddleware() {
  const env = getEnv();

  // If insecure mode is enabled, reflect the request Origin header to support tunnels/CDNs.
  if (env.INSECURE_DISABLE_ORIGIN_CHECKS) {
    return async (c: Context, next: () => Promise<void>) => {
      // Use hono/cors with a dynamic origin function per request
      const origin = c.req.header('Origin') || '*';
      const cors = honoCors({
        origin,
        credentials: true,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'x-csrf-token'],
        exposeHeaders: ['Set-Cookie', 'x-csrf-token'],
        maxAge: 600,
      });
      // Apply CORS for this request
      await cors(c, next);
    };
  }

  // Default strict CORS: only allow the configured frontend URL
  return honoCors({
    origin: env.ALLOWED_ORIGIN,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'x-csrf-token'],
    exposeHeaders: ['Set-Cookie', 'x-csrf-token'],
    maxAge: 600,
  });
}
