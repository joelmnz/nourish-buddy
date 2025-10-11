
Summary:
- Build a simple, secure, single-user PWA called “Nourish Buddy” for Android.
- Core: daily reminders via Web Push for 7 daily meals; quick logging of meal sizes (0–5) and notes; progress graphs; weight tracking; CSV export.
- Tech: React + TypeScript + Vite (Bun), Hono server on Bun, SQLite + Drizzle ORM, Docker deploy, behind your own proxy.
- Auth: single admin via env vars, 30-day session, CSRF, CORS, secure cookies.
- PWA: dark theme, mobile-first, offline UI cache (no offline writes), push notifications with VAPID.
- Defaults: single repeating meal plan, 12h/24h switch in settings, kg only, deletions allowed, export-all CSVs.

Feature Spec: Nourish Buddy

1) Goals and non-goals
- Goals
  - Help parents remember meal times and quickly log meal size (0–5) and notes.
  - Show daily meal progress (last 14 days average) and weight over time.
  - Simple single-user app with secure login.
  - PWA with Android Web Push reminders at scheduled meal times.
- Non-goals
  - Multi-user accounts or roles.
  - Offline data writes or background sync.
  - Per-day meal plans or plan history.
  - iOS support.

2) Tech stack
- Frontend: React 18 + TypeScript, Vite (built with Bun), Tailwind CSS, Headless UI/Radix primitives, react-chartjs-2 + Chart.js, vite-plugin-pwa.
- Backend: Bun runtime + Hono (TypeScript), Drizzle ORM with better-sqlite3, web-push for VAPID push, node-cron for scheduling, zod for validation.
- Database: SQLite (file), persisted via Docker volume.
- Deployment: Docker image (multi-stage), runs behind your proxy/load balancer. HTTPS required for PWA + Push.
- Testing: Vitest (unit), minimal API tests, basic Playwright smoke optional.

3) Environment variables
- ADMIN_USERNAME
- ADMIN_PASSWORD_HASH (bcrypt)
- SESSION_SECRET (random 32+ bytes)
- DATABASE_PATH (e.g., /data/nourish.sqlite)
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT (e.g., mailto:admin@example.com)
- ALLOWED_ORIGIN (https://app.example.com)
- NODE_ENV=production
- PORT=8080

4) Data model (Drizzle + SQLite)
- settings (singleton id=1)
  - id INTEGER PK
  - reminders_enabled BOOLEAN NOT NULL DEFAULT 0
  - time_format TEXT CHECK(time_format IN ('12','24')) NOT NULL DEFAULT '12'
  - created_at DATETIME, updated_at DATETIME
- meal_plan_slots (fixed 7 rows; editable content)
  - id INTEGER PK
  - slot_key TEXT CHECK(slot_key IN ('BREAKFAST','SNACK_1','LUNCH','SNACK_2','DINNER','DESSERT','SUPPER')) UNIQUE NOT NULL
  - order_index INTEGER NOT NULL
  - time_24h TEXT NOT NULL (HH:mm)
  - name TEXT NOT NULL
  - notes TEXT NULL
  - created_at DATETIME, updated_at DATETIME
- meal_logs
  - id INTEGER PK
  - date TEXT NOT NULL (YYYY-MM-DD)
  - slot_key TEXT NOT NULL (same enum as above)
  - size INTEGER NOT NULL CHECK(size BETWEEN 0 AND 5)
  - completed BOOLEAN NOT NULL DEFAULT 1
  - notes TEXT NULL
  - scheduled_time_at_log TEXT NOT NULL (HH:mm snapshot)
  - created_at DATETIME, updated_at DATETIME
  - UNIQUE(date, slot_key)
- weights
  - id INTEGER PK
  - date TEXT NOT NULL UNIQUE (YYYY-MM-DD)
  - kg REAL NOT NULL CHECK(kg > 0)
  - created_at DATETIME, updated_at DATETIME
- push_subscriptions
  - id INTEGER PK
  - endpoint TEXT UNIQUE NOT NULL
  - p256dh TEXT NOT NULL
  - auth TEXT NOT NULL
  - tz TEXT NOT NULL (IANA, e.g., America/Chicago)
  - user_agent TEXT NULL
  - enabled BOOLEAN NOT NULL DEFAULT 1
  - created_at DATETIME, last_seen_at DATETIME
- sessions
  - id INTEGER PK
  - token_hash TEXT UNIQUE NOT NULL (SHA-256 of token)
  - expires_at DATETIME NOT NULL
  - created_at DATETIME NOT NULL
  - ip TEXT, user_agent TEXT

5) Authentication and security
- Login form authenticates ADMIN_USERNAME + bcrypt compare to ADMIN_PASSWORD_HASH.
- Session cookie: HTTP-only, Secure, SameSite=Lax, 30-day rolling expiry; value is opaque token; server stores SHA-256 hash.
- CSRF: double submit token via x-csrf-token header and matching cookie.
- CORS: restrict to ALLOWED_ORIGIN, allow credentials; preflight handled.
- Headers: basic security headers (no sniff, frameguard sameorigin, referrer policy, content security policy self by default).
- Rate limiting: in-memory IP-based throttles for login and sensitive endpoints (e.g., 5/min).
- Input validation: zod on all request bodies and query params.
- Password never logged; structured error responses without secrets.

6) Notifications architecture (Android PWA)
- Permission flow: Settings toggle enables reminders -> request Notification + PushManager subscribe using VAPID_PUBLIC_KEY -> POST subscription with current IANA tz to backend.
- Scheduling: server uses node-cron to schedule one daily job per enabled subscription per meal_plan_slot at the subscription tz.
  - On server start, load all enabled subscriptions and schedule 7 jobs per subscription.
  - On meal plan change or settings.reminders_enabled change, reschedule.
  - If reminders_enabled=false, do not send notifications; optionally keep subs but skip delivery.
  - If a subscription 410/404s, mark enabled=false and unschedule.
- Notification payload:
  - Title: “Breakfast at 8:00 AM”
  - Body: “Time to log meal size and notes.”
  - Actions: [“Log meal”] opening / (home) focusing today’s plan.
- Service worker handles push event with showNotification and notificationclick to open/ focus client.

7) API design (all routes under /api; all responses JSON unless CSV noted)
- Auth
  - POST /api/auth/login { username, password } -> 200 set-cookie session + { ok: true }
  - POST /api/auth/logout -> 200 clears session
  - GET /api/auth/me -> { authenticated: boolean, username?: string }
- Settings
  - GET /api/settings -> settings
  - PUT /api/settings { reminders_enabled:boolean, time_format:'12'|'24' } -> updated settings; triggers reschedule if needed
- Meal plan
  - GET /api/meal-plan -> 7 slots ordered
  - PUT /api/meal-plan { slots: [{slot_key, time_24h, name, notes}] } -> save all; transactional; reschedule on success
- Today plan + logging
  - GET /api/today?date=YYYY-MM-DD -> { date, slots: [{slot_key, time_24h, name, notes, log?: {size, completed, notes}}] }
  - PUT /api/meals/log { date, slot_key, size:0-5, completed:boolean, notes?:string } -> upsert; returns full day data
  - DELETE /api/meals/log { date, slot_key } -> delete entry
- History
  - GET /api/history/dates -> [{ date, any_logs:boolean }]
  - GET /api/history/day?date=YYYY-MM-DD -> day detail with all slots + logs
- Weights
  - GET /api/weights -> [{ date, kg }]
  - POST /api/weights { date, kg } -> create/update (one per date)
  - DELETE /api/weights { date }
- Stats/graphs
  - GET /api/stats/meals?days=14 -> [{ date, average_size: number|null }] null if no logs that day
  - GET /api/stats/weights -> [{ date, kg }]
- CSV export (sets Content-Type text/csv; Content-Disposition attachment)
  - GET /api/export/meals.csv -> all-time meals: date,slot_key,scheduled_time,size,completed,notes
  - GET /api/export/weights.csv -> all-time weights: date,kg
- Push subscriptions
  - POST /api/push/subscribe { endpoint, keys:{p256dh,auth}, tz } -> stores or enables
  - POST /api/push/unsubscribe { endpoint } -> disables + unschedules
  - POST /api/push/heartbeat { endpoint, tz? } -> update last_seen_at and tz if changed
Notes: All non-auth endpoints require authenticated session + CSRF header. Time input/returns use 24h canonical on API; UI converts based on setting.

8) Frontend UX
- Global
  - Dark theme default, responsive for phones first.
  - Top nav: Dashboard, Meal Planning, Meal History, Weigh History, Settings, Logout.
  - Toasts for success/errors. Confirm dialogs for deletes. Unsaved changes guard on plan page.
- Home Dashboard
  - Line graph: last 14 days average meal size (0–5). Empty state if no data.
  - Today’s meal checklist (7 rows): time (formatted per setting), name, size selector 0–5 (segmented buttons), notes text area (expandable), checkbox “Completed”.
  - Save per-row instantly; show saved state; allow edit.
- Meal Planning
  - Editable 7-row table: columns Time (h:mm), Name, Notes; Time input masked and validated; manual Save button to persist all.
  - Prompt if navigating away with unsaved changes.
- Meal History
  - List of dates (most recent first) with count of logged meals. Tap a date to edit that day’s entries (same controls as Home).
  - Allow delete of individual meal logs on that date.
- Weigh History
  - Simple form to add/update weight for a date; list entries; delete entries.
  - Line graph of weight over time.
- Settings
  - Reminders toggle On/Off; shows permission status; buttons: Enable notifications, Test notification.
  - Time format toggle 12/24 hour.
  - CSV exports: buttons for Meals CSV and Weights CSV.
  - About: app version, placeholder icons note.

9) PWA details
- Manifest
  - name: Nourish Buddy; short_name: NourishBuddy
  - theme_color/background_color: dark neutral; display: standalone; start_url: /
  - Icons: generated placeholders (192, 512, maskable).
- Service worker
  - Precache app shell (vite-plugin-pwa), network-first for API with cache fallback for GET-only where safe; no offline writes.
  - Push event handler with notification actions; click to focus/open / and scroll to today section.
- Install prompt: show “Install app” CTA when eligible.

10) Scheduling logic specifics
- Use node-cron with tz option set to subscription.tz. Create 7 jobs per enabled subscription.
- Each job sends web-push notification with meal slot details from current plan.
- On meal_plan update or settings.reminders_enabled change:
  - Cancel existing jobs; recreate all jobs from DB state.
- On server start: rebuild schedules from DB.
- DST handled by IANA tz via cron library.

11) Validation and edge cases
- Meal size must be integer 0–5.
- scheduled_time_at_log is captured from current plan when logging to retain historical accuracy for CSV.
- If multiple devices are subscribed, each device receives its own push.
- If browser permission is denied, UI shows status and disables subscription.

12) Performance and reliability
- SQLite WAL mode for better concurrency.
- Indexes:
  - meal_logs: idx on date and on (date, slot_key unique)
  - weights: unique date
  - push_subscriptions: endpoint unique
  - sessions: token_hash unique, expires_at index
- Clean-up:
  - Daily job removes expired sessions and disables broken push subscriptions.

13) Docker/deployment
- Dockerfile (multi-stage)
  - Stage 1: bun install; build client with Vite; typecheck.
  - Stage 2: copy server, built client, node_modules needed at runtime, CA certs, sqlite3.
  - Runs as non-root user; exposes PORT.
- Volume: /data for DATABASE_PATH.
- Reverse proxy: document required headers and HTTPS. HSTS at proxy. Ensure ALLOWED_ORIGIN matches public URL.
- DEPLOYMENT.md includes:
  - Generating bcrypt hash for ADMIN_PASSWORD_HASH.
  - Generating VAPID keys via npx web-push generate-vapid-keys and configuring VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
  - Enabling HTTPS on proxy and allowing Web Push endpoints.
  - Example docker run and sample compose file.

14) Directory layout
- /app
  - /client (React)
    - src/components, pages, hooks, lib, styles
    - pwa: manifest, service-worker via vite-plugin-pwa
  - /server (Hono on Bun)
    - index.ts (server entry)
    - routes (auth, settings, meal-plan, meals, history, weights, export, push)
    - middleware (auth, csrf, cors, rate-limit, errors, security-headers)
    - db (drizzle schema, migrations, seed)
    - jobs (scheduler, push)
    - utils (validation zod, time, crypto)
  - /shared (types, DTOs)
  - Dockerfile, .dockerignore
  - DEPLOYMENT.md, README.md

15) Acceptance criteria
- Auth
  - Login with env credentials; session persists 30 days; CSRF enforced; logout clears session.
- Settings
  - Toggle reminders; if enabled and permission granted, device receives pushes at meal times; disabling stops future notifications.
  - Toggle 12/24 hour format; UI updates times.
- Meal Planning
  - Editable table for 7 slots; save persists; navigating away with unsaved edits prompts.
- Home Dashboard
  - 14-day line graph of average meal size; shows zero/empty for days with no data.
  - Today list shows seven meals; logging updates instantly; edit and delete logs.
- Meal History
  - Dates with logged meals listed; editing a day works; delete logs with confirmation.
- Weigh History
  - Add/update one weight per date; view as list and in line graph; delete works.
- CSV
  - Meals CSV and Weights CSV download entire history with correct columns.
- PWA/Push
  - Installable on Android; receives push when app closed; tapping notification opens app to today’s plan.
- Security
  - CORS restricted, secure cookies, basic security headers, rate limits in place.

16) Out of scope
- IOS push support, multi-user, per-day plans, background sync, quiet hours, lbs toggle.

Implementation plan
- Milestone 1: Project setup
  - Bun + Vite + React TS scaffold, Tailwind, vite-plugin-pwa.
  - Hono server on Bun; Drizzle + SQLite; base Dockerfile.
- Milestone 2: Auth + security
  - Env config, bcrypt verify, sessions, CSRF, CORS, headers, rate limit.
- Milestone 3: DB schema + migrations
  - settings, meal_plan_slots (seed 7 rows), meal_logs, weights, push_subscriptions, sessions.
- Milestone 4: API routes
  - settings, meal-plan, today/logs, history, weights, stats, export, push.
- Milestone 5: Frontend pages
  - Login, Home Dashboard (graph + today list), Meal Planning (editable table), Meal History, Weigh History, Settings.
  - Chart integration.
- Milestone 6: PWA + Push
  - Manifest, SW with push handlers; subscription UI; server scheduling and delivery; test end-to-end on Android.
- Milestone 7: Docker + docs
  - Finalize Dockerfile; DEPLOYMENT.md with VAPID and proxy notes; README; polish UX; tests.

INSTRUCTIONS: Build “Nourish Buddy” PWA (React + Bun + SQLite) with Android Web Push

Summary
Build a secure, single-user PWA to plan and track 7 daily meals for a child with an eating disorder. Provide Android Web Push reminders at meal times, log meal size (0–5) and notes, visualize progress over the last 14 days, track weight over time, and export CSVs. Stack: React TS + Vite (Bun), Hono server on Bun, SQLite (Drizzle), Docker deploy, behind existing proxy.

Scope of work
- Auth and security: env-based admin, 30-day sessions, CSRF, CORS, headers, rate limiting.
- Core features: Meal plan editor (7 slots), Today logging, Meal history, Weight history, Stats graphs, CSV export.
- PWA + Push: Installable, offline UI cache, Android Web Push with VAPID; server-side scheduling at meal times.
- Deployment: Dockerized app; DEPLOYMENT.md with VAPID and proxy setup.

Deliverables
- Repo with client, server, shared, Dockerfile, README, DEPLOYMENT.md.
- Drizzle migrations and seeds for 7 meal slots.
- Tests for auth, core APIs, and scheduling.

Tasks
- [ ] Initialize repo; Bun + Vite React TS; Tailwind; vite-plugin-pwa.
- [ ] Server scaffold with Hono on Bun; zod; error middleware; security headers.
- [ ] Drizzle ORM setup; SQLite connection; WAL mode; migrations.
- [ ] Implement DB schema: settings, meal_plan_slots, meal_logs, weights, push_subscriptions, sessions.
- [ ] Seed default 7 slots with sensible times and names.
- [ ] Auth: login/logout, session cookies (HTTP-only, Secure, SameSite=Lax), CSRF.
- [ ] CORS limited to ALLOWED_ORIGIN; rate limiting for login and write routes.
- [ ] Settings routes + UI (reminders toggle, time format, CSV buttons).
- [ ] Meal plan routes + UI editable table; unsaved changes guard; save all.
- [ ] Today routes + UI checklist with per-row save; notes and size 0–5; delete log.
- [ ] History routes + UI: list dates, edit day, delete logs.
- [ ] Weights routes + UI: add/update one per date, delete; graph view.
- [ ] Stats routes + UI: last 14 days average meal size; weight chart.
- [ ] CSV export endpoints; download UI buttons.
- [ ] PWA manifest, icons, SW with precache; install prompt CTA.
- [ ] Web Push: client subscription flow; server VAPID config; node-cron scheduling per subscription/slot/tz; test notification; unsubscribe handling.
- [ ] Dockerfile multi-stage build; run as non-root; /data volume; healthcheck.
- [ ] DEPLOYMENT.md: bcrypt hash, VAPID key generation, proxy/HTTPS config, env setup.
- [ ] Basic tests (Vitest) for auth, CRUD, and scheduling logic; lint/format.

Acceptance criteria
- Login with env creds; session persists 30 days; CSRF enforced; logout works.
- Edit and save 7-slot meal plan; navigation guard for unsaved edits.
- Today page logs size 0–5 and notes; updates visible immediately.
- Meal History shows dates; editing a date works; deletions require confirm.
- Weight History supports one entry per date; graph displays trend.
- Dashboard shows 14-day average meal size line; empty states handled.
- CSV export downloads all meals and weights.
- PWA installable; push reminders delivered on Android at configured times in device timezone; tapping opens app to Today.
- Secure headers present; CORS restricted; no mixed content; rate limits active.
- Docker image runs with SQLite volume; docs explain VAPID/proxy setup.

If this looks good, I’m ready to open the GitHub Issue as-is or tailor it to your repo template (labels, assignees, milestones).
