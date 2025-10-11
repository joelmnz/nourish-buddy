
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Project Structure

This is a monorepo with separate client and server:
- **server/** - Hono backend with SQLite (bun:sqlite) + Drizzle ORM
- **client/** - React + Vite + Tailwind CSS v4 frontend
- **shared/** - Shared TypeScript types

## Development

Start both dev servers concurrently:
```bash
bun run dev          # Server on :8080
bun run dev:client   # Client on :5173
```

Or separately:
```bash
bun run --watch server/index.ts    # Server with hot reload
cd client && bun run dev           # Client with Vite HMR
```

## Database

Using **bun:sqlite** (not better-sqlite3):
```ts
import { Database } from 'bun:sqlite';
const db = new Database('./data/db.sqlite', { create: true });
db.run('PRAGMA journal_mode = WAL');
```

Drizzle ORM with bun-sqlite:
```ts
import { drizzle } from 'drizzle-orm/bun-sqlite';
const orm = drizzle(db, { schema });
```

Run migrations:
```bash
bun run db:migrate    # Creates tables & seeds defaults
```

## Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Required variables (see .env.example for generation commands):
- ADMIN_USERNAME / ADMIN_PASSWORD_HASH
- SESSION_SECRET (32+ chars)
- VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
- DATABASE_PATH
- ALLOWED_ORIGIN (http://localhost:5173 for dev)

## Build & Deploy

```bash
bun run build        # Builds both client and server
bun run start        # Production server (serves built client)
```

## Testing

TypeScript typecheck:
```bash
bun run typecheck    # Checks server (root) and client
```

## Client - Tailwind CSS v4

Using **@tailwindcss/postcss** (not the old tailwindcss plugin):
```js
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

## Default Admin Credentials

Username: `admin`  
Password: `admin`

**Change these in production!**

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.
