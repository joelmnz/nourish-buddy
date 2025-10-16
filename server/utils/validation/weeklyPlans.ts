import { z } from 'zod';
import { slotKeyEnum } from '../../../shared/types.ts';

export const planKeyEnum = z.enum(['THIS', 'NEXT']);

export const shuffleScope = z.enum(['week', 'day', 'cell']);

export const shufflePlanSchema = z.object({
  scope: shuffleScope,
  day_index: z.number().int().min(0).max(6).optional(),
  slot_key: slotKeyEnum.optional(),
});

export const updatePlanEntrySchema = z.object({
  day_index: z.number().int().min(0).max(6),
  slot_key: slotKeyEnum,
  recipe_id: z.number().int().positive().nullable(),
});

export const updateWeeklyPlanSchema = z.object({
  entries: z.array(updatePlanEntrySchema),
});
