import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { DEFAULT_FEATURES_ENABLED } from '../../shared/types.ts';

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  remindersEnabled: integer('reminders_enabled', { mode: 'boolean' }).notNull().default(false),
  timeFormat: text('time_format', { enum: ['12', '24'] }).notNull().default('12'),
  firstDayOfWeek: integer('first_day_of_week').notNull().default(0),
  featuresEnabled: text('features_enabled').notNull().default(DEFAULT_FEATURES_ENABLED),
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
  platform: text('platform'),
  deviceName: text('device_name'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
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

export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  instructions: text('instructions'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  qty: text('qty').notNull(),
  item: text('item').notNull(),
  orderIndex: integer('order_index').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const recipeMealSlots = sqliteTable('recipe_meal_slots', {
  recipeId: integer('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  slotKey: text('slot_key', {
    enum: ['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER']
  }).notNull(),
});

export const weeklyPlans = sqliteTable('weekly_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key', { enum: ['THIS', 'NEXT'] }).notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const weeklyPlanEntries = sqliteTable('weekly_plan_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => weeklyPlans.id, { onDelete: 'cascade' }),
  dayIndex: integer('day_index').notNull(),
  slotKey: text('slot_key', {
    enum: ['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER']
  }).notNull(),
  recipeId: integer('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
