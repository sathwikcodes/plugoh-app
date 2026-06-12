---
name: plugoh-context
description: Use for Plugoh architecture/context discovery before coding, especially broad refactors, impact analysis, risky backend/mobile flows, contract/API changes, auth/payment/escrow/campaign/notification/provider work, or questions like "what touches X?", "how does X work?", and "what should I inspect before changing X?".
---

# Plugoh Context

## Overview

Use Graphify as the repo map, then verify with direct source reads. This skill prevents context bloat and reduces hacky changes by forcing agents to trace architecture before editing.

## Workflow

1. Read the nearest `AGENTS.md` files for the touched subtree.
2. If `graphify-out/graph.json` is missing or stale, ask to run `npm run graphify:build`; do not rely on stale graph facts for risky changes.
3. Query Graphify before broad or high-risk edits:
   - `graphify query "<question>" --budget 1200`
   - `graphify path "<node A>" "<node B>"`
   - `graphify explain "<node>"`
4. Treat Graphify output as leads. Read the cited source files, contracts, tests, and adjacent modules before changing code.
5. Summarize the discovered architecture anchors in the plan or implementation notes.

## High-Value Anchors

- API: `AuthUser`, `EnvConfig`, `DataStore`, `createApp()`, `mountDomainRoutes()`, `badRequest()`, `notFound()`, route modules, marketplace/payment/cron services.
- Mobile: `theme`, `useBootstrap()`, `createQueryClient()`, `queryKeys`, `coreInvalidationKeys`, route `_layout.tsx` files, API hooks/clients.
- Shared: `packages/contracts` schemas/types and any consumer paths in mobile, API, and jobs.

## Guardrails

- Do not paste full Graphify reports into chat. Use narrow queries and cite paths.
- Do not implement from inferred graph edges alone.
- Do not move contracts, route files, native config, deployment scripts, or schema files unless the task explicitly requires it and downstream impact has been checked.
- Keep mobile clients thin, jobs thin, and backend orchestration in services/shared packages.
