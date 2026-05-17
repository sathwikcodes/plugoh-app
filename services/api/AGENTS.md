# API Agent Notes

## Scope

This file applies to `services/api`. Root `AGENTS.md` still applies; this file adds API-specific rules.

## API Stack

- Hono on Node.js ESM with TypeScript.
- Zod validation via shared contracts and route-local schemas.
- Provider/client integrations include Supabase, Redis/ioredis, Razorpay, Resend, Application Insights, Pino, and Prometheus.
- Tests use Vitest under `src/**/*.test.ts` with fakes in `src/testing`.

## Commands

Run from repo root unless noted.

- Dev server: `npm run api:dev`.
- Build: `npm run api:build`.
- Tests: `npm run api:test`.
- Coverage: `npm run api:test:coverage`.
- Hono request helper: `npm run --workspace @plugoh/api request`.

The root `api:*` commands build `@plugoh/contracts` first.

## Architecture

- Entrypoints: `src/index.ts`, `src/app.ts`, and `src/request-app.ts`.
- Route modules live under `src/modules/*/routes.ts`.
- Cross-cutting middleware lives under `src/middleware`.
- Provider construction belongs in `src/clients` and `src/modules/deps.ts` / runtime wiring.
- Domain/service behavior belongs in service or module files, not inline in entrypoints.
- Data access belongs in repositories such as `src/repositories/data-store.ts`.
- Job-callable API behavior is exported from `src/jobs` where needed by workers.

## Contracts And Validation

- Put shared API/domain types and schemas in `packages/contracts` when mobile, API, or jobs must agree on shape.
- Keep request validation explicit at route boundaries.
- Do not bypass auth, validation, error normalization, request IDs, or rate limiting for convenience.
- Preserve existing response conventions from `src/core/response.ts` and error handling from `src/core/errors.ts` / middleware.

## Testing And CI

- Add or update Vitest coverage for route/service behavior changes.
- Use fakes/memory stores from `src/testing` instead of real provider calls in unit tests.
- CI runs API tests with 70% line and function coverage thresholds for API-related changes.
- Build excludes test files; do not rely on test-only types in production source.

## Security And Reliability Guardrails

- Treat auth, Instagram connect, payment, escrow release, campaign transitions, messaging, notifications, and cron/job routes as sensitive.
- Keep payment and release flows idempotent and auditable.
- Never log secrets, bearer tokens, OTPs, provider keys, or full payment payloads.
- Validate environment through existing config paths rather than ad hoc `process.env` reads.
- Preserve observability for request IDs, structured logs, metrics, and operational errors.

## Agent Guidelines

Before changing API behavior, inspect the relevant module, shared contracts, tests, and mobile usage if the endpoint is consumed by the app. After changes, run `npm run api:test`; run `npm run typecheck` for contract or exported type changes.
