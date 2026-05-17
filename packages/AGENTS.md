# Packages Agent Notes

## Scope

This file applies to `packages/*`. Root `AGENTS.md` still applies; this file adds shared-package rules.

## Package Roles

- `packages/contracts`: shared API/domain contracts and Zod schemas used by services and mobile.
- `packages/db`: database integration/types scaffold.
- `packages/config`: shared TypeScript config for Node packages.

## Commands

Run from repo root unless noted.

- Contracts build: `npm run contracts:build` or `npm run --workspace @plugoh/contracts build`.
- DB build: `npm run db:build` or `npm run --workspace @plugoh/db build`.
- Repo typecheck after shared changes: `npm run typecheck`.

## Boundary Rules

- Shared packages must not depend on app/service implementation details.
- Put cross-boundary request/response/domain types in `packages/contracts`; do not duplicate them in `apps/mobile` or `services/api`.
- Keep database provider-specific code in `packages/db` only when it is genuinely shared.
- Keep `packages/config` limited to reusable tooling/configuration.

## Compatibility Rules

Changes here can break mobile, API, and jobs together. Treat exported types, schemas, and package entrypoints as public interfaces within the monorepo.

- Prefer additive contract changes when possible.
- Update consumers in the same change when removing or renaming fields.
- Keep generated/build output out of source edits unless explicitly required.

## Verification

For package changes, run the package build plus `npm run typecheck`. If a contract change affects API behavior, run `npm run api:test`; if it affects mobile usage, run mobile typecheck/tests as relevant.
