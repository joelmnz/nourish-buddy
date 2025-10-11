import { Hono } from 'hono';
import { getDb } from '../db/index.ts';
import { mealLogs, weights } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { desc } from 'drizzle-orm';

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const exportRoutes = new Hono<{ Variables: Variables }>();

exportRoutes.use('*', requireAuth);

exportRoutes.get('/meals.csv', async (c) => {
  const db = await getDb();

  const logs = await db
    .select({
      id: mealLogs.id,
      date: mealLogs.date,
      slotKey: mealLogs.slotKey,
      size: mealLogs.size,
      completed: mealLogs.completed,
      notes: mealLogs.notes,
      scheduledTimeAtLog: mealLogs.scheduledTimeAtLog,
      createdAt: mealLogs.createdAt,
    })
    .from(mealLogs)
    .orderBy(desc(mealLogs.date), mealLogs.scheduledTimeAtLog);

  const headers = [
    'id',
    'date',
    'slot_key',
    'size',
    'completed',
    'notes',
    'scheduled_time_at_log',
    'created_at'
  ];

  const rows = logs.map((log) => [
    log.id.toString(),
    log.date,
    log.slotKey,
    log.size.toString(),
    log.completed ? 'true' : 'false',
    log.notes ? `"${log.notes.replace(/"/g, '""')}"` : '',
    log.scheduledTimeAtLog,
    log.createdAt,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="nourish-buddy-meals-${new Date().toISOString().split('T')[0]}.csv"`);
  
  return c.body(csv);
});

exportRoutes.get('/weights.csv', async (c) => {
  const db = await getDb();

  const allWeights = await db
    .select({
      id: weights.id,
      date: weights.date,
      kg: weights.kg,
      createdAt: weights.createdAt,
    })
    .from(weights)
    .orderBy(desc(weights.date));

  const headers = ['id', 'date', 'kg', 'created_at'];

  const rows = allWeights.map((w) => [
    w.id.toString(),
    w.date,
    w.kg.toString(),
    w.createdAt,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="nourish-buddy-weights-${new Date().toISOString().split('T')[0]}.csv"`);
  
  return c.body(csv);
});
