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
cd client && cp .env.example .env
```

Required variables (see `.env.example` for guidance):

- `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (bcrypt hash)
- `SESSION_SECRET` (32+ chars; base64 from `openssl rand -base64 32` works well)
- `ALLOWED_ORIGIN` (your frontend dev URL, usually `http://localhost:5173`)
- `PORT` (API port; default 8080)

Optional variables for push notifications:

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — all three must be set together, or none
- If not configured, push notifications will be disabled but the app will work normally

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
- Uses env from `client/.env` (set `VITE_API_URL=http://localhost:8080` for dev)
- In production, the client uses same-origin (relative) API requests

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
- `bun run precommit` — validate before pushing (updates lockfiles, typecheck, tests, Docker build)

From inside `client/` you can also run:

- `bun run dev`, `bun run build`, `bun run preview`


## Configuration details

- CORS: The API allows requests from `ALLOWED_ORIGIN`. In dev, keep this as the Vite URL (`http://localhost:5173`).
- Sessions: Cookie-based; secure flags vary by `NODE_ENV`.
- CSRF: Non-GET requests require a CSRF token. The client fetches it from `/api/auth/me` and sends it in the `x-csrf-token` header.
- Database: SQLite at `DATABASE_PATH` (default `./data/nourish.sqlite`). WAL mode is enabled.
- Push notifications (optional): All three VAPID keys must be configured together. If not set, push notifications are disabled gracefully. In production, HTTPS is required for service workers.


## Troubleshooting

- API 401 or CSRF errors: Ensure you’re logged in and the client is sending the `x-csrf-token` header (handled by `client/src/lib/api.ts`).
- CORS blocked: Verify `ALLOWED_ORIGIN` matches your Vite URL exactly, including protocol and port.
- Invalid environment configuration: Check `.env` values against validation in `server/config/env.ts`.
- DB issues: Delete the `./data` folder to reset the local DB (you’ll lose data), then restart the API to re-migrate/seed.
- Different ports: If you run API on a non-default port, set `VITE_API_URL` in `client/.env` and update `ALLOWED_ORIGIN` accordingly.

## Cloudflare Tunnel / reverse proxy

If you deploy behind Cloudflare Tunnel (or another reverse proxy that terminates TLS and forwards to your container), your browser origin may not match the API host directly. This can trigger CORS and CSP blocks by default.

To support this scenario safely, enable a permissive mode in the server and ensure cookies work cross-origin:

1. Environment variables

- `VITE_API_URL`: Set to your public API URL (the tunnel URL), for example `https://api.example-tunnel.cfargotunnel.com`.
- `ALLOWED_ORIGIN`: Set to your frontend’s public URL (e.g., `https://app.example.com`).
- `INSECURE_DISABLE_ORIGIN_CHECKS=true`: Enables dynamic CORS (reflects the request Origin), relaxes CSP `connect-src` so the browser can call the API, and sets cookies with `SameSite=None; Secure` for cross-origin.

1. HTTPS required for cookies

When `SameSite=None` is used, browsers require the `Secure` flag and an HTTPS origin. Cloudflare Tunnel provides HTTPS at the edge, so this requirement is met as long as you use the tunnel URL in the browser.

1. Docker compose tip

Set the variables on the server container. Example:

```yaml
environment:
  NODE_ENV: production
  PORT: 8080
  ADMIN_USERNAME: ${ADMIN_USERNAME}
  ADMIN_PASSWORD_HASH: ${ADMIN_PASSWORD_HASH}
  SESSION_SECRET: ${SESSION_SECRET}
  VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
  VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
  VAPID_SUBJECT: ${VAPID_SUBJECT}
  ALLOWED_ORIGIN: https://app.example.com
  INSECURE_DISABLE_ORIGIN_CHECKS: "true"
```

On the client side, build with:

```bash
VITE_API_URL=https://api.example-tunnel.cfargotunnel.com bun run build:client
```

1. Notes

- This mode is less strict and meant for controlled setups behind trusted tunnels/CDNs. If you later host the API and client on the same origin/domain, set `INSECURE_DISABLE_ORIGIN_CHECKS=false` and keep `ALLOWED_ORIGIN` strict.
- If you still see login issues: open the browser dev tools, check the Network tab and Console for CSP or CORS errors, verify cookies are being set with `SameSite=None; Secure`, and ensure responses include the `x-csrf-token` header from `/api/auth/me`.


## License

See `LICENSE`.
