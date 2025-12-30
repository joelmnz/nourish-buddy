import { Database } from 'bun:sqlite';
import { getDb } from './index.ts';
import { settings, mealPlanSlots, weeklyPlans } from './schema.ts';
import { getEnv } from '../config/env.ts';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DEFAULT_FEATURES_ENABLED } from '../../shared/types.ts';

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
      firstDayOfWeek: 0,
      featuresEnabled: DEFAULT_FEATURES_ENABLED,
    });
    console.log('✓ Seeded default settings');
  }

  const existingSlots = await db.select().from(mealPlanSlots).limit(1);
  if (existingSlots.length === 0) {
    await db.insert(mealPlanSlots).values(DEFAULT_MEAL_SLOTS);
    console.log('✓ Seeded 7 default meal slots');
  }

  const existingPlans = await db.select().from(weeklyPlans).limit(1);
  if (existingPlans.length === 0) {
    await db.insert(weeklyPlans).values([
      { key: 'THIS' },
      { key: 'NEXT' },
    ]);
    console.log('✓ Seeded THIS and NEXT weekly plans');
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
      first_day_of_week INTEGER NOT NULL DEFAULT 0 CHECK(first_day_of_week BETWEEN 0 AND 6),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Ensure new column exists for existing databases
  const settingsCols = sqlite.query(`PRAGMA table_info('settings')`).all() as Array<{ name: string }>;
  const hasFirstDay = settingsCols.some((c) => c.name === 'first_day_of_week');
  if (!hasFirstDay) {
    sqlite.run(`ALTER TABLE settings ADD COLUMN first_day_of_week INTEGER NOT NULL DEFAULT 0 CHECK(first_day_of_week BETWEEN 0 AND 6)`);
    console.log('✓ Migrated: added first_day_of_week to settings');
  }

  const hasFeaturesEnabled = settingsCols.some((c) => c.name === 'features_enabled');
  if (!hasFeaturesEnabled) {
    sqlite.run(`ALTER TABLE settings ADD COLUMN features_enabled TEXT NOT NULL DEFAULT '${DEFAULT_FEATURES_ENABLED}'`);
    console.log('✓ Migrated: added features_enabled to settings');
  }

  const hasGoalKg = settingsCols.some((c) => c.name === 'goal_kg');
  if (!hasGoalKg) {
    sqlite.run(`ALTER TABLE settings ADD COLUMN goal_kg REAL`);
    console.log('✓ Migrated: added goal_kg to settings');
  }

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
      platform TEXT,
      device_name TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT
    )
  `);

  // Add new columns for existing databases
  const pushSubsCols = sqlite.query(`PRAGMA table_info('push_subscriptions')`).all() as Array<{ name: string }>;
  const hasPlatform = pushSubsCols.some((c) => c.name === 'platform');
  const hasDeviceName = pushSubsCols.some((c) => c.name === 'device_name');
  const hasUpdatedAt = pushSubsCols.some((c) => c.name === 'updated_at');

  if (!hasPlatform) {
    sqlite.run(`ALTER TABLE push_subscriptions ADD COLUMN platform TEXT`);
    console.log('✓ Migrated: added platform to push_subscriptions');
  }

  if (!hasDeviceName) {
    sqlite.run(`ALTER TABLE push_subscriptions ADD COLUMN device_name TEXT`);
    console.log('✓ Migrated: added device_name to push_subscriptions');
  }

  if (!hasUpdatedAt) {
    sqlite.run(`ALTER TABLE push_subscriptions ADD COLUMN updated_at TEXT`);
    // Backfill updated_at with created_at or current time
    sqlite.run(`UPDATE push_subscriptions SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL`);
    console.log('✓ Migrated: added updated_at to push_subscriptions');
  }

  // Backfill device names and platform for existing subscriptions
  if (!hasPlatform || !hasDeviceName || !hasUpdatedAt) {
    const { generateDeviceName, detectPlatform } = await import('../utils/device.ts');
    const existingSubs = sqlite.query(`SELECT id, user_agent, platform, device_name FROM push_subscriptions`).all() as Array<{
      id: number;
      user_agent: string | null;
      platform: string | null;
      device_name: string | null;
    }>;

    for (const sub of existingSubs) {
      let platform = sub.platform;
      if (!platform) {
        platform = detectPlatform(sub.user_agent);
        sqlite.run(`UPDATE push_subscriptions SET platform = ? WHERE id = ?`, [platform, sub.id]);
      }
      if (!sub.device_name) {
        const deviceName = generateDeviceName(sub.user_agent, platform);
        sqlite.run(`UPDATE push_subscriptions SET device_name = ? WHERE id = ?`, [deviceName, sub.id]);
      }
    }

    if (existingSubs.length > 0) {
      console.log(`✓ Backfilled device names for ${existingSubs.length} subscription(s)`);
    }
  }


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

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      instructions TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      qty TEXT NOT NULL,
      item TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id)`);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS recipe_meal_slots (
      recipe_id INTEGER NOT NULL,
      slot_key TEXT NOT NULL CHECK(slot_key IN ('BREAKFAST','SNACK_1','LUNCH','SNACK_2','DINNER','DESSERT','SUPPER')),
      PRIMARY KEY (recipe_id, slot_key),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS weekly_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE CHECK(key IN ('THIS','NEXT')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS weekly_plan_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      day_index INTEGER NOT NULL CHECK(day_index BETWEEN 0 AND 6),
      slot_key TEXT NOT NULL CHECK(slot_key IN ('BREAKFAST','SNACK_1','LUNCH','SNACK_2','DINNER','DESSERT','SUPPER')),
      recipe_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(plan_id, day_index, slot_key),
      FOREIGN KEY (plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
    )
  `);

  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_weekly_plan_entries_plan ON weekly_plan_entries(plan_id)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_weekly_plan_entries_recipe ON weekly_plan_entries(recipe_id)`);

  sqlite.close();

  console.log('✓ Migrations complete');
  
  await seedDatabase();
}

if (import.meta.main) {
  await runMigrations();
  process.exit(0);
}
