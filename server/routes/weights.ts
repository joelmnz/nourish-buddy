import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.ts';
import { weights } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { eq, desc } from 'drizzle-orm';
import { WEIGHT_NOTES_MAX_LENGTH } from '../../shared/types.ts';

const upsertWeightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kg: z.number().positive().max(500),
  notes: z.string().max(WEIGHT_NOTES_MAX_LENGTH).nullable().optional(),
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
      notes: w.notes,
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

  const { date, kg, notes } = validation.data;
  const normalizedNotes = typeof notes === 'string' && !notes.trim() ? null : notes;
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
        ...(normalizedNotes !== undefined ? { notes: normalizedNotes } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(weights.date, date));

    return c.json({ message: 'Weight updated' });
  } else {
    const inserted = await db
      .insert(weights)
      .values({ date, kg, notes: normalizedNotes })
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
        notes: record.notes,
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
