# Plugoh Agent Notes

## What This Repo Is

Plugoh is a backend-first monorepo for rebuilding marketplace flows in mobile form.

Current product roles are `business` and `influencer`. The core flow being rebuilt is Instagram connect, discovery, booking, escrow-backed payments, campaign chat and delivery, earnings, AI profile text generation, automatic payment release, and notifications.

## Monorepo Layout

- `apps/mobile`: Expo Router React Native app.
- `services/api`: Hono marketplace API (Node + TypeScript).
- `services/jobs`: background workers and scheduled jobs.
- `services/ai`: AI service scaffolding.
- `packages/contracts`: shared API/domain types.
- `packages/db`: DB integration layer placeholder.
- `packages/config`: shared TypeScript config.
- `infra/azure`: deployment notes and future IaC.

## Commands (From Repo Root)

- `npm run mobile:start`
- `npm run mobile:android`
- `npm run mobile:ios`
- `npm run mobile:web`
- `npm run mobile:lint`
- `npm run mobile:reset-project`
- `npm run api:dev`
- `npm run jobs:dev`
- `npm run ai:dev`

## React Native Conventions

- Keep native dependencies in `apps/mobile`.
- Use `expo-image` for images.
- Use `Pressable` over `TouchableOpacity` and `TouchableHighlight`.
- Use Expo Router stack/tabs for navigation.
- Use virtualized lists (FlashList/FlatList) for non-trivial collections.
- Reuse existing `app/`, `components/`, `hooks/`, and `constants/` patterns before introducing new abstractions.

## Stable Notes

- Backend integration logic belongs in services, not in the mobile app.
- Keep shared contracts in `packages/contracts` and avoid duplicating request/response types.
- This repo is a single monorepo; add nested `AGENTS.md` only when a package needs special local rules.
