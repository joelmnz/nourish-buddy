import type { Context, Next } from 'hono';
import { validateSession, getSessionCookieName } from '../services/session.ts';
import { getCookie } from 'hono/cookie';

export interface AuthContext {
  authenticated: boolean;
}

export async function authMiddleware(c: Context, next: Next) {
  const sessionToken = getCookie(c, getSessionCookieName());
  
  if (!sessionToken) {
    c.set('auth', { authenticated: false });
    return next();
  }
  
  const valid = await validateSession(sessionToken);
  c.set('auth', { authenticated: valid });
  
  return next();
}

export async function requireAuth(c: Context, next: Next) {
  const auth = c.get('auth') as AuthContext | undefined;
  
  if (!auth?.authenticated) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return next();
}
