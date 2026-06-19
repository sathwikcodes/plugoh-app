# Mobile Agent Notes

## Scope

This file applies to `apps/mobile`. Root `AGENTS.md` still applies; this file adds mobile-specific Expo and React Native rules.

## Mobile Stack

- Expo SDK 54 with Expo Router and typed routes.
- React 19, React Native 0.81, React Compiler enabled, New Architecture enabled.
- State/data: React Query, Zustand, Supabase client, MMKV, Zod, React Hook Form.
- UI/native modules: FlashList, Reanimated, Gesture Handler, `expo-image`, `expo-blur`, `expo-glass-effect`, `expo-linear-gradient`, notifications, SecureStore.
- Tests: Vitest with `@` alias mapped to the app root.

## Commands

Run from repo root unless noted.

- Start Metro/Expo: `npm run mobile:start`.
- Web: `npm run mobile:web`.
- Native builds: `npm run mobile:ios`, `npm run mobile:android`.
- Lint: `npm run mobile:lint`.
- Typecheck: `npm run --workspace @plugoh/mobile typecheck`.
- Tests: `npm run --workspace @plugoh/mobile test`.
- Reset starter project: `npm run mobile:reset-project` only when explicitly requested.

## Routing And Structure

- Routes live in `app/`; do not co-locate reusable components, utilities, or types inside route directories.
- Use `_layout.tsx` files for Expo Router stacks/tabs and keep a route matching `/`.
- Shared UI belongs in `components/`, reusable hooks in `hooks/`, API/query/auth/payment code in `lib/`, state in `store/`, and shared app types in `types/`.
- Prefer the `@/` alias over long relative imports.
- Remove old route files when intentionally restructuring navigation.

### Route files stay THIN (hard rule)

- A route file (`app/**/*.tsx`) is a wrapper, not a screen. Target **< ~50 LOC**; never exceed ~150 without explicit justification. It may: call role/data hooks, derive a small view-model, and render a screen component from `components/screens/`. It must not contain the screen's layout, styles, sub-components, or business logic.
- Full screen layouts live in `components/screens/<screen>.tsx` (kebab-case). Example: `app/(app)/(tabs)/inbox.tsx` and `app/(app)/(brand-tabs)/inbox.tsx` are 8-line wrappers around `components/screens/inbox-screen.tsx`.

### Dual-role screens (business vs influencer) — never duplicate

- The two role tab groups — `app/(app)/(tabs)/` (influencer) and `app/(app)/(brand-tabs)/` (business) — must **not** hold near-duplicate screen files. Build one shared composition in `components/screens/` and pass role differences in via props/config.
- Pattern: the shared screen takes a small role config (a `role: 'business' | 'influencer'` discriminant with a per-role lookup object, or explicit props for the few differences — profile image, target routes, search predicate, copy). Each route wrapper calls its role-specific hook (`useInfluencerProfile` vs `useBusinessProfile`) and passes the resolved values down. See `components/screens/inbox-screen.tsx` and `components/screens/home-screen.tsx`.
- If you find yourself copy-pasting a screen between the two tab groups, stop and extract a `components/screens/` composition instead.

### Component & hook organization

- `components/screens/` — full screen compositions (role-parameterized). `components/ui/` — primitives (glass, headers, shimmer, tab canvas). `components/<domain>/` (e.g. `inbox/`, `earnings/`, `auth/`, `onboarding/`, `influencer/`) — domain-specific pieces.
- Marketplace data hooks live in `hooks/marketplace/` split by domain (`use-profiles`, `use-campaigns`, `use-inbox`, `use-earnings`, `use-payments`, `use-notifications`, `use-discovery`, `use-mutations`), with private shared helpers in `hooks/marketplace/internal.ts` and a barrel `hooks/marketplace/index.ts`. `hooks/use-marketplace.ts` is a back-compat re-export shim — prefer importing from `@/hooks/marketplace` in new code, and do not grow `use-marketplace.ts` back into a god-hook.
- Feature logic (filters, pub/sub channels, formatters, view-model derivation) lives in `lib/<feature>/` — e.g. `lib/location/location-selection.ts` (one generic channel factory; do not re-introduce per-feature copies), `lib/filters/`, `lib/brand/`, `lib/influencer/`. Keep one source of truth per concern; never duplicate a pub/sub or helper across `lib/` subfolders.

### Naming conventions

- Filenames are **kebab-case** for every `.ts`/`.tsx` file, including components (`comment-card.tsx`, not `CommentCard.tsx`). React components and hooks keep their idiomatic casing as *symbols* (`CommentCard`, `useInbox`) but the file is kebab-case.
- Prefer **named exports** for components/hooks/utilities. Route files use `export default` (Expo Router requirement); give the default a descriptive name (`InfluencerInboxRoute`, not `default`).
- One primary export concern per file; co-locate only its tightly-coupled local helpers/sub-components.

## Graphify Context Anchors

- Before broad UI, bootstrap, auth/session, API, query-cache, or navigation changes, query/inspect Graphify nodes around `theme`, `useBootstrap()`, `createQueryClient()`, `queryKeys`, `coreInvalidationKeys`, route `_layout.tsx` files, and the target screen/component.
- For API-backed screens, trace from the screen/hook to `lib/api`, `lib/query`, shared contracts, and the matching API route before changing request or response assumptions.
- Treat Graphify INFERRED edges as leads only; verify with direct reads of cited source files and tests.

## React Native Conventions

- Use `Pressable` instead of `TouchableOpacity` or `TouchableHighlight`.
- Use `expo-image` for images. Do not use intrinsic web elements like `img` or `div` in native components.
- Use Expo Router `Link`, native stack/tabs, native modals/sheets, and route titles instead of custom navigation shells.
- Use `react-native-safe-area-context` and scroll/list `contentInsetAdjustmentBehavior="automatic"` for safe areas.
- Prefer `ScrollView` or virtualized lists as the first child of stack screens that need scrolling.
- Use `useWindowDimensions` or `onLayout`; avoid `Dimensions.get()` and `measure()` for responsive layout.
- Keep native dependencies inside this app package and ask before adding any native package or changing `app.json`, EAS, iOS, or Android config.

## Performance And UI Rules

- Use FlashList or FlatList for non-trivial collections; avoid rendering large arrays in `ScrollView`.
- Memoize expensive list rows and stabilize callbacks passed to lists.
- Move expensive formatting/computation out of render paths where practical.
- Animate transform and opacity where possible; be careful with layout-heavy animations.
- Wrap important/copyable data and error text in selectable `<Text>` where useful.
- Use existing visual primitives and design patterns before adding new component systems.

## Verification

For mobile changes, run the narrowest relevant checks:

- UI/navigation/style-only changes: `npm run mobile:lint`.
- Type or data-flow changes: `npm run --workspace @plugoh/mobile typecheck`.
- Logic changes: `npm run --workspace @plugoh/mobile test`.

When changing shared contracts or API client behavior, also run root `npm run typecheck` or the relevant API checks.
