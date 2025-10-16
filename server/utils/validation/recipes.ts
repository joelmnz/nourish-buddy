import { z } from 'zod';

export const slotKeyEnum = z.enum(['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER']);

export const ingredientSchema = z.object({
  qty: z.string().min(1).max(50),
  item: z.string().min(1).max(200),
});

export const createRecipeSchema = z.object({
  title: z.string().min(1).max(200),
  slot_keys: z.array(slotKeyEnum).min(1),
  ingredients: z.array(ingredientSchema).default([]),
  instructions: z.string().max(10000).optional().nullable(),
});

export const updateRecipeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slot_keys: z.array(slotKeyEnum).min(1).optional(),
  ingredients: z.array(ingredientSchema).optional(),
  instructions: z.string().max(10000).optional().nullable(),
});
