
## 2026-02-07 - [SPA Code Splitting]
**Learning:** The application was using synchronous imports for all routes, leading to a monolithic bundle. This is a common anti-pattern in React SPAs.
**Action:** Use `React.lazy` and `Suspense` for route components to enable code splitting and reduce initial load time, especially for the landing page.
