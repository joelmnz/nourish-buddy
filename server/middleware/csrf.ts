import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { generateCSRFToken } from '../utils/crypto.ts';
import { getEnv, isProduction } from '../config/env.ts';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export async function csrfMiddleware(c: Context, next: Next) {
  let csrfToken = getCookie(c, CSRF_COOKIE_NAME);
  
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    const env = getEnv();
    const sameSite = env.INSECURE_DISABLE_ORIGIN_CHECKS ? 'None' : 'Lax';
    const secure = isProduction() || env.INSECURE_DISABLE_ORIGIN_CHECKS ? 'Secure; ' : '';
    c.header('Set-Cookie', `${CSRF_COOKIE_NAME}=${csrfToken}; Path=/; ${secure}SameSite=${sameSite}; Max-Age=${60 * 60 * 24 * 365}`);
  }
  
  c.set('csrfToken', csrfToken);
  
  return next();
}

export async function requireCSRF(c: Context, next: Next) {
  const cookieToken = getCookie(c, CSRF_COOKIE_NAME);
  const headerToken = c.req.header(CSRF_HEADER_NAME);
  
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return c.json({ error: 'Invalid CSRF token' }, 403);
  }
  
  return next();
}

export async function csrfProtection(c: Context, next: Next) {
  const method = c.req.method;
  // Safe methods do not require CSRF validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // Exclude paths that don't use session auth (API token auth)
  const path = c.req.path;
  if (path.startsWith('/api/recipies') || path.startsWith('/api/planner')) {
    return next();
  }

  return requireCSRF(c, next);
}
