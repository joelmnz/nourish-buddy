import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.ts';
import { weights } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { eq, desc } from 'drizzle-orm';

const upsertWeightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kg: z.number().positive().max(500),
});

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const weightsRoutes = new Hono<{ Variables: Variables }>();

weightsRoutes.use('*', requireAuth);

weightsRoutes.get('/', async (c) => {
  const db = await getDb();
  const allWeights = await db
    .select()
    .from(weights)
    .orderBy(desc(weights.date));

  return c.json({
    weights: allWeights.map((w) => ({
      id: w.id,
      date: w.date,
      kg: w.kg,
      created_at: w.createdAt,
      updated_at: w.updatedAt,
    })),
  });
});

weightsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const validation = upsertWeightSchema.safeParse(body);

  if (!validation.success) {
    return c.json({ error: 'Invalid input', details: validation.error }, 400);
  }

  const { date, kg } = validation.data;
  const db = await getDb();

  const existing = await db
    .select()
    .from(weights)
    .where(eq(weights.date, date))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(weights)
      .set({
        kg,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(weights.date, date));

    return c.json({ message: 'Weight updated' });
  } else {
    const inserted = await db
      .insert(weights)
      .values({ date, kg })
      .returning();

    const record = inserted[0];
    if (!record) {
      return c.json({ error: 'Failed to create weight' }, 500);
    }

    return c.json({
      message: 'Weight created',
      weight: {
        id: record.id,
        date: record.date,
        kg: record.kg,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      },
    }, 201);
  }
});

weightsRoutes.delete('/:date', async (c) => {
  const date = c.req.param('date');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: 'Invalid date format' }, 400);
  }

  const db = await getDb();

  await db.delete(weights).where(eq(weights.date, date));

  return c.json({ message: 'Weight deleted' });
});
