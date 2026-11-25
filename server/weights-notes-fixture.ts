import { Database } from 'bun:sqlite';
import { strict as assert } from 'node:assert';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { Hono } from 'hono';
import { runMigrations } from './db/migrate.ts';
import { weightsRoutes } from './routes/weights.ts';
import { authMiddleware } from './middleware/auth.ts';
import { csrfMiddleware, csrfProtection } from './middleware/csrf.ts';
import { createSession } from './services/session.ts';
import { WEIGHT_NOTES_MAX_LENGTH } from '../shared/types.ts';

const path = process.env.DATABASE_PATH;
const mode = process.argv[2];
assert.ok(path, 'Use a disposable test database');
const parent = dirname(path);
assert.ok(resolve(dirname(parent)) === resolve(tmpdir()) && basename(parent).startsWith('nourish-weight-notes-') && basename(path) === 'test.sqlite', 'Use a disposable test database');
assert.ok(['fresh', 'legacy', 'api'].includes(mode ?? ''), 'Unknown fixture mode');
if (mode === 'legacy') {
  const db = new Database(path);
  db.run("CREATE TABLE weights (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, kg REAL NOT NULL CHECK(kg > 0), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
  db.run("INSERT INTO weights VALUES (17, '2020-01-02', 72.5, 'old-created', 'old-updated'), (23, '2020-02-03', 73, 'second-created', 'second-updated')");
  db.close();
}

await runMigrations();
if (mode === 'legacy' || mode === 'fresh') {
  for (let i = 0; i < 2; i++) {
    const db: Database = new Database(path);
    const columns = db.query("PRAGMA table_info('weights')").all() as Array<{ name: string; type: string; notnull: number }>;
    assert.ok(columns.some((c) => c.name === 'notes' && c.type === 'TEXT' && !c.notnull));
    const rows = db.query('SELECT * FROM weights ORDER BY id').all();
    assert.deepEqual(rows, mode === 'fresh' ? [] : [
      { id: 17, date: '2020-01-02', kg: 72.5, created_at: 'old-created', updated_at: 'old-updated', notes: null },
      { id: 23, date: '2020-02-03', kg: 73, created_at: 'second-created', updated_at: 'second-updated', notes: null },
    ]);
    db.close();
    if (i === 0) await runMigrations();
  }
} else {
  const app = new Hono();
  app.use('*', csrfMiddleware, csrfProtection, authMiddleware);
  app.route('/api/weights', weightsRoutes);
  const session = await createSession(null, null);
  const cookie = `session=${session.token}; csrf-token=test-token`;
  const headers = { cookie, 'x-csrf-token': 'test-token', 'content-type': 'application/json' };
  const post = (body: unknown, h = headers) => app.request('/api/weights', { method: 'POST', headers: h, body: JSON.stringify(body) });
  const list = async () => (await (await app.request('/api/weights', { headers })).json() as { weights: Array<{ date: string; kg: number; notes: string | null }> }).weights;
  assert.equal((await app.request('/api/weights')).status, 401);
  assert.equal((await post({ date: '2024-01-01', kg: 80 }, { ...headers, 'x-csrf-token': 'wrong' })).status, 403);
  assert.equal((await post({ date: '2024-01-01', kg: 80 }, { ...headers, cookie: 'csrf-token=test-token' })).status, 401);
  let response = await post({ date: '2024-01-01', kg: 80 });
  assert.equal(response.status, 201);
  assert.equal((await response.json() as { weight: { notes: null } }).weight.notes, null);
  assert.equal((await list())[0]?.notes, null);
  const note = ' first line\nsecond line  ';
  response = await post({ date: '2024-01-02', kg: 81, notes: note });
  assert.equal(response.status, 201);
  assert.equal((await response.json() as { weight: { notes: string } }).weight.notes, note);
  assert.equal((await list())[0]?.notes, note);
  assert.equal((await post({ date: '2024-01-02', kg: 82 })).status, 200);
  assert.equal((await list())[0]?.notes, note);
  assert.equal((await post({ date: '2024-01-02', kg: 83, notes: 'replacement\nline' })).status, 200);
  assert.equal((await list())[0]?.notes, 'replacement\nline');
  for (const invalid of ['x'.repeat(WEIGHT_NOTES_MAX_LENGTH + 1), 42, {}, []]) {
    assert.equal((await post({ date: '2024-01-02', kg: 99, notes: invalid })).status, 400);
    assert.equal((await list())[0]?.kg, 83);
    assert.equal((await list())[0]?.notes, 'replacement\nline');
  }
  assert.equal((await post({ date: '2024-01-02', kg: 84, notes: null })).status, 200);
  assert.equal((await list())[0]?.notes, null);
  assert.equal((await post({ date: '2024-01-02', kg: 85, notes: '  \n ' })).status, 200);
  assert.equal((await list())[0]?.notes, null);
}
