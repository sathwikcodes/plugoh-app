# Plugoh Agent Notes

## Project Overview

Plugoh is a backend-first npm-workspaces monorepo rebuilding marketplace flows for a mobile product. Current roles are `business` and `influencer`; core flows include Instagram connect, discovery, booking, escrow-backed payments, campaign chat/delivery, earnings, AI profile text generation, automatic payment release, and notifications.

## Tech Stack

- Runtime/package manager: Node.js `>=22.11 <23`, npm `10.9.0`, npm workspaces.
- Mobile: Expo SDK 54, Expo Router, React 19, React Native 0.81, TypeScript, Vitest.
- API: Hono, Node.js ESM, TypeScript, Zod, Supabase, Redis/ioredis, Razorpay, Resend, Pino, Prometheus.
- Workers: Node.js ESM TypeScript in `services/jobs`.
- Shared packages: `packages/contracts`, `packages/db`, `packages/config`.
- Infra: Azure Container Apps/Bicep under `infra/azure`, DB migrations/seeds under `infra/db`.

## Essential Commands

Run from the repo root unless noted.

- Install: `npm install` or CI-equivalent `npm ci`.
- Graphify context graph: `npm run graphify:build`; generated output stays local under `graphify-out/`.
- Mobile dev: `npm run mobile:start`, `npm run mobile:web`, `npm run mobile:ios`, `npm run mobile:android`.
- Mobile checks: `npm run mobile:lint`, `npm run --workspace @plugoh/mobile typecheck`, `npm run --workspace @plugoh/mobile test`.
- API dev/build/test: `npm run api:dev`, `npm run api:build`, `npm run api:test`, `npm run api:test:coverage`.
- Jobs: `npm run jobs:dev`, `npm run --workspace @plugoh/jobs build`.
- Shared builds: `npm run contracts:build`, `npm run db:build`.
- Repo checks: `npm run lint`, `npm run typecheck`.

Do not document or call `npm run ai:dev` unless `package.json` is updated; it is mentioned in older docs but is not currently defined.

## Directory Structure And Architecture

- `apps/mobile`: Expo Router React Native client. Keep client code thin; backend orchestration and integrations belong in services.
- `services/api`: Hono marketplace API with route modules, middleware, repositories, service logic, tests, and job exports.
- `services/jobs`: worker/scheduler entrypoint that should call service/job logic instead of duplicating business rules.
- `services/ai`: scaffold only; no current workspace package or source package detected.
- `packages/contracts`: shared API/domain contracts and Zod schemas.
- `packages/db`: database integration/types scaffold.
- `packages/config`: shared TypeScript configs.
- `infra/azure`: deployment scripts, runbooks, and Bicep modules; see `infra/azure/README.md` and `infra/azure/RUNBOOK.md`.
- `infra/db`: SQL migrations and seed data.

## Agent Context Workflow

- Treat this file as the canonical cross-agent contract. `CLAUDE.md`, Gemini, Codex, and other agent surfaces should point back here rather than duplicate repo rules.
- Before broad, risky, or unfamiliar changes, query Graphify instead of loading large file dumps: `graphify query "<question>" --budget 1200`, `graphify path "<A>" "<B>"`, or `graphify explain "<node>"`.
- Check graph freshness before relying on Graphify: compare the report commit with `git rev-parse HEAD`, or rebuild with `npm run graphify:build` when `graphify-out/graph.json` is missing/stale.
- Use Graphify as a map, not a substitute for source. After Graphify identifies nodes/files, inspect the cited code, contracts, tests, and nearest nested `AGENTS.md` before editing.
- Keep task context small: summarize discovered facts, cite paths, and discard raw logs once the useful decisions are captured.

## Required Quality Loop

1. Explore the relevant instructions, manifests, Graphify context for cross-cutting work, nearby implementation, and tests.
2. Plan the smallest cohesive change; ask before dependencies, native config, schema/deployment edits, or broad rewrites.
3. Implement within existing architecture boundaries and shared contracts.
4. Verify with the narrowest relevant checks, then broaden for shared/high-risk paths.
5. Summarize changed files, checks run, skipped checks, and remaining risks.

## Code Style And Conventions

- TypeScript is strict; avoid `any` outside the API exceptions already encoded in `eslint.config.js`.
- Prettier uses single quotes, semicolons, trailing commas, and `printWidth: 100`.
- Keep shared request/response/domain types in `packages/contracts`; do not duplicate them in app or service code.
- Keep native dependencies in `apps/mobile` and use one dependency version across the monorepo when possible.
- Prefer small, local changes that reuse existing folder patterns before adding abstractions.
- Do not move route files, change public contracts, or add dependencies without checking downstream impact.
- Keep mobile clients thin. Put orchestration, provider calls, payment state, escrow release, campaign transitions, and notification side effects in API/services/jobs.
- Keep jobs thin. Reuse API job/service logic instead of duplicating business rules in `services/jobs`.

## Testing And CI

GitHub CI for API-related changes runs `npm ci`, `npm run lint`, `npm run typecheck`, API tests with coverage thresholds, and Gitleaks. API coverage thresholds in CI are 70% lines and 70% functions.

Before handing off code changes, run the narrowest relevant checks plus broader checks for shared or cross-cutting changes. For contract or DB package changes, run package builds and `npm run typecheck`; for API behavior, run API tests; for mobile UI/client changes, run mobile lint/typecheck/tests where applicable.

## Security And Compliance

- Never commit secrets, tokens, private keys, `.env` values, or real customer/payment data.
- Treat auth, payment, escrow release, campaign state transitions, and notification flows as high-risk paths.
- Treat Instagram/provider integrations and AI-generated business/profile text as high-risk where they affect user trust, external APIs, or billing.
- Preserve explicit validation, authorization, rate limiting, idempotency, error normalization, observability, and logging around API/payment/job code.
- Use environment variables and provider clients through existing config/provider layers.

## Git And PR Rules

- Preserve user work. The tree may be dirty; do not revert or rewrite unrelated changes.
- Keep diffs minimal and scoped to the task.
- Do not amend commits, force-push, reset hard, or delete files unless explicitly requested.
- PRs should pass the same checks as CI for touched areas and include tests for behavior changes.

## AI Agent Guidelines

- Read this file first, then the nearest nested `AGENTS.md`; nested files override root instructions for their subtree.
- Verify real commands from `package.json`, CI, or config files before recommending them.
- Prefer paths and concise explanations over duplicating large docs.
- Ask before adding dependencies, changing native project config, editing deployment scripts, or making broad rewrites.
- When checks cannot be run, state exactly which checks were skipped and why.
