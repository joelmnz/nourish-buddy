# Server agent guidance

## Purpose

Run the Hono API, SQLite persistence, session/auth middleware, and reminder scheduling on Bun. In production the same process serves the built client.

## Ownership

This guide covers `server/`: the [entry point](index.ts), [routes](routes/), [middleware](middleware/), [database](db/), [services](services/), configuration, and utilities. Deployment tooling and shared definitions are root-owned.

## Local Contracts

- Mount Hono routers under `/api/*` in [index.ts](index.ts), which also exposes `/health` and serves the built SPA and PWA assets in production. It installs security headers, CORS, CSRF, and session-context middleware globally. The session middleware sets context; enforce login on protected routes with `requireAuth` from [middleware/auth.ts](middleware/auth.ts), as in [routes/recipes.ts](routes/recipes.ts).
- Keep the two API auth contracts distinct. Browser routes use cookie sessions; [routes/auth.ts](routes/auth.ts) exposes `GET /api/auth/me` with the `x-csrf-token` response header. [CSRF protection](middleware/csrf.ts) requires a matching cookie and header for session-route methods other than GET, HEAD, and OPTIONS, including login and logout. `/api/recipies` (intentional spelling) and `/api/planner` are separate bearer-token routers guarded by [requireApiToken](middleware/apiToken.ts), not session routes; they are exempt from CSRF validation.
- [config/env.ts](config/env.ts) defines server configuration: `ADMIN_USERNAME`, either `ADMIN_PASSWORD_HASH` or `ADMIN_PASSWORD`, `SESSION_SECRET` of at least 32 characters, and `ALLOWED_ORIGIN` are required; `PORT` and `DATABASE_PATH` have defaults. Prefer a password hash for deployment. VAPID settings are all-or-none and `API_TOKEN` is optional. Keep [CORS](middleware/cors.ts) aligned with the browser origin.
- Use [db/index.ts](db/index.ts) for `bun:sqlite` and Drizzle access; it enables WAL and foreign keys. Keep [db/schema.ts](db/schema.ts) aligned with the SQL and seeds in [db/migrate.ts](db/migrate.ts), which the entry point runs before serving requests.
- Weight notes are nullable plain text, limited by `WEIGHT_NOTES_MAX_LENGTH` in shared types. On date upsert, omitted notes preserve an existing note; null or whitespace-only clears it. Nonblank text is stored verbatim.
- Web Push routes live in [routes/push.ts](routes/push.ts); [services/scheduler.ts](services/scheduler.ts) manages reminder scheduling. When changing subscription state or meal times, check whether schedules need to be rebuilt.

## Work Guidance

- Validate route inputs with Zod; use `HTTPException` or let Zod parse errors reach the [global JSON error handler](middleware/error.ts) as appropriate. Preserve existing API status and payload contracts when refactoring; not every route error uses the same JSON shape.
- For schema changes, consider upgrades of existing databases as well as fresh initialization. Use a disposable local database for migration verification, not live data.
- Follow the local ESM convention of explicit `.ts` extensions and type-only imports. For browser-facing API changes, check the [client API wrapper](../client/src/lib/api.ts) and read the [client guide](../client/AGENTS.md) before changing it.

## Verification

- For server TypeScript changes, use the root `bun run typecheck`; for server bundling use `bun run build:server`. Run relevant tests with `bun test` from the root when present.
- For persistence changes, `bun run db:migrate` exercises migration and seeding against the configured database. Run it only with a disposable test database and appropriate local configuration.

## Child DOX Index

None. This guide owns the entire `server/` subtree.
