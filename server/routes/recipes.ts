import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.ts';
import { createRecipeSchema, updateRecipeSchema } from '../utils/validation/recipes.ts';
import * as recipeService from '../services/recipes.ts';

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const recipesRoutes = new Hono<{ Variables: Variables }>();

recipesRoutes.use('*', requireAuth);

recipesRoutes.get('/', async (c) => {
  const query = c.req.query('query');
  const recipes = await recipeService.listRecipes(query);
  return c.json({ recipes });
});

recipesRoutes.get('/by-slot/:slotKey', async (c) => {
  const slotKey = c.req.param('slotKey');
  const validSlots = ['BREAKFAST', 'SNACK_1', 'LUNCH', 'SNACK_2', 'DINNER', 'DESSERT', 'SUPPER'] as const;
  if (!validSlots.includes(slotKey as typeof validSlots[number])) {
    return c.json({ message: 'Invalid slot key' }, 400);
  }
  
  const recipes = await recipeService.listRecipesBySlotKey(slotKey as typeof validSlots[number]);
  return c.json({ recipes });
});

recipesRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400);
  
  const recipe = await recipeService.getRecipe(id);
  if (!recipe) return c.json({ message: 'Recipe not found' }, 404);
  
  return c.json(recipe);
});

recipesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createRecipeSchema.parse(body);
  
  const recipeId = await recipeService.createRecipe({
    title: data.title,
    slot_keys: data.slot_keys,
    ingredients: data.ingredients,
    instructions: data.instructions ?? null,
  });
  
  return c.json({ id: recipeId }, 201);
});

recipesRoutes.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400);
  
  const body = await c.req.json();
  const data = updateRecipeSchema.parse(body);
  
  const existing = await recipeService.getRecipe(id);
  if (!existing) return c.json({ message: 'Recipe not found' }, 404);
  
  await recipeService.updateRecipe(id, {
    title: data.title,
    slot_keys: data.slot_keys,
    ingredients: data.ingredients,
    instructions: data.instructions,
  });
  
  return c.json({ ok: true });
});

recipesRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400);
  
  try {
    await recipeService.deleteRecipe(id);
    return c.json({ ok: true });
  } catch (error: any) {
    if (error.message.includes('used in weekly plans')) {
      return c.json({ message: 'Cannot delete recipe that is used in weekly plans' }, 409);
    }
    throw error;
  }
});
