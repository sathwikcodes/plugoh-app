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
- Cross-cutting middleware lives under `src/middleware`.
- Provider construction belongs in `src/clients` and `src/modules/deps.ts` / runtime wiring.
- Data access belongs in repositories such as `src/repositories/data-store.ts`.
- Job-callable API behavior is exported from `src/jobs` where needed by workers.

### Module = routes + service (REQUIRED pattern)

Each domain is a folder under `src/modules/<domain>/` containing **both**:

- `routes.ts` — thin Hono handlers. Parse/validate input (Zod via `middleware/validate.ts`), call exactly one service method, shape the response with `src/core/response.ts`. No business logic, no direct table access, no provider calls inline.
- `service.ts` — all business logic for that domain. One exported service class per domain (`CampaignService`, `PaymentService`, etc.). Services receive `DataStore` + optional providers via constructor injection; they never read `process.env` or build provider clients themselves.

Current domains: `ai`, `campaigns`, `cron`, `delivery`, `discovery`, `earnings`, `instagram`, `messaging`, `notifications`, `payments`, `profiles`, `push`, `system`. When you add a domain, create `modules/<domain>/{routes,service}.ts`, register the service in the factory, and mount the routes in `modules/bootstrap.ts` `mountDomainRoutes()`.

### Service wiring — `services/marketplace.ts` is a factory barrel ONLY

- `src/services/marketplace.ts` is a thin barrel: it defines the `Services` type and `ProviderBundle` type and exports `createServices(store, providers, config)`, which imports each module's service class and wires them in the correct construction order (notifications → campaigns → payments → … → cron last). **Do not** add business logic, helpers, or classes back into this file.
- `createServices` / `Services` / `ProviderBundle` are the only public surface of `marketplace.ts`. Routes/tests/bootstrap depend on this barrel — keep these three exports stable.
- Cross-service dependencies are explicit imports between `modules/<domain>/service.ts` files (e.g. `payments/service.ts` imports `CampaignService`). Keep the dependency graph acyclic: `profiles → shared`; `campaigns → profiles, notifications, shared`; `payments → campaigns, profiles, notifications, shared`; `cron → payments, notifications, shared`; everything else → `shared` only.

### Shared helpers — `services/shared.ts`

- Free helpers/constants used by **two or more** services live in `src/services/shared.ts` (e.g. `Row`, `nowIso`, `moneyPaise`, `platformFeePaise`, `paginateRows`, `geocodeValues`, `withBusinessProfileImage`, `withInfluencerProfileImage`, `assertUser`, `campaignForParticipant`, `requireCampaignRole`, `requireStatus`).
- Helpers used by **only one** service stay local (unexported) in that service file. Don't promote single-use helpers to `shared.ts`, and don't duplicate a shared helper into a module.

### Request logging & observability

- Every request emits one structured line via `src/middleware/request-log.ts` (`requestId, method, path, status, durationMs, userId?, role?`) using the shared Pino instance from `src/core/logger.ts`. Thrown errors are logged by `middleware/error-handler.ts` with matching `durationMs` (read from the `requestStartMs` context var). Keep this coverage when touching middleware order in `bootstrap.ts` (`requestLog` runs right after `loggerMiddleware`).
- Never log headers, cookies, bodies, or query strings from `request-log`. Pino `redact` paths (`authorization`, `cookie`, `*.razorpay_signature`) are the safety net — extend them, don't bypass them.

### Backward-compatible route aliases

- Some endpoints expose duplicate aliases for mobile-client compatibility (e.g. `/payment/create-order` ↔ `/payment/create-escrow-order`, `/payment/verify` ↔ `/payment/verify-escrow`). Do not silently rename or remove an alias — mobile may still call it. Deprecate explicitly and update the mobile client + contracts in the same change.

## Graphify Context Anchors

- Before changing auth, env, routing, data, or error behavior, query/inspect Graphify nodes around `AuthUser`, `EnvConfig`, `DataStore`, `createApp()`, `badRequest()`, `notFound()`, `mountDomainRoutes()`, and the target route module.
- For marketplace, payment, campaign, cron, delivery, Instagram, notification, or AI behavior, trace the relevant route to service/provider/repository nodes before editing.
- Treat Graphify INFERRED edges as leads only; verify with direct reads of cited source files and tests.

## Contracts And Validation

- Put shared API/domain types and schemas in `packages/contracts` when mobile, API, or jobs must agree on shape.
- Keep request validation explicit at route boundaries.
- Do not bypass auth, validation, error normalization, request IDs, or rate limiting for convenience.
- Preserve existing response conventions from `src/core/response.ts` and error handling from `src/core/errors.ts` / middleware.

## Testing And CI

- Add or update Vitest coverage for route/service behavior changes. When you extract or add non-trivial service logic, add a focused unit test for it.
- Use fakes/memory stores from `src/testing` instead of real provider calls in unit tests.
- The 70% line/function coverage target is the intended standard, but note: the chained `api:test:coverage` script does **not** currently fail CI on it (the `--coverage.thresholds.*` flags don't propagate through the npm-script chain to vitest; real baseline is ~59%). Don't assume CI blocks low coverage — write the tests anyway. If you make the gate real, backfill tests for `repositories/data-store.ts` and `modules/system/routes.ts` first or CI will fail immediately.
- Build excludes test files; do not rely on test-only types in production source.

## Security And Reliability Guardrails

- Treat auth, Instagram connect, payment, escrow release, campaign transitions, messaging, notifications, and cron/job routes as sensitive.
- Keep payment and release flows idempotent and auditable.
- Never log secrets, bearer tokens, OTPs, provider keys, or full payment payloads.
- Validate environment through existing config paths rather than ad hoc `process.env` reads.
- Preserve observability for request IDs, structured logs, metrics, and operational errors.

## Agent Guidelines

Before changing API behavior, inspect the relevant module, shared contracts, tests, and mobile usage if the endpoint is consumed by the app. After changes, run `npm run api:test`; run `npm run typecheck` for contract or exported type changes.
