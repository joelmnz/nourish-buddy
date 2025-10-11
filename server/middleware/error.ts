import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export async function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);
  
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  
  if (err instanceof ZodError) {
    return c.json({ 
      error: 'Validation failed',
      details: err.issues.map((e) => ({ path: e.path.join('.'), message: e.message }))
    }, 400);
  }
  
  return c.json({ error: 'Internal server error' }, 500);
}
