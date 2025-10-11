# Nourish Buddy

A small full-stack app to help parents track meals, weights, and reminders for children with eating disorders.

- Backend: Bun + Hono, SQLite (via Drizzle ORM)
- Frontend: React + Vite + Tailwind
- Data: Local SQLite file in `./data/nourish.sqlite`
- Auth: Single admin account (cookie session + CSRF)
- Optional: Web Push notifications (VAPID)

## Deployment Options

- **Development**: Follow the setup instructions below for local development
- **Docker**: See [DOCKER.md](DOCKER.md) for containerized deployment

## Monorepo layout

- `server/` — Hono API (Bun runtime)
- `client/` — React UI (Vite dev server)
- `shared/` — Shared TypeScript types
- `data/` — SQLite DB files (created on first run)
- `.env` / `.env.example` — server configuration

Important: There is one UI (in `client`). The API runs on a different port and does not serve a separate user-facing UI.

## Prerequisites

- Bun (latest): https://bun.sh
- Node is not required, Vite runs under Bun in this repo
- Optional tooling: `openssl` (for secrets), `npx web-push` (for VAPID keys)

## Setup

1. Install dependencies

```bash
bun install
cd client && bun install
```

2. Copy the example env and adjust as needed

```bash
cp .env.example .env
```

Required variables (see `.env.example` for guidance):

- `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (bcrypt hash)
- `SESSION_SECRET` (32+ chars; base64 from `openssl rand -base64 32` works well)
- `ALLOWED_ORIGIN` (your frontend dev URL, usually `http://localhost:5173`)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (for push notifications; optional during initial setup)
- `PORT` (API port; default 8080)

Generate a password hash (example for password "admin"):

```bash
bun run hash.js admin
```

Paste the resulting hash into `ADMIN_PASSWORD_HASH` in `.env`.

The database will be created and migrated automatically on first API start (see `server/db/migrate.ts`).


## Running in development

Use two terminals: one for the API and one for the client UI.

Terminal 1 — API (default <http://localhost:8080>):

```bash
bun run dev
```

- Runs `server/index.ts` with Bun in watch mode
- Uses env from `.env`
- Auto-runs SQLite migrations and seeds defaults on boot

Terminal 2 — Client UI (default <http://localhost:5173>):

```bash
bun run dev:client
```

- Starts Vite dev server (React UI)
- The UI talks to the API at `http://localhost:8080` by default
- If you change the API port or host, set `VITE_API_URL` in `client/.env`

Login with the credentials you configured (defaults in `.env` are `admin` / `admin` if you kept the sample values).

If you open port 8080 in a browser you’re hitting the API, not a separate UI. The user-facing app is the Vite server on port 5173.


## Useful scripts (root)

- `bun run dev` — start API in watch mode
- `bun run dev:client` — start client (Vite) in dev mode
- `bun run build` — build client and server
- `bun run start` — run built server from `dist`
- `bun run db:migrate` — run migrations manually
- `bun run db:studio` — open Drizzle Studio
- `bun run typecheck` — type-check both server and client

From inside `client/` you can also run:

- `bun run dev`, `bun run build`, `bun run preview`


## Configuration details

- CORS: The API allows requests from `ALLOWED_ORIGIN`. In dev, keep this as the Vite URL (`http://localhost:5173`).
- Sessions: Cookie-based; secure flags vary by `NODE_ENV`.
- CSRF: Non-GET requests require a CSRF token. The client fetches it from `/api/auth/me` and sends it in the `x-csrf-token` header.
- Database: SQLite at `DATABASE_PATH` (default `./data/nourish.sqlite`). WAL mode is enabled.
- Push notifications (optional): Requires valid VAPID keys and HTTPS in production. Dev flows depend on your browser’s service worker support.


## Troubleshooting

- API 401 or CSRF errors: Ensure you’re logged in and the client is sending the `x-csrf-token` header (handled by `client/src/lib/api.ts`).
- CORS blocked: Verify `ALLOWED_ORIGIN` matches your Vite URL exactly, including protocol and port.
- Invalid environment configuration: Check `.env` values against validation in `server/config/env.ts`.
- DB issues: Delete the `./data` folder to reset the local DB (you’ll lose data), then restart the API to re-migrate/seed.
- Different ports: If you run API on a non-default port, set `VITE_API_URL` in `client/.env` and update `ALLOWED_ORIGIN` accordingly.


## License

See `LICENSE`.
