import { Hono } from 'hono';
import { getDb, closeDb } from '../db/index.ts';
import { mealLogs, weights } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { desc } from 'drizzle-orm';
import { getEnv } from '../config/env.ts';
import { Database } from 'bun:sqlite';
import { unlink, copyFile } from 'node:fs/promises';

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

exportRoutes.get('/database', async (c) => {
  const env = getEnv();
  const dbPath = env.DATABASE_PATH;

  try {
    const file = Bun.file(dbPath);

    if (!await file.exists()) {
      return c.json({ error: 'Database file not found' }, 404);
    }

    const buffer = await file.arrayBuffer();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

    c.header('Content-Type', 'application/octet-stream');
    c.header('Content-Disposition', `attachment; filename="nourish-buddy-data-${dateStr}.db"`);

    return c.body(new Uint8Array(buffer));
  } catch (error) {
    console.error('Database export error:', error);
    return c.json({ error: 'Failed to export database' }, 500);
  }
});

exportRoutes.post('/database', async (c) => {
  const env = getEnv();
  const dbPath = env.DATABASE_PATH;
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  try {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'File size exceeds 100MB limit' }, 400);
    }

    if (file.size === 0) {
      return c.json({ error: 'File is empty' }, 400);
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Validate SQLite file signature (first 16 bytes should be "SQLite format 3\0")
    const sqliteHeader = 'SQLite format 3\0';
    const headerBytes = new TextDecoder().decode(buffer.slice(0, 16));

    if (!headerBytes.startsWith('SQLite format 3')) {
      return c.json({ error: 'Invalid SQLite database file' }, 400);
    }

    // Write to temporary file for validation
    const tempPath = `${dbPath}.temp`;
    await Bun.write(tempPath, buffer);

    // Validate the database structure
    let tempDb: Database | null = null;
    try {
      tempDb = new Database(tempPath, { readonly: true });

      // Check for required tables
      const tables = tempDb.query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();

      const tableNames = tables.map(t => t.name);
      const requiredTables = ['settings', 'meal_plan_slots', 'meal_logs', 'weights'];

      for (const table of requiredTables) {
        if (!tableNames.includes(table)) {
          await unlink(tempPath);
          return c.json({ error: `Invalid database: missing required table '${table}'` }, 400);
        }
      }

      tempDb.close();
      tempDb = null;

      // Close current database connection
      await closeDb();

      // Create backup of current database
      const backupPath = `${dbPath}.backup`;
      try {
        await copyFile(dbPath, backupPath);
      } catch (e) {
        // If backup fails, it might be because the db doesn't exist yet (first time setup)
        // This is okay, continue
      }

      // Replace the database file
      await copyFile(tempPath, dbPath);
      await unlink(tempPath);

      // Reinitialize the database connection
      await getDb();

      return c.json({ success: true, message: 'Database restored successfully' });

    } catch (error) {
      if (tempDb) {
        tempDb.close();
      }
      // Clean up temp file
      try {
        await unlink(tempPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      throw error;
    }

  } catch (error) {
    console.error('Database restore error:', error);
    return c.json({ error: 'Failed to restore database' }, 500);
  }
});
