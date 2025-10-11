import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { generateCSRFToken } from '../utils/crypto.ts';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export async function csrfMiddleware(c: Context, next: Next) {
  let csrfToken = getCookie(c, CSRF_COOKIE_NAME);
  
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    c.header('Set-Cookie', `${CSRF_COOKIE_NAME}=${csrfToken}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`);
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
