import { z } from 'zod';
import { slotKeyEnum } from '../../../shared/types.ts';

export const ingredientSchema = z.object({
  qty: z.string().min(1).max(50),
  item: z.string().min(1).max(200),
});

export const createRecipeSchema = z.object({
  title: z.string().min(1).max(200),
  slot_keys: z.array(slotKeyEnum).default([]),
  ingredients: z.array(ingredientSchema).default([]),
  instructions: z.string().max(10000).optional().nullable(),
});

export const updateRecipeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slot_keys: z.array(slotKeyEnum).optional(),
  ingredients: z.array(ingredientSchema).optional(),
  instructions: z.string().max(10000).optional().nullable(),
});
