# Plugoh API Postman

Use `Plugoh Local.postman_environment.json` with `Plugoh API.postman_collection.json`.

1. Start the API with `npm run api:dev` from the repo root.
2. Fill `businessJwt` and `influencerJwt` with Supabase Auth access tokens for seeded users.
3. Fill `internalSecret` and `cronSecret` from the local API environment.
4. Create or seed a business profile and active influencer profile before booking.
5. Run requests in this order for the main flow: create campaign, influencer accept, create escrow order, verify escrow, submit delivery, approve delivery.

The collection uses the consistent JSON response wrapper:

```json
{ "success": true, "data": {}, "meta": { "requestId": "..." } }
```

Provider-backed routes require their documented env vars. Missing provider configuration returns a clear JSON error rather than silently faking external behavior.
