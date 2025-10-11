import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.ts';
import { pushSubscriptions } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { eq } from 'drizzle-orm';
import { rebuildAllSchedules } from '../services/scheduler.ts';

const subscribeSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  tz: z.string(),
});

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const pushRoutes = new Hono<{ Variables: Variables }>();

pushRoutes.use('*', requireAuth);

pushRoutes.post('/subscribe', async (c) => {
  const body = await c.req.json();
  const validation = subscribeSchema.safeParse(body);

  if (!validation.success) {
    return c.json({ error: 'Invalid input', details: validation.error }, 400);
  }

  const { endpoint, keys, tz } = validation.data;
  const db = await getDb();

  const userAgent = c.req.header('User-Agent') || null;

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: keys.p256dh,
        auth: keys.auth,
        tz,
        userAgent,
        enabled: true,
        lastSeenAt: new Date().toISOString(),
      })
      .where(eq(pushSubscriptions.endpoint, endpoint));

    rebuildAllSchedules().catch(console.error);

    return c.json({ message: 'Subscription updated' });
  } else {
    await db.insert(pushSubscriptions).values({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      tz,
      userAgent,
      enabled: true,
    });

    rebuildAllSchedules().catch(console.error);

    return c.json({ message: 'Subscription created' }, 201);
  }
});

pushRoutes.post('/unsubscribe', async (c) => {
  const body = await c.req.json();
  const endpoint = body?.endpoint;

  if (typeof endpoint !== 'string') {
    return c.json({ error: 'Invalid endpoint' }, 400);
  }

  const db = await getDb();

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  rebuildAllSchedules().catch(console.error);

  return c.json({ message: 'Subscription deleted' });
});

pushRoutes.post('/heartbeat', async (c) => {
  const body = await c.req.json();
  const endpoint = body?.endpoint;

  if (typeof endpoint !== 'string') {
    return c.json({ error: 'Invalid endpoint' }, 400);
  }

  const db = await getDb();

  await db
    .update(pushSubscriptions)
    .set({
      lastSeenAt: new Date().toISOString(),
    })
    .where(eq(pushSubscriptions.endpoint, endpoint));

  return c.json({ message: 'Heartbeat recorded' });
});
