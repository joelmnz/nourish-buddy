## 2026-02-07 - [Phantom CSRF Protection]
**Vulnerability:** The application had `csrfMiddleware` applied globally and a `requireCSRF` function defined, but `requireCSRF` was never actually used in any route. This created a false sense of security where tokens were generated and cookies set, but never validated.
**Learning:** Presence of security middleware code (like token generation) does not guarantee enforcement. Always verify that validation logic is actually wired into the request pipeline.
**Prevention:** Use a "secure by default" middleware approach where protection is applied globally and specific routes are opted-out, rather than relying on manual application to individual routes (which can be forgotten).
