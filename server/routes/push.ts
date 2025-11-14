import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.ts';
import { pushSubscriptions } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { eq } from 'drizzle-orm';
import { rebuildAllSchedules } from '../services/scheduler.ts';
import { getEnv } from '../config/env.ts';
import { generateDeviceName, detectPlatform } from '../utils/device.ts';

const subscribeSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  tz: z.string(),
  platform: z.string().optional(),
  deviceName: z.string().optional(),
});

const updateSubscriptionSchema = z.object({
  enabled: z.boolean().optional(),
  deviceName: z.string().optional(),
  tz: z.string().optional(),
});

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const pushRoutes = new Hono<{ Variables: Variables }>();

pushRoutes.get('/config', async (c) => {
  const env = getEnv();
  if (!env.VAPID_PUBLIC_KEY) {
    return c.json({ enabled: false });
  }
  return c.json({ enabled: true, publicKey: env.VAPID_PUBLIC_KEY });
});

pushRoutes.use('*', requireAuth);

pushRoutes.get('/subscriptions', async (c) => {
  const db = await getDb();
  const subs = await db.select().from(pushSubscriptions);

  return c.json({
    subscriptions: subs.map((sub) => ({
      id: sub.id,
      endpoint: sub.endpoint,
      tz: sub.tz,
      user_agent: sub.userAgent,
      platform: sub.platform,
      device_name: sub.deviceName,
      enabled: sub.enabled,
      created_at: sub.createdAt,
      updated_at: sub.updatedAt,
      last_seen_at: sub.lastSeenAt,
    })),
  });
});

pushRoutes.post('/subscribe', async (c) => {
  const env = getEnv();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    return c.json({ error: 'Push notifications not configured' }, 503);
  }

  const body = await c.req.json();
  const validation = subscribeSchema.safeParse(body);

  if (!validation.success) {
    return c.json({ error: 'Invalid input', details: validation.error }, 400);
  }

  const { endpoint, keys, tz, platform: providedPlatform, deviceName: providedDeviceName } = validation.data;
  const db = await getDb();

  const userAgent = c.req.header('User-Agent') || null;
  const platform = providedPlatform || detectPlatform(userAgent);
  const deviceName = providedDeviceName || generateDeviceName(userAgent, platform);

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing.length > 0) {
    const existingSub = existing[0]!;
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: keys.p256dh,
        auth: keys.auth,
        tz,
        userAgent,
        platform,
        // Only update device name if it was explicitly provided or if it's currently null
        deviceName: providedDeviceName || existingSub.deviceName || deviceName,
        enabled: true,
        updatedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      })
      .where(eq(pushSubscriptions.endpoint, endpoint));

    rebuildAllSchedules().catch(console.error);

    return c.json({ message: 'Subscription updated', id: existingSub.id });
  } else {
    const result = await db.insert(pushSubscriptions).values({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      tz,
      userAgent,
      platform,
      deviceName,
      enabled: true,
    }).returning({ id: pushSubscriptions.id });

    rebuildAllSchedules().catch(console.error);

    return c.json({ message: 'Subscription created', id: result[0]?.id }, 201);
  }
});

pushRoutes.patch('/subscriptions/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid subscription ID' }, 400);
  }

  const body = await c.req.json();
  const validation = updateSubscriptionSchema.safeParse(body);

  if (!validation.success) {
    return c.json({ error: 'Invalid input', details: validation.error }, 400);
  }

  const db = await getDb();

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Subscription not found' }, 404);
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (validation.data.enabled !== undefined) {
    updateData.enabled = validation.data.enabled;
  }
  if (validation.data.deviceName !== undefined) {
    updateData.deviceName = validation.data.deviceName;
  }
  if (validation.data.tz !== undefined) {
    updateData.tz = validation.data.tz;
  }

  await db
    .update(pushSubscriptions)
    .set(updateData)
    .where(eq(pushSubscriptions.id, id));

  // Rebuild schedules if enabled status changed
  if (validation.data.enabled !== undefined) {
    rebuildAllSchedules().catch(console.error);
  }

  return c.json({ message: 'Subscription updated' });
});

pushRoutes.delete('/subscriptions/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid subscription ID' }, 400);
  }

  const db = await getDb();

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.id, id));

  rebuildAllSchedules().catch(console.error);

  return c.json({ message: 'Subscription deleted' });
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
  const tz = body?.tz;

  if (typeof endpoint !== 'string') {
    return c.json({ error: 'Invalid endpoint' }, 400);
  }

  const db = await getDb();

  const updateData: Record<string, string> = {
    lastSeenAt: new Date().toISOString(),
  };

  if (typeof tz === 'string') {
    updateData.tz = tz;
  }

  await db
    .update(pushSubscriptions)
    .set(updateData)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  return c.json({ message: 'Heartbeat recorded' });
});
