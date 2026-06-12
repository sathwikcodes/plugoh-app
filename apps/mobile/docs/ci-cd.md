# Mobile CI/CD

Plugoh mobile uses GitHub Actions for pull request quality gates and EAS Workflows for native build artifacts.

## GitHub Checks

The mobile workflow runs on mobile, shared contract/config, package lockfile, Expo, EAS, and workflow changes. It installs with `npm ci`, then runs lint, repo typecheck, mobile Vitest coverage, Expo doctor, and Gitleaks.

## EAS Internal Builds

The EAS workflow builds Android and iOS with the `preview` profile after mobile-relevant changes land on `main`, or when manually triggered. These are internal distribution builds only. Store submission, TestFlight, Play internal testing, and EAS Update publishing are intentionally deferred.

## Environment

Configure these values in EAS environments rather than committed `.env` files:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_RAZORPAY_KEY_ID`
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`

Use the EAS `preview` environment for internal builds and `production` for future store-ready builds.

## Accepted Doctor Exception

`react-native-razorpay` is currently excluded from Expo doctor's React Native Directory New Architecture check because the app already depends on it for payment checkout. Treat this as a payments risk item: before store rollout, verify Razorpay behavior on the target native builds and revisit the dependency if New Architecture support remains incomplete.
