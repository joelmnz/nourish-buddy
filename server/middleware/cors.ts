import { cors as honoCors } from 'hono/cors';
import { getEnv } from '../config/env.ts';

export function corsMiddleware() {
  const env = getEnv();
  
  return honoCors({
    origin: env.ALLOWED_ORIGIN,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'x-csrf-token'],
    exposeHeaders: ['Set-Cookie', 'x-csrf-token'],
    maxAge: 600,
  });
}
