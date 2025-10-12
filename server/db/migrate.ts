import { Database } from 'bun:sqlite';
import { getDb } from './index.ts';
import { settings, mealPlanSlots } from './schema.ts';
import { getEnv } from '../config/env.ts';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_MEAL_SLOTS: Array<{
  slotKey: 'BREAKFAST' | 'SNACK_1' | 'LUNCH' | 'SNACK_2' | 'DINNER' | 'DESSERT' | 'SUPPER';
  orderIndex: number;
  time24h: string;
  name: string;
  notes: string | null;
}> = [
  { slotKey: 'BREAKFAST', orderIndex: 0, time24h: '08:00', name: 'Breakfast', notes: null },
  { slotKey: 'SNACK_1', orderIndex: 1, time24h: '10:00', name: 'Morning Snack', notes: null },
  { slotKey: 'LUNCH', orderIndex: 2, time24h: '12:00', name: 'Lunch', notes: null },
  { slotKey: 'SNACK_2', orderIndex: 3, time24h: '15:00', name: 'Afternoon Snack', notes: null },
  { slotKey: 'DINNER', orderIndex: 4, time24h: '18:00', name: 'Dinner', notes: null },
  { slotKey: 'DESSERT', orderIndex: 5, time24h: '19:30', name: 'Dessert', notes: null },
  { slotKey: 'SUPPER', orderIndex: 6, time24h: '21:00', name: 'Supper', notes: null },
];

export async function seedDatabase() {
  const db = await getDb();

  const existingSettings = await db.select().from(settings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(settings).values({
      id: 1,
      remindersEnabled: false,
      timeFormat: '12',
    });
    console.log('✓ Seeded default settings');
  }

  const existingSlots = await db.select().from(mealPlanSlots).limit(1);
  if (existingSlots.length === 0) {
    await db.insert(mealPlanSlots).values(DEFAULT_MEAL_SLOTS);
    console.log('✓ Seeded 7 default meal slots');
  }
}

export async function runMigrations() {
  const env = getEnv();
  await mkdir(dirname(env.DATABASE_PATH), { recursive: true });
  
  const sqlite = new Database(env.DATABASE_PATH, { create: true });
  
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA foreign_keys = ON');
  
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      reminders_enabled INTEGER NOT NULL DEFAULT 0,
      time_format TEXT NOT NULL DEFAULT '12' CHECK(time_format IN ('12','24')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS meal_plan_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_key TEXT NOT NULL UNIQUE CHECK(slot_key IN ('BREAKFAST','SNACK_1','LUNCH','SNACK_2','DINNER','DESSERT','SUPPER')),
      order_index INTEGER NOT NULL,
      time_24h TEXT NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      slot_key TEXT NOT NULL CHECK(slot_key IN ('BREAKFAST','SNACK_1','LUNCH','SNACK_2','DINNER','DESSERT','SUPPER')),
      size INTEGER NOT NULL CHECK(size BETWEEN 0 AND 5),
      completed INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      scheduled_time_at_log TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, slot_key)
    )
  `);

  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date)`);
  
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS weights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      kg REAL NOT NULL CHECK(kg > 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      tz TEXT NOT NULL,
      user_agent TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      severity INTEGER NOT NULL CHECK(severity BETWEEN 0 AND 5),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_issues_date ON issues(date DESC)`);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      ip TEXT,
      user_agent TEXT
    )
  `);

  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);

  sqlite.close();

  console.log('✓ Migrations complete');
  
  await seedDatabase();
}

if (import.meta.main) {
  await runMigrations();
  process.exit(0);
}
