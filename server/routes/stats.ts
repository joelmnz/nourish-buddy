import { Hono } from 'hono';
import { getDb } from '../db/index.ts';
import { mealLogs, weights, issues } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { desc, gte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getLocalDateString } from '../utils/date-utils.ts';

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
  const cutoffDateStr = getLocalDateString(cutoffDate);

  const logs = await db
    .select({
      size: mealLogs.size,
      completed: mealLogs.completed,
    })
    .from(mealLogs)
    .where(gte(mealLogs.date, cutoffDateStr));

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

// Timeseries of total completed meal sizes per day for last N days (default 14)
statsRoutes.get('/meals-by-day', async (c) => {
  const daysParam = c.req.query('days');
  const days = daysParam ? parseInt(daysParam, 10) : 14;

  if (isNaN(days) || days < 1 || days > 365) {
    return c.json({ error: 'Invalid days parameter (1-365)' }, 400);
  }

  const db = await getDb();

  // Compute start date (inclusive) using local timezone
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  const startStr = getLocalDateString(start);

  // Query totals grouped by date for completed logs only
  const rows = await db
    .select({
      date: mealLogs.date,
      total: sql<number>`sum(case when ${mealLogs.completed} = 1 then ${mealLogs.size} else 0 end)`,
    })
    .from(mealLogs)
    .where(gte(mealLogs.date, startStr))
    .groupBy(mealLogs.date)
    .orderBy(desc(mealLogs.date));

  // Build a complete series covering each day with zero fill
  const map = new Map<string, number>();
  for (const r of rows) {
    // Some SQLite drivers may return null for sum when no rows; default to 0
    map.set(r.date, (r.total ?? 0) as number);
  }

  const series: Array<{ date: string; total: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dStr = getLocalDateString(d);
    series.push({ date: dStr, total: map.get(dStr) ?? 0 });
  }

  return c.json({ days, totals: series });
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

// Timeseries of issue severity totals per day for last N days (default 14)
statsRoutes.get('/issues-by-day', async (c) => {
  const daysParam = c.req.query('days');
  const days = daysParam ? parseInt(daysParam, 10) : 14;

  if (isNaN(days) || days < 1 || days > 365) {
    return c.json({ error: 'Invalid days parameter (1-365)' }, 400);
  }

  const db = await getDb();

  // Compute start date (inclusive) using local timezone
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  const startStr = getLocalDateString(start);

  // Query totals grouped by date
  const rows = await db
    .select({
      date: issues.date,
      total: sql<number>`sum(${issues.severity})`,
    })
    .from(issues)
    .where(gte(issues.date, startStr))
    .groupBy(issues.date)
    .orderBy(desc(issues.date));

  // Build a complete series covering each day with zero fill
  const map = new Map<string, number>();
  for (const r of rows) {
    // Some SQLite drivers may return null for sum when no rows; default to 0
    map.set(r.date, (r.total ?? 0) as number);
  }

  const series: Array<{ date: string; total: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dStr = getLocalDateString(d);
    series.push({ date: dStr, total: map.get(dStr) ?? 0 });
  }

  return c.json({ days, totals: series });
});
