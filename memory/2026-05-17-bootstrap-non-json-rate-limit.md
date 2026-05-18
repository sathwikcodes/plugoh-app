# Bootstrap Non-JSON Rate Limit Debug Report

- Date: 2026-05-17
- Symptom: Mobile sometimes showed `Non-JSON error response for /me/bootstrap` and the app bootstrap error screen.
- Root cause: `hono-rate-limiter` returns plain text for 429 responses by default. `/me/bootstrap` can hit the authenticated route limiter during repeated startup/reload/refetch cycles, so the mobile API client received `text/plain` instead of the Plugoh JSON envelope.
- Fix: `services/api/src/modules/bootstrap.ts` now supplies a shared rate-limit handler that returns `fail(c, 429, "RATE_LIMITED", ...)` for all API rate limiters.
- Regression test: `services/api/src/foundation-hardening.test.ts` now verifies authenticated `/me/bootstrap` rate limiting returns `application/json` with `RATE_LIMITED`.
- Verification: The new test failed before the fix with `text/plain; charset=UTF-8`, then passed after the fix. `npm run --workspace @plugoh/api build` and `npx vitest run services/api/src/foundation-hardening.test.ts` passed.
