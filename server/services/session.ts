import { getDb } from '../db/index.ts';
import { sessions } from '../db/schema.ts';
import { generateToken, hashToken } from '../utils/crypto.ts';
import { eq, lt } from 'drizzle-orm';
import { getEnv, isProduction } from '../config/env.ts';

const SESSION_DURATION_DAYS = 30;

export interface SessionData {
  token: string;
  expiresAt: Date;
}

export async function createSession(ip: string | null, userAgent: string | null): Promise<SessionData> {
  const db = await getDb();
  const token = generateToken();
  const tokenHash = hashToken(token);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  
  await db.insert(sessions).values({
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    ip,
    userAgent,
  });
  
  return { token, expiresAt };
}

export async function validateSession(token: string): Promise<boolean> {
  const db = await getDb();
  const tokenHash = hashToken(token);
  
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  
  if (session.length === 0) {
    return false;
  }
  
  const expiresAt = new Date(session[0]!.expiresAt);
  if (expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return false;
  }
  
  return true;
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  const tokenHash = hashToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function cleanupExpiredSessions(): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}

export function getSessionCookieName(): string {
  return 'session';
}

export function createSessionCookie(sessionData: SessionData): string {
  const env = getEnv();
  const secure = isProduction() || env.INSECURE_DISABLE_ORIGIN_CHECKS ? 'Secure; ' : '';
  const sameSite = env.INSECURE_DISABLE_ORIGIN_CHECKS ? 'None' : 'Lax';
  return `${getSessionCookieName()}=${sessionData.token}; HttpOnly; ${secure}SameSite=${sameSite}; Path=/; Max-Age=${SESSION_DURATION_DAYS * 24 * 60 * 60}`;
}

export function createSessionClearCookie(): string {
  // Clear cookie mirrors attributes where possible
  const env = getEnv();
  const secure = isProduction() || env.INSECURE_DISABLE_ORIGIN_CHECKS ? 'Secure; ' : '';
  const sameSite = env.INSECURE_DISABLE_ORIGIN_CHECKS ? 'None' : 'Lax';
  return `${getSessionCookieName()}=; HttpOnly; ${secure}SameSite=${sameSite}; Path=/; Max-Age=0`;
}
