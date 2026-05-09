# Mobile Navigation Golden Path Test Plan

## Scope

This plan validates influencer-side route gating and key navigation flows across `(auth)`, `(onboarding)`, and `(app)`.

## Scenarios

1. Cold start unauthenticated
- Start app with no session.
- Expect redirect to `/(auth)/login`.
- Complete email OTP flow.
- Expect redirect into onboarding flow.

2. New user onboarding
- Submit basics form (`/(onboarding)/basics`).
- Connect Instagram from `/(onboarding)/instagram-connect`.
- Complete callback and AI generation wait screen.
- Expect redirect to `/(app)/(tabs)`.

3. Instagram callback path
- Trigger `/instagram/connect?...platform=mobile`.
- Complete callback to `/auth/callback/instagram`.
- Verify redirect payload resolves to `plugoh://instagram/callback?...`.
- App should land in onboarding AI step or app tabs based on profile state.

4. Campaign accept/decline
- Open campaign from tabs list.
- Accept and verify route remains on detail with refreshed state.
- Decline on a separate campaign and verify status + list updates.

5. Chat attachment flow
- Open `/inbox/[id]`.
- Send text and attachment.
- Verify thread updates and unread counts on inbox tab.

6. Delivery upload flow
- Open `/delivery/[campaignId]`.
- Upload a valid file and submit notes.
- Verify transition to submitted delivery status and preview URL fetch.

7. Notifications flow
- Open notifications screen from app shell.
- Mark as read and verify unread badge decreases.
- Tap push notification deep link and verify campaign route is opened.

8. Logout flow
- Trigger sign out from profile settings.
- Verify push token unregister call succeeds.
- Expect redirect to `/(auth)/login`.

## Cross-cutting checks

- No redirect loops between `(auth)`, `(onboarding)`, and `(app)` layouts.
- Bootstrap errors surface with retry action in app layout.
- Offline mode keeps cached reads visible and blocks online mutations gracefully.
