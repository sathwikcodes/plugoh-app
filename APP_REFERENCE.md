# Plugoh App Reference

This repo is backend-first.

## Integration Boundaries

- Mobile app (`apps/mobile`) consumes API endpoints from `services/api` (Hono).
- Business logic belongs in backend services and route modules, not in Expo API routes.
- Shared request/response types live in `packages/contracts`.
- Mobile should not perform direct production reads/writes to Supabase tables for marketplace workflows.

## Current Mobile Surface

- Auth/session bootstrap with Supabase client for identity.
- Role/onboarding/app route groups own navigation gating:
  - `/(auth)`
  - `/(onboarding)`
  - `/(app)`
- Data and mutations are routed through typed API client helpers in:
  - `apps/mobile/lib/api/client.ts`
  - `apps/mobile/lib/api/endpoints.ts`
- Query cache setup lives in:
  - `apps/mobile/lib/query/client.ts`
  - `apps/mobile/lib/query/keys.ts`

## API Surface for Mobile

Primary endpoints consumed by mobile include:

- `/me/bootstrap`
- `/influencer/onboarding`
- `/influencer/profile` (+ pricing, active, payout)
- `/campaigns` and `/campaigns/:id`
- `/campaigns/:id/messages` (+ attachment/read)
- `/campaigns/:id/delivery/url`
- `/delivery/upload`
- `/notifications` and `/notifications/read`
- `/instagram/connect`, `/auth/callback/instagram`, `/instagram/sync`, `/instagram/disconnect`
- `/push/register`, `/push/unregister`

## Push Delivery Boundary

- Push token registration is handled by Hono routes (`/push/register`, `/push/unregister`).
- Push delivery provider integration is abstracted behind a backend provider boundary (`PushProvider`) and injected through runtime deps.

## Rule of Thumb

If behavior is shared, sensitive, or affects payment/delivery state transitions, implement it in `services/api` and expose it as a typed endpoint used by mobile.
