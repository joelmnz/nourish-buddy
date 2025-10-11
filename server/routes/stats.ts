import { Hono } from 'hono';
import { getDb } from '../db/index.ts';
import { mealLogs, weights } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { desc, gte } from 'drizzle-orm';

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const statsRoutes = new Hono<{ Variables: Variables }>();

statsRoutes.use('*', requireAuth);

statsRoutes.get('/meals', async (c) => {
  const daysParam = c.req.query('days');
  const days = daysParam ? parseInt(daysParam, 10) : 14;

  if (isNaN(days) || days < 1 || days > 365) {
    return c.json({ error: 'Invalid days parameter (1-365)' }, 400);
  }

  const db = await getDb();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const logs = await db
    .select({
      size: mealLogs.size,
      completed: mealLogs.completed,
    })
    .from(mealLogs)
    .where(gte(mealLogs.date, cutoffDateStr!));

  const totalLogs = logs.length;
  const completedLogs = logs.filter((l) => l.completed).length;
  const totalSize = logs.filter((l) => l.completed).reduce((sum, l) => sum + l.size, 0);
  const avgSize = completedLogs > 0 ? totalSize / completedLogs : 0;

  return c.json({
    days,
    total_logs: totalLogs,
    completed_logs: completedLogs,
    completion_rate: totalLogs > 0 ? completedLogs / totalLogs : 0,
    average_size: avgSize,
  });
});

statsRoutes.get('/weights', async (c) => {
  const db = await getDb();

  const allWeights = await db
    .select({
      date: weights.date,
      kg: weights.kg,
    })
    .from(weights)
    .orderBy(desc(weights.date))
    .limit(90);

  return c.json({
    weights: allWeights.map((w) => ({
      date: w.date,
      kg: w.kg,
    })),
  });
});
