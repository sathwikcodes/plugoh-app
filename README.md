# Plugoh

Plugoh is a backend-first monorepo for rebuilding the marketplace experience in a mobile-first product.

## Current Focus

The immediate build scope is the marketplace core:

- Instagram connect
- creator discovery and filtering
- booking and campaign lifecycle
- escrow-backed payments and release orchestration
- campaign chat and delivery
- earnings and transaction visibility
- AI-assisted profile text generation
- notification flows

## Monorepo Structure

```text
apps/
  mobile/        Expo Router React Native app
services/
  api/           Hono API (Node + TypeScript)
  jobs/          background workers and schedulers
  ai/            AI service scaffolding
packages/
  contracts/     shared API and domain contracts
  db/            database integration layer scaffold
  config/        shared TypeScript config
infra/
  azure/         deployment notes and future IaC
```

## Tech Stack

- **Mobile app**: Expo, Expo Router, React Native, TypeScript
- **API**: Hono, Node.js, TypeScript
- **Workers**: Node.js, TypeScript
- **Data layer (planned)**: PostgreSQL + Redis
- **Deployment target**: Azure Container Apps + Container Apps Jobs

The mobile app should stay thin. Backend orchestration and integrations belong in `services/*`, not inside the app client.

## Workspace Commands (Run From Repo Root)

### Install

```bash
npm install
```

### Mobile

```bash
npm run mobile:start
npm run mobile:android
npm run mobile:ios
npm run mobile:web
npm run mobile:lint
npm run mobile:reset-project
```

### Backend Services

```bash
npm run api:dev
npm run jobs:dev
npm run ai:dev
```

## Frontend Standards

- Keep native dependencies inside `apps/mobile`.
- Use `expo-image` for image rendering.
- Use `Pressable` instead of `TouchableOpacity` or `TouchableHighlight`.
- Use Expo Router stack/tabs for navigation.
- Use virtualized lists (FlashList/FlatList) for non-trivial list views.

## Notes

- `services/*` are scaffolds to start backend development quickly.
- API contracts should be centralized in `packages/contracts` as backend routes are implemented.
- Azure deployment files under `infra/azure` are intentionally minimal at this stage and will be expanded with concrete IaC next.
