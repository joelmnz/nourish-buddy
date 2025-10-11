import { Hono } from 'hono';
import { z } from 'zod';
import { getEnv } from '../config/env.ts';
import { verifyPassword } from '../utils/crypto.ts';
import { createSession, deleteSession, createSessionCookie, createSessionClearCookie, getSessionCookieName } from '../services/session.ts';
import { getCookie } from 'hono/cookie';
import { createRateLimiter } from '../middleware/rateLimit.ts';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const authRoutes = new Hono<{ Variables: Variables }>();

authRoutes.post('/login', createRateLimiter('login'), async (c) => {
  const body = await c.req.json();
  const { username, password } = loginSchema.parse(body);
  
  const env = getEnv();
  
  const usernameMatch = username === env.ADMIN_USERNAME;
  
  let passwordMatch = false;
  if (usernameMatch) {
    if (env.ADMIN_PASSWORD_HASH) {
      passwordMatch = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
    } else if (env.ADMIN_PASSWORD) {
      passwordMatch = password === env.ADMIN_PASSWORD;
    }
  }
  
  if (!usernameMatch || !passwordMatch) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }
  
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || null;
  const userAgent = c.req.header('user-agent') || null;
  
  const sessionData = await createSession(ip, userAgent);
  
  c.header('Set-Cookie', createSessionCookie(sessionData));
  
  return c.json({ ok: true });
});

authRoutes.post('/logout', async (c) => {
  const sessionToken = getCookie(c, getSessionCookieName());
  
  if (sessionToken) {
    await deleteSession(sessionToken);
  }
  
  c.header('Set-Cookie', createSessionClearCookie());
  
  return c.json({ ok: true });
});

authRoutes.get('/me', async (c) => {
  const auth = c.get('auth');
  const env = getEnv();
  const csrfToken = c.get('csrfToken');
  
  if (csrfToken) {
    c.header('x-csrf-token', csrfToken);
  }
  
  if (auth?.authenticated) {
    return c.json({ 
      authenticated: true,
      username: env.ADMIN_USERNAME
    });
  }
  
  return c.json({ authenticated: false });
});
