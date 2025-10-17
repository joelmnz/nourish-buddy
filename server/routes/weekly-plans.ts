import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.ts';
import { planKeyEnum, shufflePlanSchema, updateWeeklyPlanSchema } from '../utils/validation/weeklyPlans.ts';
import * as weeklyPlanService from '../services/weeklyPlans.ts';

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

export const weeklyPlansRoutes = new Hono<{ Variables: Variables }>();

weeklyPlansRoutes.use('*', requireAuth);

weeklyPlansRoutes.get('/', async (c) => {
  const plans = await weeklyPlanService.getWeeklyPlans();
  return c.json(plans);
});

weeklyPlansRoutes.put('/:key', async (c) => {
  const key = c.req.param('key');
  const parsedKey = planKeyEnum.parse(key);
  
  const body = await c.req.json();
  const data = updateWeeklyPlanSchema.parse(body);
  
  await weeklyPlanService.updateWeeklyPlan(parsedKey, data.entries);
  
  return c.json({ ok: true });
});

weeklyPlansRoutes.post('/:key/shuffle', async (c) => {
  const key = c.req.param('key');
  const parsedKey = planKeyEnum.parse(key);
  
  const body = await c.req.json();
  const data = shufflePlanSchema.parse(body);
  
  if (data.scope === 'day' && data.day_index === undefined) {
    return c.json({ message: 'day_index is required for day scope' }, 400);
  }
  
  if (data.scope === 'cell' && (data.day_index === undefined || !data.slot_key)) {
    return c.json({ message: 'day_index and slot_key are required for cell scope' }, 400);
  }
  
  await weeklyPlanService.shuffleWeeklyPlan(
    parsedKey,
    data.scope,
    data.day_index,
    data.slot_key
  );
  
  return c.json({ ok: true });
});

weeklyPlansRoutes.post('/rollover', async (c) => {
  await weeklyPlanService.rolloverWeeklyPlans();
  return c.json({ ok: true });
});
