# Jobs Agent Notes

## Scope

This file applies to `services/jobs`. Root `AGENTS.md` still applies; this file adds worker-specific rules.

## Worker Stack

`@plugoh/jobs` is a Node.js ESM TypeScript package. It currently depends on `@plugoh/api` and should remain a thin scheduler/worker layer over shared API job behavior.

## Commands

Run from repo root unless noted.

- Dev worker: `npm run jobs:dev`.
- Build: `npm run --workspace @plugoh/jobs build`.
- Start built worker: `npm run --workspace @plugoh/jobs start`.

## Architecture

- Worker entrypoint: `src/index.ts`.
- Keep business logic in `services/api/src/jobs`, API service modules, or shared packages when it must be reused.
- Do not duplicate payment release, campaign transition, or notification rules in the worker package.
- Keep worker code explicit about scheduling, orchestration, logging, and process failure behavior.
- Before changing worker behavior, use Graphify or direct source reads to trace the imported API job/service function and verify ownership stays in `services/api` or shared packages.

## Reliability Rules

- Job operations should be idempotent or safe to retry.
- Avoid silent failures; log enough context to diagnose failed scheduled work without exposing secrets.
- Preserve clear exit/error behavior for process supervisors.
- Be careful with automatic payment release and notification jobs; they affect money movement and user trust.

## Verification

- Run `npm run --workspace @plugoh/jobs build` for worker changes.
- If changes touch imported API job behavior, also run `npm run api:test`.
- If contracts or exported types change, run root `npm run typecheck`.
