# Agent guidance for Nourish Buddy

Nourish Buddy is a PWA for meal planning, meal and weight tracking, and optional Web Push reminders. It has one React/Vite UI and a Bun/Hono API backed by SQLite and Drizzle.

## Read the DOX chain before editing

1. Read this file in the current session and identify all paths you expect to change.
2. Walk from the repo root to each target and read every `AGENTS.md` along the way. Use each parent's Child DOX Index to find the child that owns the target. Repeat for any new paths you take on.
3. Apply the whole chain. The nearest guide controls local details; it does not waive repo-wide rules or the DOX process. For changes that cross boundaries, read the chains on both sides.

## Commands

Run these from the repository root unless noted. Choose checks appropriate to the change; a docs-only change generally needs diff and link checks, not builds or services.

| Task | Command and behavior |
| --- | --- |
| Install | Run `bun install` at root, then `cd client && bun install`. Root and client have separate manifests and Bun lockfiles. |
| Develop | In separate terminals, `bun run dev` watches `server/index.ts` (API port defaults to 8080); `bun run dev:client` runs the Vite dev server from `client/` (normally 5173). |
| Build and start | `bun run build` runs `build:client` then `build:server`. The latter bundles to `dist/` for Bun. `bun run start` runs `dist/index.js` with `NODE_ENV=production` and serves the prebuilt UI from `client/dist`; it does not build either target. |
| Typecheck | `bun run typecheck` runs `tsc --noEmit` for `server/` and `shared/`, then `bunx tsc --noEmit` from `client/`. That second invocation uses a reference-only config and does not build/check its referenced projects. For those checks, use `bun run build:client` (runs `tsc -b` then `vite build`). |
| Test | `bun test` runs Bun's tests from root. Filter by file path with `bun test path/to/file.test.ts` and by test name with `-t 'NameOrRegex'` (also `--test-name-pattern`). |
| Lint client | `cd client && bun run lint` runs `eslint .`. |
| Local DB tooling | `bun run db:migrate` runs the app's migration and seed code against the configured SQLite database. `bun run db:generate` and `bun run db:studio` are Drizzle Kit commands using [drizzle.config.ts](drizzle.config.ts); generated migrations are not the startup migration path. |

The scripts are defined in the [root manifest](package.json) and [client manifest](client/package.json). See the [root TypeScript config](tsconfig.json) and [client reference config](client/tsconfig.json) for their scopes.

- `bun run precommit` explicitly runs [scripts/precommit.sh](scripts/precommit.sh). It installs dependencies in both packages (can update both lockfiles), runs the root typecheck, runs `bun test` if its test-file scan finds matches, and builds a local Docker image tagged `nourish-buddy:precommit-test`. It is not a read-only check and does not run client lint.
- The [Dockerfile](Dockerfile) builds the client and server in separate stages with frozen Bun lockfiles and ships both outputs in one image. The [Docker publish workflow](.github/workflows/docker-publish.yml) builds and publishes to GHCR on `release: created`; it is not a PR or push check.

## Project-wide practices

- Prefer Bun for installs, scripts, builds, and tests; use Hono for HTTP routing. Bun loads server `.env` files, so do not add dotenv. Do not commit credentials or local SQLite data.
- Use strict TypeScript and ESM. Group standard, third-party, then local imports; follow nearby extension and type-only import conventions. Match local formatting rather than reformatting unrelated code. Prefer explicit public return types when they clarify the contract and discriminated unions for distinct states. Use camelCase for variables/functions, PascalCase for types and components, and `UPPER_SNAKE_CASE` for environment keys. Prefer kebab-case for new non-component filenames unless the directory uses a different convention.
- Check the route, client mapping, and any shared definitions when changing API payloads. Use relevant source and configuration as the authority for current behavior, not unchecked claims in companion guides.

## Update and close out

- After every meaningful change, check the DOX chain for each changed path. Update the nearest owning guide when responsibilities, durable behavior, interfaces, commands, constraints, or side effects change. Record lasting user preferences at the appropriate scope, not one-off task details.
- Update affected parents and children when an ownership boundary or rule changes; keep the direct-child indexes and links current when guides are added, moved, or removed. Add a child only for a durable local contract. Remove obsolete guidance and keep project-wide rules here rather than copying them into children.
- If the change leaves durable contracts intact, leave the guides alone after reviewing them. Run applicable checks, including checking links and index coverage when editing the hierarchy, and report the results, any skipped checks, and intentional doc omissions.

## Child DOX Index

- [client/AGENTS.md](client/AGENTS.md) — browser app, API client, styling, PWA assets, and client verification.
- [server/AGENTS.md](server/AGENTS.md) — Hono entry point, route/auth contracts, persistence, and scheduling.

Root retains ownership of everything outside those subtrees, including:

- [shared/types.ts](shared/types.ts): shared types **and** runtime values (slot keys, a Zod slot enum, and feature keys/defaults). Check consumers on both sides and SQLite constraints or seeds when changing persisted keys. Keep server-only and browser-only dependencies out of shared code.
- [scripts/](scripts/): repo-level verification and tooling. `bun run icons` reads `client/public/icon.svg` and rewrites the 192px and 512px PNGs there; include the client chain when changing those assets.
- Root build/package/config files, `.github/` automation, repo-wide documentation, and `docs/` attribution.

## Attribution

This hierarchy adapts [Agent Zero's DOX guide at commit `765ae4ac02cc884eefcd41a3d0f71941721adb89`](https://github.com/agent0ai/dox/blob/765ae4ac02cc884eefcd41a3d0f71941721adb89/AGENTS.md). See the [upstream MIT notice](docs/licenses/agent0ai-dox.txt); it does not change the [project license](LICENSE).
