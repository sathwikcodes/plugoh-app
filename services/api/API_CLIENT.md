# Plugoh API Client Notes

Use this as the integration contract for the React Native app.

## Auth

Send the Supabase Auth session access token to Hono endpoints:

```http
Authorization: Bearer <session.access_token>
```

Do not send Supabase service role keys, Razorpay secrets, Instagram secrets, or AI keys from mobile.

## Response Shape

All JSON responses use:

```json
{ "success": true, "data": {}, "meta": { "requestId": "..." } }
```

Errors use:

```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Human readable message" },
  "meta": { "requestId": "..." }
}
```

The mobile client should branch on `success`, then use `error.code` for UI states.

## Uploads

Delivery upload is multipart:

```text
POST /delivery/upload
file=<File>
campaignId=<uuid>
```

Use the returned `storagePath` with `POST /campaigns/:id/deliver`.

## Retry Safety

Safe to retry:

- `GET` requests
- `POST /payment/verify-escrow` with the same Razorpay payment ID
- `POST /payment/verify-booking-payment` with the same Razorpay order ID
- `POST /payment/release-escrow` after completion

Do not blindly retry create/send actions without client-side idempotency UX:

- `POST /campaigns`
- `POST /campaigns/:id/messages`
- `POST /delivery/upload`
