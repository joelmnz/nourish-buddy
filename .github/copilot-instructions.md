# Copilot Instructions for Nourish Buddy

This repo is a Bun + Hono API with a React + Vite client. There is ONE UI (client on :5173) and a separate API server (:8080). SQLite lives in `./data`. Drizzle ORM manages schema via TypeScript and runs migrations at boot.

## Architecture essentials

- Runtime and tooling
  - Bun everywhere (scripts, build, test). Do not use Node-specific CLIs by default.
  - Env is auto-loaded by Bun; don’t add dotenv.
- Layout
  - `server/` — Hono API, session auth (cookie + CSRF), CORS via `ALLOWED_ORIGIN`.
  - `client/` — React app (Vite, Tailwind v4), calls API at `VITE_API_URL` (defaults to `http://localhost:8080`).
  - `shared/` — cross-cutting TypeScript types.
  - `data/` — SQLite DB files, created on first run.
- Data
  - SQLite via `bun:sqlite` with Drizzle ORM.
  - Migrations and seed run in `server/db/migrate.ts` at server startup.
- Auth & Security
  - Single admin user from env vars: `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`.
  - Session token cookie; validation in `server/services/session.ts`.
  - CSRF token returned by `/api/auth/me` header `x-csrf-token`; clients must send it on non-GET.
  - CORS configured in `server/middleware/cors.ts` using `ALLOWED_ORIGIN`.
- Notifications
  - Web Push via VAPID keys; endpoints under `/api/push/*`. Scheduler rebuilds on subscribe/unsubscribe.

## Dev workflows

- Install deps
  - Root: `bun install`
  - Client: `cd client && bun install`
- Run dev (two terminals)
  - API: `bun run dev` (watches `server/index.ts`, port 8080)
  - Client: `bun run dev:client` (Vite on 5173)
- Build and start
  - `bun run build` then `bun run start` (serves built server; client is prebuilt)
- Database
  - Auto-created and migrated on API start.
  - Manual: `bun run db:migrate`, Drizzle Studio: `bun run db:studio`.
- Typecheck
  - `bun run typecheck` (server + client)
- Tests
  - If you add tests, prefer `bun test` in root.

## Environment & configuration

- Copy `.env.example` to `.env`.
- Required vars: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (bcrypt), `SESSION_SECRET` (>=32 chars), `ALLOWED_ORIGIN`, `PORT` (default 8080). VAPID keys for push are optional initially.
- Generate bcrypt hash: `bun run hash.js <password>`.
- Client can override API base with `VITE_API_URL` (e.g. `http://localhost:8081`). Keep `ALLOWED_ORIGIN` in sync.

## Patterns and conventions

- Server
  - Use Hono routers in `server/routes/*` and register under `/api/*` in `server/index.ts`.
  - Middlewares: security headers, CORS, CSRF, and auth are applied globally in `server/index.ts`.
  - DB access via Drizzle in `server/db/index.ts` and types from `server/db/schema.ts`.
  - Sessions in `server/services/session.ts` (token hashing via `server/utils/crypto.ts`).
- Client
  - All API calls go through `client/src/lib/api.ts`. It manages CSRF token and redirects on 401.
  - Pages live in `client/src/pages/*`; use hooks from `client/src/hooks/*`.
  - Set `VITE_API_URL` for non-default API endpoints.
- Scheduling & push
  - Push subscriptions in `server/routes/push.ts`; scheduling handled in `server/services/scheduler.ts`.

## Integration points

- CORS: Ensure `ALLOWED_ORIGIN` matches the client origin exactly (protocol + port).
- CSRF: Always call `/api/auth/me` first (or rely on api.ts) to cache `x-csrf-token` before POST/PUT/DELETE.
- Cookies: Include credentials on fetch; `api.ts` sets `credentials: 'include'`.

## Examples to follow

- API base and CSRF handling: `client/src/lib/api.ts`
- Env validation: `server/config/env.ts`
- Migration + seeding: `server/db/migrate.ts`
- Route structure: `server/routes/*.ts` (e.g., `auth.ts`, `settings.ts`, `today.ts`)

## What NOT to do

- Don’t introduce Node/Express tooling; stick with Bun + Hono.
- Don’t bypass `api.ts` for client requests unless necessary; it centralizes auth/CSRF/error handling.
- Don’t add dotenv; Bun already loads `.env`.

## When unsure

- Check `README.md` for run instructions and `.env` requirements.
- Prefer existing patterns in files referenced above.
