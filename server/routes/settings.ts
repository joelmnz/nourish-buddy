import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.ts';
import { settings } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { rebuildAllSchedules } from '../services/scheduler.ts';

const updateSettingsSchema = z.object({
  reminders_enabled: z.boolean().optional(),
  time_format: z.enum(['12', '24']).optional(),
  first_day_of_week: z.number().int().min(0).max(6).optional(),
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
      reminders_enabled: false,
      time_format: '12' as const,
      first_day_of_week: 0,
    });
  }
  
  const row = rows[0]!;
  return c.json({
    reminders_enabled: row.remindersEnabled,
    time_format: row.timeFormat,
    first_day_of_week: row.firstDayOfWeek,
  });
});

settingsRoutes.put('/', async (c) => {
  const body = await c.req.json();
  const data = updateSettingsSchema.parse(body);
  
  const db = await getDb();
  const existing = await db.select().from(settings).limit(1);
  
  const updateData: any = {};
  if (data.reminders_enabled !== undefined) updateData.remindersEnabled = data.reminders_enabled;
  if (data.time_format !== undefined) updateData.timeFormat = data.time_format;
  if (data.first_day_of_week !== undefined) updateData.firstDayOfWeek = data.first_day_of_week;
  
  if (existing.length === 0) {
    await db.insert(settings).values({
      remindersEnabled: data.reminders_enabled ?? false,
      timeFormat: data.time_format ?? '12',
      firstDayOfWeek: data.first_day_of_week ?? 0,
    });
  } else {
    if (Object.keys(updateData).length > 0) {
      await db.update(settings).set(updateData);
    }
  }
  
  rebuildAllSchedules().catch(console.error);
  
  return c.json({ ok: true });
});
