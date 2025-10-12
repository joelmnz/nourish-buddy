import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/index.ts';
import { issues } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { eq, desc, or, like, sql } from 'drizzle-orm';

const createIssueSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(255),
  severity: z.number().int().min(0).max(5),
  description: z.string().optional().nullable(),
});

const updateIssueSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  title: z.string().min(1).max(255).optional(),
  severity: z.number().int().min(0).max(5).optional(),
  description: z.string().optional().nullable(),
});

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const issuesRoutes = new Hono<{ Variables: Variables }>();

issuesRoutes.use('*', requireAuth);

issuesRoutes.get('/', async (c) => {
  const db = await getDb();
  const page = parseInt(c.req.query('page') || '1', 10);
  const perPage = parseInt(c.req.query('per_page') || '10', 10);
  const search = c.req.query('search') || '';

  // Validate pagination
  const validPage = Math.max(1, page);
  const validPerPage = Math.min(50, Math.max(10, perPage));
  const offset = (validPage - 1) * validPerPage;

  // Build query with search
  let query = db.select().from(issues);
  
  if (search) {
    query = query.where(
      or(
        like(issues.title, `%${search}%`),
        like(issues.description, `%${search}%`)
      )
    ) as typeof query;
  }

  // Get total count for pagination
  const countQuery = search
    ? db.select({ count: sql<number>`count(*)` }).from(issues).where(
        or(
          like(issues.title, `%${search}%`),
          like(issues.description, `%${search}%`)
        )
      )
    : db.select({ count: sql<number>`count(*)` }).from(issues);

  const countResult = await countQuery;
  const total = countResult[0]?.count || 0;

  // Get paginated results
  const allIssues = await query
    .orderBy(desc(issues.date), desc(issues.id))
    .limit(validPerPage)
    .offset(offset);

  return c.json({
    issues: allIssues.map((issue) => ({
      id: issue.id,
      date: issue.date,
      title: issue.title,
      severity: issue.severity,
      description: issue.description,
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
    })),
    pagination: {
      page: validPage,
      per_page: validPerPage,
      total,
      total_pages: Math.ceil(total / validPerPage),
    },
  });
});

issuesRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  if (isNaN(id)) {
    return c.json({ error: 'Invalid issue ID' }, 400);
  }

  const db = await getDb();
  const issue = await db
    .select()
    .from(issues)
    .where(eq(issues.id, id))
    .limit(1);

  const record = issue[0];
  if (!record) {
    return c.json({ error: 'Issue not found' }, 404);
  }

  return c.json({
    id: record.id,
    date: record.date,
    title: record.title,
    severity: record.severity,
    description: record.description,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  });
});

issuesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const validation = createIssueSchema.safeParse(body);

  if (!validation.success) {
    return c.json({ error: 'Invalid input', details: validation.error }, 400);
  }

  const { date, title, severity, description } = validation.data;
  const db = await getDb();

  const inserted = await db
    .insert(issues)
    .values({
      date,
      title,
      severity,
      description: description || null,
    })
    .returning();

  const record = inserted[0];
  if (!record) {
    return c.json({ error: 'Failed to create issue' }, 500);
  }

  return c.json({
    message: 'Issue created',
    issue: {
      id: record.id,
      date: record.date,
      title: record.title,
      severity: record.severity,
      description: record.description,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    },
  }, 201);
});

issuesRoutes.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  if (isNaN(id)) {
    return c.json({ error: 'Invalid issue ID' }, 400);
  }

  const body = await c.req.json();
  const validation = updateIssueSchema.safeParse(body);

  if (!validation.success) {
    return c.json({ error: 'Invalid input', details: validation.error }, 400);
  }

  const db = await getDb();

  // Check if issue exists
  const existing = await db
    .select()
    .from(issues)
    .where(eq(issues.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Issue not found' }, 404);
  }

  // Update issue
  const updates: {
    date?: string;
    title?: string;
    severity?: number;
    description?: string | null;
    updatedAt: string;
  } = {
    updatedAt: new Date().toISOString(),
  };

  if (validation.data.date !== undefined) updates.date = validation.data.date;
  if (validation.data.title !== undefined) updates.title = validation.data.title;
  if (validation.data.severity !== undefined) updates.severity = validation.data.severity;
  if (validation.data.description !== undefined) updates.description = validation.data.description;

  await db
    .update(issues)
    .set(updates)
    .where(eq(issues.id, id));

  // Fetch updated record
  const updated = await db
    .select()
    .from(issues)
    .where(eq(issues.id, id))
    .limit(1);

  const updatedRecord = updated[0];
  if (!updatedRecord) {
    return c.json({ error: 'Failed to fetch updated issue' }, 500);
  }

  return c.json({
    message: 'Issue updated',
    issue: {
      id: updatedRecord.id,
      date: updatedRecord.date,
      title: updatedRecord.title,
      severity: updatedRecord.severity,
      description: updatedRecord.description,
      created_at: updatedRecord.createdAt,
      updated_at: updatedRecord.updatedAt,
    },
  });
});

issuesRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  if (isNaN(id)) {
    return c.json({ error: 'Invalid issue ID' }, 400);
  }

  const db = await getDb();

  await db.delete(issues).where(eq(issues.id, id));

  return c.json({ message: 'Issue deleted' });
});
