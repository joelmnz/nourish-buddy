import { Hono } from 'hono';
import { requireApiToken } from '../middleware/apiToken.ts';
import * as recipeService from '../services/recipes.ts';

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const recipesApiRoutes = new Hono<{ Variables: Variables }>();

recipesApiRoutes.use('*', requireApiToken);

/**
 * GET /api/recipies
 * Returns a JSON list of all recipe names.
 * Note: The endpoint is intentionally named "recipies" (with 'i') as per requirements.
 */
recipesApiRoutes.get('/', async (c) => {
  const recipes = await recipeService.listRecipes();
  
  // Return just the recipe names as a simple array
  const recipeNames = recipes.map(r => r.title);
  
  return c.json({
    recipes: recipeNames,
  });
});
