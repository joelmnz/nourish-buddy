# AGENTS.md

- Build: `bun run build` (client then server). Prod: `bun run start`.
- Dev: `bun run dev` (API :8080) and `bun run dev:client` (Vite :5173).
- Install: `bun install` (root) and `cd client && bun install`.
- Typecheck: `bun run typecheck` (server + client).
- Test all: `bun test` (root). Single test: `bun test path/to/file.test.ts -t "Name|Regex"` or `bun test --test-name-pattern "partial"`.
- Lint (client): `cd client && bun run lint`.

- Runtime: Prefer Bun for scripts, build, and tests. Do not add dotenv; Bun auto-loads `.env`.
- Imports: Use ESM with explicit extensions for TS where present (tsconfig uses `allowImportingTsExtensions` + `verbatimModuleSyntax`). Group standard, third-party, then local. No default Node/Express.
- Formatting: Follow existing style (semicolons present, single quotes). Keep lines short and readable. Use Prettier defaults if unsure.
- Types: Strict TypeScript (`strict: true`). Prefer explicit return types for public APIs; use discriminated unions and `zod` for validation at route boundaries.
- Naming: camelCase for variables/functions, PascalCase for types/components, `UPPER_SNAKE_CASE` for env keys. File names kebab-case; React components in PascalCase files when in `components/`.
- Errors: Centralized API error handling. Server: throw `HTTPException` or `ZodError`; global `errorHandler` maps to JSON. Client: throw `ApiError` and redirect on 401 (see `client/src/lib/api.ts`).
- Security: Use middlewares for CORS, CSRF, security headers, and auth; register routes under `/api/*`. Send `x-csrf-token` from `/api/auth/me` on non-GET.
- DB: Use `bun:sqlite` + Drizzle. Run `bun run db:migrate`. Avoid `better-sqlite3`.
- Client API: Go through `client/src/lib/api.ts` to inherit CSRF/cookies. Set `VITE_API_URL` when needed; keep `ALLOWED_ORIGIN` consistent.
- Style/Lint (client): ESLint config extends `@eslint/js`, `typescript-eslint`, React Hooks, and React Refresh. Fix warnings before commit.
- Copilot rules: See `.github/copilot-instructions.md` for architecture, don’ts, and workflows; follow Bun-first guidance and integration patterns.
