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
