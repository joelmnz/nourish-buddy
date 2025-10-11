import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.ts';
import { mealLogs, mealPlanSlots } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { and, eq, asc } from 'drizzle-orm';

const upsertLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot_key: z.enum(['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER']),
  size: z.number().int().min(0).max(5),
  completed: z.boolean(),
  notes: z.string().max(500).optional().nullable(),
});

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const todayRoutes = new Hono<{ Variables: Variables }>();

todayRoutes.use('*', requireAuth);

todayRoutes.get('/:date', async (c) => {
  const date = c.req.param('date');
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: 'Invalid date format' }, 400);
  }
  
  const db = await getDb();
  
  const slots = await db.select().from(mealPlanSlots).orderBy(asc(mealPlanSlots.orderIndex));
  const logs = await db.select().from(mealLogs).where(eq(mealLogs.date, date));
  
  const logsMap = new Map(logs.map(log => [log.slotKey, log]));
  
  const dayView = slots.map(slot => {
    const log = logsMap.get(slot.slotKey);
    return {
      slot_key: slot.slotKey,
      time_24h: slot.time24h,
      name: slot.name,
      size: log?.size ?? null,
      completed: log?.completed ?? null,
      notes: log?.notes ?? null,
      log_id: log?.id ?? null,
    };
  });
  
  return c.json({ date, meals: dayView });
});

todayRoutes.put('/log', async (c) => {
  const body = await c.req.json();
  const data = upsertLogSchema.parse(body);
  
  const db = await getDb();
  
  const slot = await db.select()
    .from(mealPlanSlots)
    .where(eq(mealPlanSlots.slotKey, data.slot_key))
    .limit(1);
  
  if (slot.length === 0) {
    return c.json({ error: 'Invalid slot key' }, 400);
  }
  
  const existing = await db.select()
    .from(mealLogs)
    .where(and(
      eq(mealLogs.date, data.date),
      eq(mealLogs.slotKey, data.slot_key)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(mealLogs)
      .set({
        size: data.size,
        completed: data.completed,
        notes: data.notes,
      })
      .where(eq(mealLogs.id, existing[0]!.id));
  } else {
    await db.insert(mealLogs).values({
      date: data.date,
      slotKey: data.slot_key,
      size: data.size,
      completed: data.completed,
      notes: data.notes,
      scheduledTimeAtLog: slot[0]!.time24h,
    });
  }
  
  return c.json({ ok: true });
});

todayRoutes.delete('/log/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  if (isNaN(id)) {
    return c.json({ error: 'Invalid log ID' }, 400);
  }
  
  const db = await getDb();
  await db.delete(mealLogs).where(eq(mealLogs.id, id));
  
  return c.json({ ok: true });
});
