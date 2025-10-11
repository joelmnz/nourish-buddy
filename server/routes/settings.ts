import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.ts';
import { settings } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { rebuildAllSchedules } from '../services/scheduler.ts';

const updateSettingsSchema = z.object({
  reminders_enabled: z.boolean(),
  time_format: z.enum(['12', '24']),
});

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const settingsRoutes = new Hono<{ Variables: Variables }>();

settingsRoutes.use('*', requireAuth);

settingsRoutes.get('/', async (c) => {
  const db = await getDb();
  const rows = await db.select().from(settings).limit(1);
  
  if (rows.length === 0) {
    return c.json({
      reminders_enabled: true,
      time_format: '12' as const,
    });
  }
  
  const row = rows[0]!;
  return c.json({
    reminders_enabled: row.remindersEnabled,
    time_format: row.timeFormat,
  });
});

settingsRoutes.put('/', async (c) => {
  const body = await c.req.json();
  const data = updateSettingsSchema.parse(body);
  
  const db = await getDb();
  const existing = await db.select().from(settings).limit(1);
  
  if (existing.length === 0) {
    await db.insert(settings).values({
      remindersEnabled: data.reminders_enabled,
      timeFormat: data.time_format,
    });
  } else {
    await db.update(settings).set({
      remindersEnabled: data.reminders_enabled,
      timeFormat: data.time_format,
    });
  }
  
  rebuildAllSchedules().catch(console.error);
  
  return c.json({ ok: true });
});
