import { Hono } from 'hono';
import { getDb } from '../db/index.ts';
import { mealPlanSlots, weeklyPlans, weeklyPlanEntries, recipes } from '../db/schema.ts';
import { requireApiToken } from '../middleware/apiToken.ts';
import { eq, asc, and } from 'drizzle-orm';

export const plannerRoutes = new Hono();

plannerRoutes.use('*', requireApiToken);

/**
 * GET /api/planner/thisweek
 * Returns a JSON representation of the current weekly planner meal times and meals.
 */
plannerRoutes.get('/thisweek', async (c) => {
  const db = await getDb();
  
  // Get the "THIS" week plan
  const plan = await db.select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.key, 'THIS'))
    .limit(1);
  
  if (plan.length === 0) {
    return c.json({ error: 'Weekly plan not found' }, 404);
  }
  
  const planId = plan[0]!.id;
  
  // Get all meal plan slots (meal times)
  const slots = await db.select()
    .from(mealPlanSlots)
    .orderBy(asc(mealPlanSlots.orderIndex));
  
  // Get all entries for this week's plan
  const entries = await db.select({
    day_index: weeklyPlanEntries.dayIndex,
    slot_key: weeklyPlanEntries.slotKey,
    recipe_id: weeklyPlanEntries.recipeId,
    recipe_title: recipes.title,
  })
    .from(weeklyPlanEntries)
    .leftJoin(recipes, eq(weeklyPlanEntries.recipeId, recipes.id))
    .where(eq(weeklyPlanEntries.planId, planId))
    .orderBy(weeklyPlanEntries.dayIndex, weeklyPlanEntries.slotKey);
  
  // Create a map of entries by day and slot
  const entriesMap = new Map<string, typeof entries[0]>();
  for (const entry of entries) {
    const key = `${entry.day_index}-${entry.slot_key}`;
    entriesMap.set(key, entry);
  }
  
  // Build the weekly view with 7 days (0-6)
  const weekView = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayMeals = [];
    
    for (const slot of slots) {
      const key = `${dayIndex}-${slot.slotKey}`;
      const entry = entriesMap.get(key);
      
      dayMeals.push({
        meal_name: slot.name,
        time_24h: slot.time24h,
        slot_key: slot.slotKey,
        recipe_title: entry?.recipe_title ?? null,
        recipe_id: entry?.recipe_id ?? null,
      });
    }
    
    weekView.push({
      day_index: dayIndex,
      meals: dayMeals,
    });
  }
  
  return c.json({
    plan_key: 'THIS',
    week: weekView,
  });
});

/**
 * GET /api/planner/today
 * Returns a JSON representation of the plan for today (based on server's current date).
 * Shows meal names and recipe names for each meal.
 */
plannerRoutes.get('/today', async (c) => {
  const db = await getDb();
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]!;
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = today.getDay();
  
  // Get the "THIS" week plan
  const plan = await db.select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.key, 'THIS'))
    .limit(1);
  
  if (plan.length === 0) {
    return c.json({ error: 'Weekly plan not found' }, 404);
  }
  
  const planId = plan[0]!.id;
  
  // Get all meal plan slots (meal times)
  const slots = await db.select()
    .from(mealPlanSlots)
    .orderBy(asc(mealPlanSlots.orderIndex));
  
  // Get entries for today (based on day of week)
  const entries = await db.select({
    slot_key: weeklyPlanEntries.slotKey,
    recipe_id: weeklyPlanEntries.recipeId,
    recipe_title: recipes.title,
  })
    .from(weeklyPlanEntries)
    .leftJoin(recipes, eq(weeklyPlanEntries.recipeId, recipes.id))
    .where(
      and(
        eq(weeklyPlanEntries.planId, planId),
        eq(weeklyPlanEntries.dayIndex, dayOfWeek)
      )
    );
  
  // Create a map of entries by slot
  const entriesMap = new Map<string, typeof entries[0]>();
  for (const entry of entries) {
    entriesMap.set(entry.slot_key, entry);
  }
  
  // Build today's meals
  const todayMeals = slots.map(slot => {
    const entry = entriesMap.get(slot.slotKey);
    
    return {
      meal_name: slot.name,
      time_24h: slot.time24h,
      slot_key: slot.slotKey,
      recipe_title: entry?.recipe_title ?? null,
      recipe_id: entry?.recipe_id ?? null,
    };
  });
  
  return c.json({
    date: todayStr,
    day_of_week: dayOfWeek,
    meals: todayMeals,
  });
});
