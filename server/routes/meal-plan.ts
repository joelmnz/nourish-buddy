import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.ts';
import { mealPlanSlots } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { asc, eq } from 'drizzle-orm';
import { rebuildAllSchedules } from '../services/scheduler.ts';

const slotSchema = z.object({
  slot_key: z.enum(['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER']),
  order_index: z.number().int().min(0),
  time_24h: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  name: z.string().min(1).max(50),
  notes: z.string().max(200).optional().nullable(),
});

const updateMealPlanSchema = z.object({
  slots: z.array(slotSchema).length(7),
});

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const mealPlanRoutes = new Hono<{ Variables: Variables }>();

mealPlanRoutes.use('*', requireAuth);

mealPlanRoutes.get('/', async (c) => {
  const db = await getDb();
  const slots = await db.select().from(mealPlanSlots).orderBy(asc(mealPlanSlots.orderIndex));
  
  return c.json({
    slots: slots.map(s => ({
      slot_key: s.slotKey,
      order_index: s.orderIndex,
      time_24h: s.time24h,
      name: s.name,
      notes: s.notes,
    }))
  });
});

mealPlanRoutes.put('/', async (c) => {
  const body = await c.req.json();
  const data = updateMealPlanSchema.parse(body);
  
  const db = await getDb();
  
  await db.transaction(async (tx) => {
    for (const slot of data.slots) {
      await tx.update(mealPlanSlots)
        .set({
          orderIndex: slot.order_index,
          time24h: slot.time_24h,
          name: slot.name,
          notes: slot.notes,
        })
        .where(eq(mealPlanSlots.slotKey, slot.slot_key));
    }
  });
  
  rebuildAllSchedules().catch(console.error);
  
  return c.json({ ok: true });
});
