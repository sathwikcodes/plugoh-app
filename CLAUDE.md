# Claude Code Notes For Plugoh

## Role In This Repo

Act as a pragmatic implementation partner for a backend-first Expo/Hono monorepo. Optimize for small, correct diffs; preserve the existing architecture; and keep context focused on facts from the repository.

## Canonical Workflow

1. Explore: read the relevant `AGENTS.md`, manifests, configs, nearby source, and tests before changing code.
2. Plan: for multi-file, risky, or ambiguous work, state the intended edit plan before modifying files.
3. Implement: make the smallest cohesive change that solves the task and follows existing patterns.
4. Verify: run checks appropriate to the touched scope; prefer narrow checks first, then broader checks for shared changes.
5. Summarize: report what changed, which checks ran, and any remaining risks or skipped verification.

## Task Playbooks

- Bugfix: reproduce or localize the failure first, identify root cause, patch the smallest path, and add or update a regression test when practical.
- Feature: locate existing patterns, update shared contracts first when API shape changes, then service logic, then mobile/client usage.
- Refactor: preserve behavior, avoid opportunistic rewrites, and keep public interfaces stable unless the task requires changing them.
- Test addition: use existing Vitest structure and fakes; avoid network/provider calls in unit tests.

## Editing Rules

- Reuse existing modules, route organization, hooks, components, and config before introducing new abstractions.
- Ask before adding dependencies, especially native mobile packages or provider SDKs.
- Do not move Expo Router route files unless the task explicitly requires navigation restructuring.
- Keep backend integration/orchestration in `services/*`; keep the mobile app thin.
- Keep shared API/domain types in `packages/contracts` and avoid duplicate request/response types.
- Preserve user changes in a dirty worktree; never revert unrelated edits.

## Verification Rules

Choose checks based on touched files:

- Repo-wide/shared changes: `npm run lint` and `npm run typecheck`.
- API changes: `npm run api:test`; use `npm run api:test:coverage` when changing critical API behavior or coverage-sensitive code.
- Mobile changes: `npm run mobile:lint`, `npm run --workspace @plugoh/mobile typecheck`, and `npm run --workspace @plugoh/mobile test` when logic changes.
- Contracts/db changes: `npm run contracts:build`, `npm run db:build`, then `npm run typecheck`.
- Jobs changes: `npm run --workspace @plugoh/jobs build` plus relevant API tests if imported job behavior changes.

If a command fails because of missing local services, environment, simulator state, or sandbox/network limits, report that explicitly instead of implying success.

## Context Discipline

- Use subagents only for broad exploration, independent codebase questions, or log/test-output analysis that would pollute the main context.
- Keep durable context to decisions, file paths, commands, and unresolved risks; discard raw logs once summarized.
- Compact or reset context after major milestones, but preserve the current plan, touched files, and verification status.

## Approval Gates

Ask before destructive commands, dependency installs, native rebuild assumptions, schema/deployment changes, large rewrites, or changing CI/CD behavior. For Expo work, try the Expo Go path conceptually first; use custom builds only when native dependencies or configuration require them.
