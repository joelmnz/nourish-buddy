import { eq, and, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { weeklyPlans, weeklyPlanEntries, recipeMealSlots, mealPlanSlots, recipes } from '../db/schema.ts';
import { asc } from 'drizzle-orm';

interface PlanEntry {
  day_index: number;
  slot_key: 'BREAKFAST' | 'SNACK_1' | 'LUNCH' | 'SNACK_2' | 'DINNER' | 'DESSERT' | 'SUPPER';
  recipe_id: number | null;
  recipe_title?: string | null;
}

export async function getWeeklyPlans() {
  const db = await getDb();
  
  const plans = await db.select().from(weeklyPlans).orderBy(weeklyPlans.key);
  
  const result: any = {};
  for (const plan of plans) {
    const entries = await db.select({
      day_index: weeklyPlanEntries.dayIndex,
      slot_key: weeklyPlanEntries.slotKey,
      recipe_id: weeklyPlanEntries.recipeId,
      recipe_title: recipes.title,
    })
      .from(weeklyPlanEntries)
      .leftJoin(recipes, eq(weeklyPlanEntries.recipeId, recipes.id))
      .where(eq(weeklyPlanEntries.planId, plan.id))
      .orderBy(weeklyPlanEntries.dayIndex, weeklyPlanEntries.slotKey);
    
    result[plan.key] = {
      id: plan.id,
      key: plan.key,
      entries: entries.map(e => ({
        day_index: e.day_index,
        slot_key: e.slot_key,
        recipe_id: e.recipe_id,
        recipe_title: e.recipe_title,
      })),
    };
  }
  
  return result;
}

export async function updateWeeklyPlan(planKey: 'THIS' | 'NEXT', entries: PlanEntry[]) {
  const db = await getDb();
  
  await db.transaction(async (tx) => {
    const plan = await tx.select().from(weeklyPlans).where(eq(weeklyPlans.key, planKey)).limit(1);
    if (plan.length === 0) throw new Error('Plan not found');
    
    const planId = plan[0]!.id;
    
    await tx.delete(weeklyPlanEntries).where(eq(weeklyPlanEntries.planId, planId));
    
    if (entries.length > 0) {
      await tx.insert(weeklyPlanEntries).values(
        entries.map(entry => ({
          planId,
          dayIndex: entry.day_index,
          slotKey: entry.slot_key,
          recipeId: entry.recipe_id,
        }))
      );
    }
  });
}

export async function shuffleWeeklyPlan(
  planKey: 'THIS' | 'NEXT',
  scope: 'week' | 'day' | 'cell',
  dayIndex?: number,
  slotKey?: string
) {
  const db = await getDb();
  
  const plan = await db.select().from(weeklyPlans).where(eq(weeklyPlans.key, planKey)).limit(1);
  if (plan.length === 0) throw new Error('Plan not found');
  
  const planId = plan[0]!.id;
  
  type SlotKey = 'BREAKFAST' | 'SNACK_1' | 'LUNCH' | 'SNACK_2' | 'DINNER' | 'DESSERT' | 'SUPPER';
  let targetEntries: Array<{ dayIndex: number; slotKey: SlotKey }> = [];
  
  if (scope === 'week') {
    const slots = await db.select({ slotKey: mealPlanSlots.slotKey })
      .from(mealPlanSlots)
      .orderBy(asc(mealPlanSlots.orderIndex));
    
    for (let day = 0; day < 7; day++) {
      for (const slot of slots) {
        targetEntries.push({ dayIndex: day, slotKey: slot.slotKey as SlotKey });
      }
    }
  } else if (scope === 'day' && dayIndex !== undefined) {
    const slots = await db.select({ slotKey: mealPlanSlots.slotKey })
      .from(mealPlanSlots)
      .orderBy(asc(mealPlanSlots.orderIndex));
    
    for (const slot of slots) {
      targetEntries.push({ dayIndex, slotKey: slot.slotKey as SlotKey });
    }
  } else if (scope === 'cell' && dayIndex !== undefined && slotKey) {
    targetEntries.push({ dayIndex, slotKey: slotKey as SlotKey });
  }
  
  await db.transaction(async (tx) => {
    for (const entry of targetEntries) {
      const availableRecipes = await tx.select({
        id: recipes.id,
      })
        .from(recipes)
        .innerJoin(recipeMealSlots, eq(recipes.id, recipeMealSlots.recipeId))
        .where(eq(recipeMealSlots.slotKey, entry.slotKey));
      
      if (availableRecipes.length === 0) continue;
      
      const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)]!;
      
      const existing = await tx.select()
        .from(weeklyPlanEntries)
        .where(
          and(
            eq(weeklyPlanEntries.planId, planId),
            eq(weeklyPlanEntries.dayIndex, entry.dayIndex),
            eq(weeklyPlanEntries.slotKey, entry.slotKey)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        await tx.update(weeklyPlanEntries)
          .set({ recipeId: randomRecipe.id })
          .where(eq(weeklyPlanEntries.id, existing[0]!.id));
      } else {
        await tx.insert(weeklyPlanEntries).values({
          planId,
          dayIndex: entry.dayIndex,
          slotKey: entry.slotKey,
          recipeId: randomRecipe.id,
        });
      }
    }
  });
}

export async function rolloverWeeklyPlans() {
  const db = await getDb();
  
  await db.transaction(async (tx) => {
    const plans = await tx.select().from(weeklyPlans);
    const thisPlan = plans.find(p => p.key === 'THIS');
    const nextPlan = plans.find(p => p.key === 'NEXT');
    
    if (!thisPlan || !nextPlan) throw new Error('Plans not found');
    
    const nextEntries = await tx.select()
      .from(weeklyPlanEntries)
      .where(eq(weeklyPlanEntries.planId, nextPlan.id));
    
    await tx.delete(weeklyPlanEntries).where(eq(weeklyPlanEntries.planId, thisPlan.id));
    
    if (nextEntries.length > 0) {
      await tx.insert(weeklyPlanEntries).values(
        nextEntries.map(entry => ({
          planId: thisPlan.id,
          dayIndex: entry.dayIndex,
          slotKey: entry.slotKey,
          recipeId: entry.recipeId,
        }))
      );
    }
    
    await tx.delete(weeklyPlanEntries).where(eq(weeklyPlanEntries.planId, nextPlan.id));
  });
}
