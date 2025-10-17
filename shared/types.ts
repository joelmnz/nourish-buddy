import { z } from 'zod';

export const SLOT_KEYS = [
  'BREAKFAST',
  'SNACK_1',
  'LUNCH',
  'SNACK_2',
  'DINNER',
  'DESSERT',
  'SUPPER',
] as const;

export type SlotKey = typeof SLOT_KEYS[number];

export const slotKeyEnum = z.enum(SLOT_KEYS);

export type TimeFormat = '12' | '24';

export interface Settings {
  id: number;
  remindersEnabled: boolean;
  timeFormat: TimeFormat;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanSlot {
  id: number;
  slotKey: SlotKey;
  orderIndex: number;
  time24h: string;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealLog {
  id: number;
  date: string;
  slotKey: SlotKey;
  size: number;
  completed: boolean;
  notes: string | null;
  scheduledTimeAtLog: string;
  createdAt: string;
  updatedAt: string;
}

export interface Weight {
  id: number;
  date: string;
  kg: number;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscription {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  tz: string;
  userAgent: string | null;
  enabled: boolean;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface Session {
  id: number;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
}

export interface TodaySlot {
  slotKey: SlotKey;
  time24h: string;
  name: string;
  notes: string | null;
  log?: {
    size: number;
    completed: boolean;
    notes: string | null;
  };
}

export interface TodayView {
  date: string;
  slots: TodaySlot[];
}

export interface DateWithLogs {
  date: string;
  anyLogs: boolean;
}

export interface MealStats {
  date: string;
  averageSize: number | null;
}

export interface WeightStats {
  date: string;
  kg: number;
}

export interface Issue {
  id: number;
  date: string;
  title: string;
  severity: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
