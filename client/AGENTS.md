# Client agent guidance

## Purpose

Build the React/Vite UI for meals, recipes, planning, weights, and settings, including the browser side of Web Push.

## Ownership

This guide covers `client/`: [src/](src/) (routes, views, hooks, and the browser API wrapper), [public/](public/) (manifest, icons, and service worker), and client tooling. Read the [server guide](../server/AGENTS.md) as well if the matching API changes.

## Local Contracts

- Use [src/lib/api.ts](src/lib/api.ts) for browser API calls. It uses `VITE_API_URL` when set and otherwise sends same-origin requests; [Vite config](vite.config.ts) does not proxy `/api`. For separate dev servers, set the API base (normally `http://localhost:8080`) and match the Vite origin in the server's `ALLOWED_ORIGIN`. Vite exposes `VITE_*` values to client code; never put secrets there.
- The JSON request helper sends cookies and attaches the cached `x-csrf-token` (fetched from `/api/auth/me`) for explicit non-GET methods, including login. It throws `ApiError` for non-success responses and redirects to `/login` on 401 unless already there. CSV export uses dedicated fetches in the same module; do not assume they go through the JSON helper.
- [src/main.tsx](src/main.tsx) registers the static [service worker](public/service-worker.js); [index.html](index.html) links the static [manifest](public/manifest.json). The worker handles push and notification clicks but does not cache the app for offline use. The Vite config uses the React plugin, not a PWA plugin.
- Use the existing CSS classes and tokens in [src/index.css](src/index.css), imported by `main.tsx`. [PostCSS](postcss.config.js) uses Autoprefixer, not Tailwind.

## Work Guidance

- See [src/App.tsx](src/App.tsx) for routing and provider placement. Put page views in `src/pages/`, reusable UI in `src/components/`, and auth/settings state behind the existing hooks and providers. Keep component filenames in PascalCase.
- Keep wire-to-UI mappings (such as `slot_key` to `slotKey`) in the API module. Check its request and response shapes against the corresponding server routes and consult [shared/types.ts](../shared/types.ts) before duplicating shared keys.
- For push or asset changes, keep the manifest, worker, and the [server's production static-file registration](../server/index.ts) in sync.

## Verification

- Use client lint (`bun run lint` from `client/`), including the TypeScript, React Hooks, and React Refresh rules in [eslint.config.js](eslint.config.js). Address warnings in changed code.
- Use the client build check in the [root guide](../AGENTS.md#commands); it checks both the referenced app and Vite-config projects before bundling. The root typecheck alone does not check those projects.

## Child DOX Index

None. This guide owns the entire `client/` subtree.
