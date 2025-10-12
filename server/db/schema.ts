import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  remindersEnabled: integer('reminders_enabled', { mode: 'boolean' }).notNull().default(false),
  timeFormat: text('time_format', { enum: ['12', '24'] }).notNull().default('12'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const mealPlanSlots = sqliteTable('meal_plan_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slotKey: text('slot_key', {
    enum: ['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER']
  }).notNull().unique(),
  orderIndex: integer('order_index').notNull(),
  time24h: text('time_24h').notNull(),
  name: text('name').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const mealLogs = sqliteTable('meal_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  slotKey: text('slot_key', {
    enum: ['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER']
  }).notNull(),
  size: integer('size').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  scheduledTimeAtLog: text('scheduled_time_at_log').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const weights = sqliteTable('weights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),
  kg: real('kg').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  tz: text('tz').notNull(),
  userAgent: text('user_agent'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  lastSeenAt: text('last_seen_at'),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  ip: text('ip'),
  userAgent: text('user_agent'),
});

export const issues = sqliteTable('issues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  title: text('title').notNull(),
  severity: integer('severity').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
