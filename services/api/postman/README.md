# Plugoh API Postman

Use `Plugoh Local.postman_environment.json` with `Plugoh API.postman_collection.json`.

1. Start the API with `npm run api:dev` from the repo root.
2. Copy the tracked environment into a personal local variant if you want to keep your real tokens out of git.
3. Fill `businessJwt` and `influencerJwt` with fresh Supabase Auth access tokens for your local test users.
4. Fill `internalSecret` and `cronSecret` from your local API environment.
5. Fill `influencerId` and `influencerProfileId` after you seed or inspect your local data.
6. Create or seed a business profile and active influencer profile before booking.
7. Run requests in this order for the main flow: create campaign, influencer accept, create escrow order, verify escrow, submit delivery, approve delivery.

Quick ways to get local values:

- `businessJwt` / `influencerJwt`: sign into the app or Supabase Auth locally and copy the access token, or call the demo/local auth flow you use for development.
- `internalSecret` / `cronSecret`: copy them from `services/api/.env` or your shell environment.
- `influencerId` / `influencerProfileId`: fetch them from Supabase or from the API once the profile exists.

The collection uses the consistent JSON response wrapper:

```json
{ "success": true, "data": {}, "meta": { "requestId": "..." } }
```

Provider-backed routes require their documented env vars. Missing provider configuration returns a clear JSON error rather than silently faking external behavior.
