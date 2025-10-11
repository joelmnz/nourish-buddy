import { Hono } from 'hono';
import { getDb } from '../db/index.ts';
import { mealLogs } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { sql, desc, eq } from 'drizzle-orm';

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const historyRoutes = new Hono<{ Variables: Variables }>();

historyRoutes.use('*', requireAuth);

historyRoutes.get('/dates', async (c) => {
  const db = await getDb();
  
  const dates = await db.select({ date: mealLogs.date })
    .from(mealLogs)
    .groupBy(mealLogs.date)
    .orderBy(desc(mealLogs.date));
  
  return c.json({ dates: dates.map(d => d.date) });
});

historyRoutes.get('/:date', async (c) => {
  const date = c.req.param('date');
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: 'Invalid date format' }, 400);
  }
  
  const db = await getDb();
  const logs = await db.select()
    .from(mealLogs)
    .where(eq(mealLogs.date, date))
    .orderBy(sql`${mealLogs.scheduledTimeAtLog}`);
  
  return c.json({
    date,
    logs: logs.map(log => ({
      id: log.id,
      slot_key: log.slotKey,
      size: log.size,
      completed: log.completed,
      notes: log.notes,
      scheduled_time: log.scheduledTimeAtLog,
    }))
  });
});
