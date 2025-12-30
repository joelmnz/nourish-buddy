import { eq, like, and, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { recipes, recipeMealSlots, weeklyPlanEntries } from '../db/schema.ts';
import type { SlotKey } from '../../shared/types.ts';

export interface RecipeData {
  title: string;
  slot_keys: SlotKey[];
  instructions?: string | null;
}

export async function listRecipes(query?: string) {
  const db = await getDb();
  
  let recipesQuery = db.select({
    id: recipes.id,
    title: recipes.title,
  }).from(recipes);

  if (query && query.trim()) {
    recipesQuery = recipesQuery.where(like(recipes.title, `%${query.trim()}%`)) as any;
  }

  const recipesList = await recipesQuery.orderBy(recipes.title);
  
  const result = [];
  for (const recipe of recipesList) {
    const slots = await db.select({ slotKey: recipeMealSlots.slotKey })
      .from(recipeMealSlots)
      .where(eq(recipeMealSlots.recipeId, recipe.id));
    
    result.push({
      id: recipe.id,
      title: recipe.title,
      slot_keys: slots.map(s => s.slotKey),
    });
  }
  
  return result;
}

export async function getRecipe(id: number) {
  const db = await getDb();

  const recipe = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
  if (recipe.length === 0) return null;

  const recipeData = recipe[0]!;

  const slots = await db.select({ slotKey: recipeMealSlots.slotKey })
    .from(recipeMealSlots)
    .where(eq(recipeMealSlots.recipeId, id));

  return {
    id: recipeData.id,
    title: recipeData.title,
    instructions: recipeData.instructions,
    slot_keys: slots.map(s => s.slotKey),
  };
}

export async function createRecipe(data: RecipeData) {
  const db = await getDb();

  const result = await db.transaction(async (tx) => {
    const inserted = await tx.insert(recipes).values({
      title: data.title,
      instructions: data.instructions ?? null,
    }).returning({ id: recipes.id });

    const recipeId = inserted[0]!.id;

    if (data.slot_keys.length > 0) {
      await tx.insert(recipeMealSlots).values(
        data.slot_keys.map(slotKey => ({
          recipeId,
          slotKey,
        }))
      );
    }

    return recipeId;
  });

  return result;
}

export async function updateRecipe(id: number, data: Partial<RecipeData>) {
  const db = await getDb();

  await db.transaction(async (tx) => {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;

    if (Object.keys(updateData).length > 0) {
      await tx.update(recipes).set(updateData).where(eq(recipes.id, id));
    }

    if (data.slot_keys !== undefined) {
      await tx.delete(recipeMealSlots).where(eq(recipeMealSlots.recipeId, id));
      if (data.slot_keys.length > 0) {
        await tx.insert(recipeMealSlots).values(
          data.slot_keys.map(slotKey => ({
            recipeId: id,
            slotKey,
          }))
        );
      }
    }
  });
}

export async function deleteRecipe(id: number) {
  const db = await getDb();
  
  const usedInPlans = await db.select()
    .from(weeklyPlanEntries)
    .where(eq(weeklyPlanEntries.recipeId, id))
    .limit(1);
  
  if (usedInPlans.length > 0) {
    throw new Error('Cannot delete recipe that is used in weekly plans');
  }
  
  await db.delete(recipes).where(eq(recipes.id, id));
}

export async function listRecipesBySlotKey(slotKey: SlotKey) {
  const db = await getDb();
  
  // Find all recipe IDs associated with this slot key
  const recipeSlots = await db.select({ recipeId: recipeMealSlots.recipeId })
    .from(recipeMealSlots)
    .where(eq(recipeMealSlots.slotKey, slotKey));
  
  if (recipeSlots.length === 0) {
    return [];
  }
  
  const recipeIds = recipeSlots.map(rs => rs.recipeId);
  
  // Get the recipes with those IDs
  const recipesList = await db.select({
    id: recipes.id,
    title: recipes.title,
  })
    .from(recipes)
    .where(inArray(recipes.id, recipeIds))
    .orderBy(recipes.title);
  
  return recipesList.map(r => ({
    id: r.id,
    title: r.title,
  }));
}
