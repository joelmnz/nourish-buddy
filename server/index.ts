import { Hono } from 'hono';
import { serve } from 'bun';
import { serveStatic } from 'hono/bun';
import { getEnv } from './config/env.ts';
import { authMiddleware } from './middleware/auth.ts';
import { csrfMiddleware, csrfProtection } from './middleware/csrf.ts';
import { corsMiddleware } from './middleware/cors.ts';
import { securityHeadersMiddleware } from './middleware/security.ts';
import { errorHandler } from './middleware/error.ts';
import { authRoutes } from './routes/auth.ts';
import { settingsRoutes } from './routes/settings.ts';
import { mealPlanRoutes } from './routes/meal-plan.ts';
import { todayRoutes } from './routes/today.ts';
import { historyRoutes } from './routes/history.ts';
import { weightsRoutes } from './routes/weights.ts';
import { statsRoutes } from './routes/stats.ts';
import { exportRoutes } from './routes/export.ts';
import { pushRoutes } from './routes/push.ts';
import { issuesRoutes } from './routes/issues.ts';
import { recipesRoutes } from './routes/recipes.ts';
import { weeklyPlansRoutes } from './routes/weekly-plans.ts';
import { plannerRoutes } from './routes/planner.ts';
import { recipesApiRoutes } from './routes/recipiesApi.ts';
import { runMigrations } from './db/migrate.ts';
import { cleanupExpiredSessions } from './services/session.ts';
import { initializeScheduler } from './services/scheduler.ts';

type Variables = {
  auth: { authenticated: boolean };
  csrfToken: string;
};

const env = getEnv();
const app = new Hono<{ Variables: Variables }>();

app.use('*', securityHeadersMiddleware);
app.use('*', corsMiddleware());
app.use('*', csrfMiddleware);
app.use('*', csrfProtection);
app.use('*', authMiddleware);

app.onError(errorHandler);

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes with token-based authentication (no CSRF required)
app.route('/api/recipies', recipesApiRoutes);
app.route('/api/planner', plannerRoutes);

// Session-based routes (require login and CSRF)
app.route('/api/auth', authRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/meal-plan', mealPlanRoutes);
app.route('/api/recipes', recipesRoutes);
app.route('/api/weekly-plans', weeklyPlansRoutes);
app.route('/api/today', todayRoutes);
app.route('/api/history', historyRoutes);
app.route('/api/weights', weightsRoutes);
app.route('/api/stats', statsRoutes);
app.route('/api/export', exportRoutes);
app.route('/api/push', pushRoutes);
app.route('/api/issues', issuesRoutes);

// Serve static files from built client in production
if (env.NODE_ENV === 'production') {
  // Serve static assets (js, css, images, etc.)
  app.use('/assets/*', serveStatic({ root: './client/dist' }));
  app.use('/service-worker.js', serveStatic({ path: './client/dist/service-worker.js' }));
  app.use('/manifest.json', serveStatic({ path: './client/dist/manifest.json' }));
  app.use('/icon.svg', serveStatic({ path: './client/dist/icon.svg' }));
  app.use('/icon.svg', serveStatic({ path: './client/dist/icon.svg' }));
  app.use('/icon-192.png', serveStatic({ path: './client/dist/icon-192.png' }));
  app.use('/icon-512.png', serveStatic({ path: './client/dist/icon-512.png' }));
  
  // Serve index.html for all other routes (SPA fallback)
  app.get('*', serveStatic({ path: './client/dist/index.html' }));
}

await runMigrations();

setInterval(() => {
  cleanupExpiredSessions().catch(console.error);
}, 60 * 60 * 1000);

initializeScheduler();

serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`✓ Server running on port ${env.PORT}`);
console.log(`✓ Environment: ${env.NODE_ENV}`);
