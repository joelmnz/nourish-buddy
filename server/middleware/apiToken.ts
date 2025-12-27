import type { Context, Next } from 'hono';
import { getEnv } from '../config/env.ts';

/**
 * Middleware to require API token authentication via Bearer token.
 * Checks the Authorization header for "Bearer <token>" format.
 * Returns 401 if token is missing, malformed, or invalid.
 */
export async function requireApiToken(c: Context, next: Next) {
  const env = getEnv();
  
  // If no API_TOKEN is configured, deny access
  if (!env.API_TOKEN) {
    return c.json({ error: 'API token authentication is not configured' }, 500);
  }
  
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json({ error: 'Authorization header is required' }, 401);
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return c.json({ error: 'Invalid Authorization header format. Expected: Bearer <token>' }, 401);
  }
  
  const token = parts[1];
  
  if (token !== env.API_TOKEN) {
    return c.json({ error: 'Invalid API token' }, 401);
  }
  
  return next();
}
