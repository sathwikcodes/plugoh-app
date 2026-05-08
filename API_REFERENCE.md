# Plugoh Platform — Backend API Reference

> **Purpose:** Complete operational reference for building the Plugoh backend API (Node.js + TypeScript + Hono). This document describes every entity, operation, status flow, and business rule in the live system. Do not hallucinate. Implement exactly what is described here.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [External Services & Credentials](#2-external-services--credentials)
3. [Database Schema](#3-database-schema)
4. [Auth & User Management](#4-auth--user-management)
5. [Profiles](#5-profiles)
6. [Influencer Discovery](#6-influencer-discovery)
7. [Campaign Lifecycle](#7-campaign-lifecycle)
8. [Payment & Escrow System](#8-payment--escrow-system)
9. [Content Delivery](#9-content-delivery)
10. [Messaging](#10-messaging)
11. [Notifications](#11-notifications)
12. [Instagram Integration](#12-instagram-integration)
13. [AI Profile Generation](#13-ai-profile-generation)
14. [Earnings & Tiers](#14-earnings--tiers)
15. [Cron Jobs](#15-cron-jobs)
16. [Constants & Enumerations](#16-constants--enumerations)
17. [Platform Business Rules](#17-platform-business-rules)

---

## 1. System Overview

Plugoh is a two-sided influencer marketplace connecting **brands (business role)** and **influencers (influencer role)**. The complete platform flow:

```
Brand signs up → discovers influencers → books an influencer (creates campaign) →
pays via Razorpay (escrow) → influencer accepts → delivers content →
brand approves (or auto-releases after 7 days) → payment released
```

**Role types:**
- `business` — brand/company that books influencers
- `influencer` — content creator that accepts campaigns and delivers content

---

## 2. External Services & Credentials

| Service | Purpose | Env Vars |
|---------|---------|----------|
| Supabase | Auth, PostgreSQL, Storage, RLS | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Razorpay | Payments, pre-auth, refunds | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Instagram / Meta | OAuth, media sync, analytics | `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI` |
| Resend | Transactional email | `RESEND_API_KEY` |
| Anthropic / Google AI | AI profile generation | `ANTHROPIC_API_KEY`, `GOOGLE_AI_KEY` |
| Internal cron secret | Secure cron endpoints | `CRON_SECRET` |
| Internal service secret | Internal API-to-API calls | `INTERNAL_SECRET` |

---

## 3. Database Schema

All tables use Supabase (PostgreSQL). All monetary amounts in **paise** (₹1 = 100 paise) in `escrow_transactions`. Campaign-level monetary fields are in **rupees** (₹).

### 3.1 `profiles` (base user table)

```sql
id                UUID  PK  (FK → auth.users)
email             TEXT
full_name         TEXT
phone             TEXT
location          TEXT
business_name     TEXT  (legacy field, unused in new flows)
business_type     TEXT  (legacy field, unused in new flows)
created_at        TIMESTAMPTZ  default NOW()
```

RLS: User can only read/write own row.

---

### 3.2 `user_roles`

```sql
id        UUID  PK
user_id   UUID  UNIQUE  (FK → auth.users, ON DELETE CASCADE)
role      app_role  ENUM('business', 'influencer')
```

One row per user. Index: `idx_user_roles_user_id`.
RLS: User can only view/modify own row.

---

### 3.3 `influencer_profiles`

```sql
id                    UUID  PK  default gen_random_uuid()
user_id               UUID  UNIQUE  (FK → auth.users)
display_name          TEXT
bio                   TEXT
city                  TEXT
category              TEXT   -- see §16 CATEGORIES
instagram_handle      TEXT
instagram_url         TEXT
follower_count        INTEGER
avg_likes_per_reel    NUMERIC
avg_views_per_reel    NUMERIC
price_per_post        NUMERIC
price_per_reel        NUMERIC
price_per_story       NUMERIC
turnaround_time       TEXT   -- '24_hours' | '2_3_days' | '1_week' | '2_weeks'
languages             TEXT[]
content_types         TEXT[]
previous_brands       TEXT[]
portfolio_media_ids   TEXT[]
is_active             BOOLEAN  default TRUE

-- Instagram OAuth fields
ig_user_id            TEXT
ig_username           TEXT
ig_biography          TEXT
ig_profile_picture_url TEXT
ig_followers_count    INTEGER
ig_follows_count      INTEGER
ig_media_count        INTEGER
access_token          TEXT
token_expires_at      TIMESTAMPTZ
created_at            TIMESTAMPTZ
```

RLS:
- SELECT: Public if `is_active = true`; owner sees own profile even if inactive.
- INSERT/UPDATE: Owner only.

Indexes: `idx_influencer_profiles_user_id`, `idx_influencer_profiles_active_followers`.

---

### 3.4 `business_profiles`

```sql
id                       UUID  PK
user_id                  UUID  UNIQUE  (FK → auth.users)
brand_name               TEXT
brand_type               TEXT   -- see §16 BUSINESS_TYPES
brand_location           TEXT
brand_summary            TEXT
tagline                  TEXT
has_instagram_account    BOOLEAN
instagram_connected_at   TIMESTAMPTZ

-- Instagram OAuth fields
ig_user_id               TEXT
ig_username              TEXT
ig_biography             TEXT
ig_profile_picture_url   TEXT
ig_followers_count       INTEGER
ig_follows_count         INTEGER
ig_media_count           INTEGER
instagram_url            TEXT
access_token             TEXT
token_expires_at         TIMESTAMPTZ
created_at               TIMESTAMPTZ
```

RLS:
- SELECT: Owner OR any user who shares a campaign with this business.
- INSERT/UPDATE: Owner only.

---

### 3.5 `campaigns`

```sql
id                      UUID  PK
business_id             UUID  (FK → auth.users)
influencer_id           UUID  (FK → auth.users)
influencer_profile_id   UUID  nullable  (FK → influencer_profiles)
title                   TEXT
brief                   TEXT
package_type            TEXT   -- 'reel' | 'post' | 'story' | 'reel+story' | 'reel+post'
price_offered           NUMERIC   -- influencer earnings in ₹
advance_amount          NUMERIC
status                  TEXT   -- see §7 STATUS FLOW
business_contact_email  TEXT
business_contact_phone  TEXT

-- Payment
razorpay_order_id       TEXT
razorpay_payment_id     TEXT
payment_method          TEXT   -- 'card' | 'upi' | 'other'
payment_status          TEXT   -- 'unpaid' | 'authorized' | 'paid'
platform_fee_amount     NUMERIC(10,2)
total_charged_amount    NUMERIC(10,2)

-- Timestamps
created_at              TIMESTAMPTZ  default NOW()
updated_at              TIMESTAMPTZ  (auto-updated by trigger)
accepted_at             TIMESTAMPTZ
payment_captured_at     TIMESTAMPTZ
delivery_submitted_at   TIMESTAMPTZ
completed_at            TIMESTAMPTZ
expires_at              TIMESTAMPTZ
```

RLS:
- SELECT: `business_id = auth.uid()` OR `influencer_id = auth.uid()`
- INSERT: `business_id = auth.uid()`
- UPDATE: Campaign participants

Indexes: `idx_campaigns_business_id`, `idx_campaigns_influencer_id`, `idx_campaigns_status`.

---

### 3.6 `deliveries`

```sql
id               UUID  PK
campaign_id      UUID  (FK → campaigns)
submitted_by     UUID  (FK → auth.users)
content_url      TEXT   -- Supabase storage path
notes            TEXT
submitted_at     TIMESTAMPTZ  default NOW()
approved_at      TIMESTAMPTZ
approved_by      UUID  (FK → auth.users)
dispute_reason   TEXT
disputed_at      TIMESTAMPTZ
admin_resolved_at TIMESTAMPTZ
admin_notes      TEXT
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ  (auto-updated by trigger)
```

RLS:
- SELECT: Campaign participants
- INSERT: Influencer (must match `campaign.influencer_id`)
- UPDATE: Business (must match `campaign.business_id`)

---

### 3.7 `escrow_transactions`

Monetary ledger. All amounts in **paise**.

```sql
id                    UUID  PK
campaign_id           UUID  (FK → campaigns)
type                  TEXT   -- 'escrow_lock' | 'payout_influencer' | 'platform_fee' | 'refund'
amount_paise          INTEGER
platform_fee_paise    INTEGER
razorpay_order_id     TEXT
razorpay_payment_id   TEXT
razorpay_payout_id    TEXT
razorpay_refund_id    TEXT
status                TEXT   -- 'pending' | 'success' | 'failed'
failure_reason        TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ  (auto-updated by trigger)
```

RLS: Campaign participants can SELECT only.
Indexes: `idx_escrow_transactions_campaign_id`, `idx_escrow_transactions_type_status`.

---

### 3.8 `influencer_payout_details`

```sql
id                       UUID  PK
user_id                  UUID  UNIQUE  (FK → auth.users)
upi_id                   TEXT
bank_account_no          TEXT
bank_ifsc                TEXT
bank_account_name        TEXT
preferred_method         TEXT  default 'upi'   -- 'upi' | 'bank'
verified                 BOOLEAN  default FALSE
razorpay_contact_id      TEXT
razorpay_fund_account_id TEXT
created_at               TIMESTAMPTZ
updated_at               TIMESTAMPTZ  (auto-updated by trigger)
```

RLS: User manages only own row.

---

### 3.9 `campaign_messages`

```sql
id            UUID  PK
campaign_id   UUID  (FK → campaigns)
sender_id     UUID  (FK → auth.users)
message_type  TEXT  default 'text'   -- 'text' | 'booking_card' | 'system'
content       TEXT
metadata      JSONB  default '{}'
read_by       UUID[]  default '{}'
created_at    TIMESTAMPTZ  default NOW()
```

RLS: Campaign participants can read and create. Campaign participants can update `read_by`.
Indexes: `idx_campaign_messages_campaign`, `idx_campaign_messages_sender`.

---

### 3.10 `campaign_files`

```sql
id            UUID  PK
campaign_id   UUID  (FK → campaigns)
message_id    UUID  nullable  (FK → campaign_messages)
uploaded_by   UUID  (FK → auth.users)
file_name     TEXT
file_url      TEXT
file_size     BIGINT
mime_type     TEXT
file_type     TEXT  default 'attachment'
created_at    TIMESTAMPTZ
```

RLS: Campaign participants can read and upload.
Index: `idx_campaign_files_campaign`.

---

### 3.11 `notifications`

```sql
id          UUID  PK
user_id     UUID  (FK → auth.users)
type        TEXT   -- see §11 NOTIFICATION TYPES
data        JSONB
read        BOOLEAN  default FALSE
created_at  TIMESTAMPTZ
```

RLS: Users manage only own notifications.
Index: `idx_notifications_user_id_created_at`.

---

### 3.12 `instagram_media`

```sql
id               UUID  PK
user_id          UUID  (FK → auth.users)
ig_media_id      TEXT
caption          TEXT
media_type       TEXT   -- 'IMAGE_CAROUSEL' | 'IMAGE' | 'VIDEO' | 'REELS_VIDEO'
media_url        TEXT
thumbnail_url    TEXT
permalink        TEXT
timestamp        TIMESTAMPTZ
like_count       INTEGER
comments_count   INTEGER
impressions      INTEGER
reach            INTEGER
saves            INTEGER
engagement       INTEGER   -- calculated: likes + comments
video_views      INTEGER
synced_at        TIMESTAMPTZ

UNIQUE(user_id, ig_media_id)
```

RLS: User manages only own media.

---

### 3.13 Database Triggers

- `set_updated_at()` — fires BEFORE UPDATE on every table that has `updated_at`; sets `updated_at = NOW()`. Applied to: `campaigns`, `escrow_transactions`, `deliveries`, `influencer_payout_details`.
- `fn_campaign_status_change()` — fires AFTER UPDATE on `campaigns` when `status` changes; inserts a `message_type = 'system'` row into `campaign_messages` describing the new status.

---

## 4. Auth & User Management

Authentication is handled entirely by **Supabase Auth**. The backend API validates requests using Supabase JWT tokens (Bearer header).

### 4.1 Login Methods

| Method | Mechanism |
|--------|-----------|
| OTP Email | `signInWithOtp(email)` → user enters 6-digit code → `verifyOtp(email, token, type='email')` |
| Google OAuth | Supabase OAuth redirect |
| Demo login | `POST /api/demo/login` — only when `NEXT_PUBLIC_DEMO_ENABLED=true` |

### 4.2 Session / Role Check

After login, the client checks `user_roles` for the user's role:
- No role entry → redirect to onboarding
- Has role → redirect to `/dashboard/{role}`

### 4.3 Onboarding — Influencer

Steps executed on the client (also callable via API):

1. **Upsert `profiles`:**
   - `id`, `email`, `full_name`, `phone`, `location`
2. **Insert `user_roles`:**
   - `{ user_id, role: 'influencer' }`
3. **Insert `influencer_profiles`:**
   - `{ user_id, display_name, city, is_active: false }`
4. **Redirect to Instagram OAuth** (`GET /api/instagram/connect?userId=&role=influencer`)
5. Instagram callback completes profile (see §12)

### 4.4 Onboarding — Business (With Instagram)

1. **Upsert `profiles`:** `id`, `email`, `full_name`, `phone`, `location`
2. **Upsert `user_roles`:** `{ user_id, role: 'business' }`
3. **Upsert `business_profiles`:** `{ user_id, has_instagram_account: true }`
4. **Redirect to Instagram OAuth** (`GET /api/instagram/connect?userId=&role=business`)
5. Instagram callback completes profile (see §12)

### 4.5 Onboarding — Business (Manual, No Instagram)

1. **Upsert `profiles`:** `id`, `email`, `full_name`, `phone`, `location`
2. **Upsert `user_roles`:** `{ user_id, role: 'business' }`
3. **Upsert `business_profiles`:**
   - `{ user_id, brand_name, brand_type, brand_location, has_instagram_account: false }`
4. Redirect directly to `/dashboard/business/profile`

---

## 5. Profiles

### 5.1 Influencer Profile Operations

| Operation | Description |
|-----------|-------------|
| Get own profile | `GET /influencer/profile` → returns `influencer_profiles` row for auth user |
| Update pricing | `PATCH /influencer/profile/pricing` → updates `price_per_reel`, `price_per_post`, `price_per_story` |
| Update bio / settings | `PATCH /influencer/profile` → updates display_name, bio, city, category, languages, turnaround_time, content_types |
| Get payout details | `GET /influencer/payout` |
| Upsert payout details | `PUT /influencer/payout` → upserts `influencer_payout_details` |
| Set active status | `PATCH /influencer/profile/active` → sets `is_active` |

### 5.2 Business Profile Operations

| Operation | Description |
|-----------|-------------|
| Get own profile | `GET /business/profile` → returns `business_profiles` row for auth user |
| Update brand info | `PATCH /business/profile` → updates `brand_name`, `brand_type`, `brand_location`, `brand_summary`, `tagline` |

### 5.3 Profile Completeness Check (Business)

Before a brand can book an influencer, their profile must be complete:
- `brand_name` is non-null and non-empty
- Either `ig_username` is set OR `brand_type` is set

---

## 6. Influencer Discovery

### 6.1 List Influencers

`GET /influencers`

Returns all `influencer_profiles` where `is_active = true`.

**Query Parameters (all optional):**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Substring match across: `display_name`, `instagram_handle`, `ig_username`, `bio`, `category`, `city` |
| `place` | string | Filter by `city` (exact match, "All" = no filter) |
| `category` | string | Filter by `category` (exact match, "All" = no filter) |
| `price_min` | number | Minimum starter price (min of all 3 package prices) |
| `price_max` | number | Maximum starter price |
| `sort` | string | `followers_desc` \| `engagement_asc` \| `engagement_desc` \| `price_asc` \| `price_desc` |

**Starter price calculation:**
```
starterPrice = min(price_per_reel ?? Infinity, price_per_post ?? Infinity, price_per_story ?? Infinity)
```

### 6.2 Get Single Influencer Profile

`GET /influencers/:id`

Returns `influencer_profiles` row including Instagram media (top 3 by engagement for showcase).

---

## 7. Campaign Lifecycle

### 7.1 Status Flow

```
requested
  ├─► payment_pending  (influencer accepted, awaiting brand payment)
  │     └─► in_escrow  (brand paid)
  │           └─► delivery_submitted  (influencer uploaded content)
  │                 ├─► completed    (brand approved OR auto-released after 7 days)
  │                 └─► disputed     (brand raised dispute)
  │                       └─► completed | refunded  (admin resolved)
  ├─► pre_authorized  (brand paid upfront before acceptance, card/UPI pre-auth)
  │     └─► in_escrow  (influencer accepts, payment captured)
  ├─► declined        (influencer declined)
  ├─► expired         (48h timer elapsed without acceptance or 24h payment window)
  └─► cancelled       (admin or business cancelled)
```

**Status to human label mapping:**

| Status | Label |
|--------|-------|
| `requested` | Awaiting Response |
| `payment_pending` | Payment Required |
| `pre_authorized` | Payment Secured |
| `in_escrow` | In Progress |
| `delivery_submitted` | Delivery Pending Review |
| `completed` | Completed |
| `disputed` | Under Review |
| `declined` | Declined |
| `expired` | Expired |
| `cancelled` | Cancelled |
| `refunded` | Refunded |

**Status groups for filtering:**

| Filter Group | Statuses Included |
|---|---|
| `requested` (pending actions) | `requested`, `payment_pending`, `pre_authorized` |
| `in_escrow` (active work) | `in_escrow`, `delivery_submitted` |
| `completed` | `completed` |
| `closed` | `declined`, `expired`, `cancelled`, `refunded` |

---

### 7.2 Create Campaign (Brand Books Influencer)

`POST /campaigns`

**Auth:** Business role required.

**Request Body:**
```json
{
  "influencer_id": "uuid",
  "influencer_profile_id": "uuid",
  "package_type": "reel | post | story",
  "price_offered": 10000,
  "objective": "visit_place | feature_product | showcase_service | promote_offer | brand_shoutout",
  "timing_mode": "asap | choose_date",
  "due_date": "2025-07-01",            // required if timing_mode = choose_date
  "event_name": "string",              // venue address, required if objective = visit_place
  "contact_email": "brand@email.com",
  "contact_phone": "+91XXXXXXXXXX"
}
```

**Business Logic:**
1. Validate brand profile is complete (§5.3)
2. Calculate `platform_fee_amount = price_offered * 0.12` (12% rate)
3. Calculate `total_charged_amount = price_offered + platform_fee_amount`
4. Set `expires_at = NOW() + 48 hours`
5. Build `title` from objective + influencer name
6. Build `brief` from objective, timing, venue
7. Insert `campaigns` row with `status = 'requested'`, `payment_status = 'unpaid'`
8. Insert `notifications` for influencer: `type = 'new_booking'`
9. Insert `campaign_messages` with `message_type = 'booking_card'`

**Response:** `{ campaignId: "uuid" }`

---

### 7.3 Get Campaigns (List)

`GET /campaigns?role=business|influencer`

Returns all campaigns where `auth.uid() = business_id` (if role=business) or `auth.uid() = influencer_id` (if role=influencer).

Includes joined influencer or business profile data.

---

### 7.4 Get Campaign (Single)

`GET /campaigns/:id`

Returns campaign row + joined profiles + delivery (if exists) + messages.

Auth: Caller must be `business_id` or `influencer_id` on the campaign.

---

### 7.5 Influencer Accepts Campaign

`POST /campaigns/:id/accept`

**Auth:** Must be `influencer_id` on campaign. Campaign must be in `requested` or `payment_pending` status.

**Business Logic:**
- If current status is `pre_authorized`:
  - Capture Razorpay pre-auth payment (card) or mark as already captured (UPI)
  - Update `payment_status = 'paid'`, `payment_captured_at = NOW()`
  - Update `status = 'in_escrow'`
  - Insert `escrow_transactions`: `{ type: 'escrow_lock', status: 'success', amount_paise, platform_fee_paise }`
- If current status is `requested`:
  - Update `status = 'payment_pending'`
  - Update `expires_at = NOW() + 24 hours` (brand must pay within 24h)
  - Update `accepted_at = NOW()`
- Insert `notifications` for brand: `type = 'booking_accepted'`
- System message added to chat via DB trigger

---

### 7.6 Influencer Declines Campaign

`POST /campaigns/:id/decline`

**Auth:** Must be `influencer_id`. Campaign must be in `requested`, `payment_pending`, or `pre_authorized` status.

**Business Logic:**
- If `pre_authorized` with `payment_method = 'upi'`: Issue Razorpay refund
- If `pre_authorized` with `payment_method = 'card'`: No action (Razorpay auto-voids in 5 days)
- Update `status = 'declined'`
- Insert `notifications` for brand: `type = 'booking_rejected'`
- System message added to chat via DB trigger

---

### 7.7 Brand Approves Delivery

`POST /campaigns/:id/approve`

**Auth:** Must be `business_id`. Campaign must be in `delivery_submitted` status.

**Business Logic:**
1. Update `deliveries` row: `approved_at = NOW()`, `approved_by = auth.uid()`
2. Update `campaign.status = 'completed'`, `completed_at = NOW()`
3. Insert `escrow_transactions`:
   - `{ type: 'payout_influencer', amount_paise: price_offered * 100, status: 'pending' }`
   - `{ type: 'platform_fee', amount_paise: platform_fee_amount * 100, platform_fee_paise: platform_fee_amount * 100, status: 'success' }`
4. Insert `notifications` for influencer: `type = 'booking_completed'`
5. System message added via DB trigger

---

### 7.8 Brand Raises Dispute

`POST /campaigns/:id/dispute`

**Auth:** Must be `business_id`. Campaign must be in `delivery_submitted` status.

**Request Body:** `{ reason: "string" }`

**Business Logic:**
- Update `deliveries.dispute_reason`, `deliveries.disputed_at = NOW()`
- Update `campaign.status = 'disputed'`
- Insert notification for both parties: `type = 'delivery_disputed'`

---

## 8. Payment & Escrow System

**Payment Provider:** Razorpay (India)  
**Currency:** INR  
**Platform Fee:** 12% of influencer's `price_offered`  
**Brand pays:** `price_offered + platform_fee` (total_charged_amount)

### 8.1 Standard Payment Flow (After Influencer Accepts)

Used when influencer accepts first, then brand pays.

**Step 1 — Create Order**

`POST /payment/create-escrow-order`

**Auth:** Business role. Campaign must be in `payment_pending`.

**Request:** `{ campaign_id: "uuid" }`

**Business Logic:**
- Fetch campaign, validate status
- If `razorpay_order_id` already exists on campaign, fetch order from Razorpay (resumable)
- Otherwise create Razorpay order: `{ amount: total_charged_amount_paise, currency: 'INR', receipt: campaign_id }`
- Save `razorpay_order_id` on campaign record

**Response:** `{ orderId, amount, currency }`

---

**Step 2 — Verify Payment**

`POST /payment/verify-escrow`

**Auth:** Business role.

**Request:**
```json
{
  "razorpay_order_id": "string",
  "razorpay_payment_id": "string",
  "razorpay_signature": "string",
  "campaign_id": "uuid"
}
```

**Business Logic:**
1. Verify HMAC-SHA256 signature: `{order_id}|{payment_id}` with `RAZORPAY_KEY_SECRET`
2. Check for idempotency: if campaign already `in_escrow` with this `razorpay_payment_id`, return early
3. Fetch payment from Razorpay to determine `payment_method` (card/upi)
4. Update campaign:
   - `status = 'in_escrow'`
   - `payment_status = 'paid'`
   - `payment_method = ...`
   - `razorpay_payment_id = ...`
   - `payment_captured_at = NOW()`
5. Insert `escrow_transactions`: `{ type: 'escrow_lock', status: 'success', amount_paise, platform_fee_paise }`
6. Insert `notifications` for influencer: `type = 'payment_secured'`
7. System message via DB trigger

**Response:** `{ success: true, campaignId }`

---

### 8.2 Booking Pre-Authorization Flow (Brand Pays During Booking)

Used when brand pays while booking — before influencer accepts.

**Step 1 — Create Pre-Auth Order**

`POST /payment/create-booking-order`

**Auth:** Business role.

**Request:** `{ price_offered: number, influencer_profile_id: "uuid" }`

**Business Logic:**
- Calculate `platform_fee_amount = price_offered * 0.12`
- Calculate `total = price_offered + platform_fee_amount`
- Create Razorpay order: `{ amount: total_paise, currency: 'INR', payment_capture: 0 }` (manual capture mode)
  - Note: UPI ignores `payment_capture: 0` and captures immediately; card holds authorization.

**Response:** `{ orderId, amount, currency, platformFee, total }`

---

**Step 2 — Verify & Create Campaign**

`POST /payment/verify-booking-payment`

**Auth:** Business role.

**Request:**
```json
{
  "razorpay_order_id": "string",
  "razorpay_payment_id": "string",
  "razorpay_signature": "string",
  "influencer_id": "uuid",
  "influencer_profile_id": "uuid",
  "package_type": "reel | post | story",
  "price_offered": 10000,
  "objective": "string",
  "timing_mode": "asap | choose_date",
  "due_date": "2025-07-01",
  "event_name": "string",
  "contact_email": "string",
  "contact_phone": "string"
}
```

**Business Logic:**
1. Verify HMAC-SHA256 signature
2. Idempotency check: if campaign with this `razorpay_order_id` already exists, return existing `campaignId`
3. Fetch payment from Razorpay to determine `payment_method`
4. Create campaign (same as §7.2 but with different status):
   - `payment_method = card` → `status = 'pre_authorized'`, `payment_status = 'authorized'`
   - `payment_method = upi` → `status = 'pre_authorized'`, `payment_status = 'paid'`, `payment_captured_at = NOW()`
5. Set `expires_at = NOW() + 24 hours` (influencer must accept within 24h)
6. Insert `escrow_transactions`:
   - Card: `{ type: 'escrow_lock', status: 'pending' }` (pending until capture)
   - UPI: `{ type: 'escrow_lock', status: 'success' }` (already captured)
7. Insert notification for influencer: `type = 'new_booking'`
8. Insert `campaign_messages` with `message_type = 'booking_card'`

**Response:** `{ success: true, campaignId }`

---

**Step 3 — Capture Pre-Auth (Internal)**

`POST /payment/capture-booking-payment` _(internal endpoint, called by accept logic)_

**Auth:** `x-internal-secret` header.

**Request:** `{ campaign_id: "uuid" }`

**Business Logic:**
- If `payment_method = 'card'`: Call `razorpay.payments.capture(razorpay_payment_id, amount_paise)`
- If `payment_method = 'upi'`: No-op (already captured)

---

### 8.3 Release Escrow (Payment to Influencer)

`POST /payment/release-escrow`

**Auth:** Business role (manual) or `x-cron-secret` (auto-release).

**Request:** `{ campaign_id: "uuid" }`

**Business Logic:**
1. Validate campaign is in `delivery_submitted` or `completed`
2. Create payout obligation records in `escrow_transactions`:
   - `{ type: 'payout_influencer', amount_paise: price_offered * 100, status: 'pending' }`
   - `{ type: 'platform_fee', amount_paise: platform_fee * 100, status: 'success' }`
3. Update campaign `status = 'completed'`, `completed_at = NOW()`
4. Insert notification for influencer: `type = 'booking_completed'`

> **Note:** Actual Razorpay payout disbursement (to influencer's bank/UPI) is Phase 2. Records created with `status = 'pending'` are ready to be processed by a disbursement job once `influencer_payout_details` is set.

---

### 8.4 Razorpay Webhook (Optional — for payment failure handling)

`POST /payment/webhook`

**Auth:** Validate `x-razorpay-signature` against webhook secret.

Handle events:
- `payment.failed` → Update campaign `payment_status` if appropriate
- `refund.processed` → Update `escrow_transactions.razorpay_refund_id`, `status = 'success'`

---

## 9. Content Delivery

### 9.1 Upload Delivery File

`POST /delivery/upload`

**Auth:** Must be `influencer_id` on campaign. Campaign must be in `in_escrow` status.

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Content file (see constraints below) |
| `campaignId` | string | Campaign UUID |

**File Constraints:**
- Max size: 50 MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/quicktime`, `video/webm`, `application/pdf`, `application/zip`

**Business Logic:**
- Upload to Supabase storage bucket `campaign-deliveries`
- Storage path: `{campaignId}/{userId}/{timestamp}-{uuid}.{ext}`

**Response:** `{ storagePath: "string" }`

---

### 9.2 Submit Delivery

`POST /campaigns/:id/deliver`

**Auth:** Must be `influencer_id` on campaign. Campaign must be in `in_escrow`.

**Request Body:**
```json
{
  "storagePath": "string",
  "notes": "optional string"
}
```

**Business Logic:**
1. Insert into `deliveries`: `{ campaign_id, submitted_by, content_url: storagePath, notes, submitted_at: NOW() }`
2. Update campaign: `status = 'delivery_submitted'`, `delivery_submitted_at = NOW()`
3. Insert notification for brand: `type = 'delivery_submitted'`
4. System message via DB trigger

---

### 9.3 Get Delivery Download URL

`GET /campaigns/:id/delivery/url`

**Auth:** Must be `business_id` on campaign.

**Business Logic:** Generate Supabase signed URL (1-hour expiry) for `deliveries.content_url`.

**Response:** `{ signedUrl: "string", expiresAt: "ISO8601" }`

---

## 10. Messaging

### 10.1 Get Conversations (Influencer)

`GET /inbox/influencer`

Returns all campaigns where user is `influencer_id`, ordered by latest message timestamp. Includes:
- Brand profile data (name, avatar)
- Latest message preview
- Unread count (messages not in `read_by` for auth user)

---

### 10.2 Get Conversations (Business)

`GET /inbox/business`

Returns all campaigns where user is `business_id`, ordered by latest message. Includes:
- Influencer profile data (name, avatar)
- Latest message preview
- Unread count

---

### 10.3 Get Messages for Campaign

`GET /campaigns/:id/messages`

**Auth:** Campaign participant.

Returns all `campaign_messages` ordered by `created_at` ASC.

---

### 10.4 Send Message

`POST /campaigns/:id/messages`

**Auth:** Campaign participant.

**Request Body:**
```json
{
  "content": "string",
  "message_type": "text"
}
```

**Business Logic:**
- Insert `campaign_messages` row
- `sender_id = auth.uid()`

---

### 10.5 Mark Messages as Read

`PATCH /campaigns/:id/messages/read`

**Auth:** Campaign participant.

**Business Logic:**
- Append `auth.uid()` to `read_by` array on all unread messages in this campaign.

---

### 10.6 Request Call

`POST /inbox/request-call`

**Auth:** Any campaign participant (typically brand requesting call with influencer).

**Request Body:** `{ campaignId: "uuid" }`

**Business Logic:**
- Cooldown: Reject with 429 if same user requested call for same campaign within last 6 hours
- Send HTML email via Resend to the other party with:
  - Campaign details
  - Deep link to conversation

**Response:** `{ ok: true }`

---

## 11. Notifications

### 11.1 Get Notifications

`GET /notifications`

**Auth:** User's own notifications. Returns newest first.

---

### 11.2 Mark Notification(s) Read

`PATCH /notifications/read`

**Request Body:** `{ ids: ["uuid", ...] }` (or `{ all: true }` to mark all)

---

### 11.3 Notification Types

| Type | Recipient | Trigger |
|------|-----------|---------|
| `new_booking` | Influencer | Brand creates campaign |
| `booking_accepted` | Brand | Influencer accepts |
| `payment_confirmed` | Influencer | Brand pays (standard flow) |
| `payment_secured` | Influencer | Escrow confirmed |
| `delivery_submitted` | Brand | Influencer submits content |
| `booking_completed` | Influencer | Brand approves / auto-release |
| `booking_rejected` | Brand | Influencer declines |
| `booking_expired` | Both | Campaign expires |
| `delivery_disputed` | Both | Brand raises dispute |

**Notification `data` JSONB shape (example):**
```json
{
  "campaignId": "uuid",
  "campaignTitle": "string",
  "influencerName": "string",
  "brandName": "string",
  "amount": 10000
}
```

---

## 12. Instagram Integration

### 12.1 Generate OAuth URL

`GET /instagram/connect`

**Query Params:** `userId`, `role` (`business` | `influencer`)

**Business Logic:**
- Generate random state: `"{role}:{sessionId}:{userId}"`
- Set httpOnly cookie `ig_oauth_state` with state value
- Build Instagram OAuth URL with scopes: `instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement`

**Response:** `{ url: "string" }`

---

### 12.2 OAuth Callback

`GET /auth/callback/instagram`

**Query Params:** `code`, `state`

**Business Logic:**
1. Validate `state` against `ig_oauth_state` cookie (CSRF check)
2. Parse `role` and `userId` from state
3. Exchange `code` for short-lived token via Instagram token endpoint
4. Exchange short-lived token for long-lived token (60-day expiry)
5. Fetch Instagram profile fields: `id,username,biography,profile_picture_url,followers_count,follows_count,media_count`
6. **If influencer:**
   - Fetch up to 100 recent media items with insights (impressions, reach, saves, video_views, like_count, comments_count)
   - Calculate `avg_likes_per_reel` from reels/video media
   - Upsert `influencer_profiles` with Instagram data, `is_active = true`
   - Upsert `instagram_media` table (all media items)
   - If pricing fields are null, trigger AI profile generation in background (§13)
   - Redirect to `/dashboard/influencer/profile?source=onboarding`
7. **If business:**
   - Upsert `business_profiles` with Instagram data
   - Redirect to `/dashboard/business/profile?source=onboarding`

---

### 12.3 Sync Instagram Data

`POST /instagram/sync`

**Auth:** Influencer role.

**Business Logic:**
- If `token_expires_at` is within 10 days: auto-refresh long-lived token
- Fetch latest 100 media items + insights from Meta Graph API
- Upsert all items into `instagram_media`
- Recalculate `avg_likes_per_reel`, `avg_views_per_reel` on `influencer_profiles`

**Response:** `{ synced: number }` (count of media items upserted)

---

## 13. AI Profile Generation

### 13.1 Generate Influencer Profile

`POST /ai/generate-profile`

**Request Body:** `{ userId: "uuid" }`

**Business Logic:**
1. Fetch `influencer_profiles` row for userId
2. Fetch top Instagram media from `instagram_media` (captions, engagement metrics)
3. Call AI (Anthropic / Google AI) to generate:
   - `category` (from §16 CATEGORIES) — inferred from content
   - `languages` — inferred from captions
   - `bio` — generated from Instagram bio + content themes
   - `price_per_reel`, `price_per_post`, `price_per_story` — based on follower count + engagement
4. Update `influencer_profiles` with generated values (only fill null fields)

**Response:** `{ ok: true }`

---

### 13.2 Generate Business Profile

`POST /ai/generate-business-profile`

**Request Body:** `{ userId: "uuid" }`

**Business Logic:**
1. Fetch `business_profiles` row
2. Call AI to generate:
   - `brand_summary` — from Instagram bio + brand type
   - `tagline` — short brand tagline
3. Update `business_profiles` with generated values (only fill null fields)

**Response:** `{ ok: true }`

---

## 14. Earnings & Tiers

### 14.1 Get Earnings Summary

`GET /influencer/earnings`

**Auth:** Influencer role.

**Business Logic:**
- Query all campaigns where `influencer_id = auth.uid()` AND `status IN ('in_escrow', 'delivery_submitted', 'completed')`
- Calculate:
  - `total_earnings` — sum of `price_offered` for `status = 'completed'`
  - `pending_earnings` — sum of `price_offered` for `status IN ('in_escrow', 'delivery_submitted')`
  - `this_month` — completed campaigns this calendar month
  - `last_month` — completed campaigns last calendar month
  - `month_over_month_change` — percentage diff

**Response:**
```json
{
  "total_earnings": 50000,
  "pending_earnings": 15000,
  "this_month": 20000,
  "last_month": 12000,
  "month_over_month_change": 0.667,
  "monthly_breakdown": [{ "month": "2025-05", "amount": 20000 }],
  "transactions": [{ "campaignId": "...", "title": "...", "amount": 10000, "status": "completed", "date": "..." }],
  "tier": "micro",
  "tier_progress": 0.45
}
```

---

### 14.2 Tier System

| Tier | Range (Total Earnings) |
|------|----------------------|
| `nano` | ₹0 – ₹9,999 |
| `micro` | ₹10,000 – ₹99,999 |
| `mid` | ₹1,00,000 – ₹4,99,999 |
| `macro` | ₹5,00,000+ |

> Also see §16 for alternative "Earnings Tiers" labeling used in UI badges (Rising Star, Influencer, Pro Influencer, Elite, Top).

---

## 15. Cron Jobs

### 15.1 Auto-Release & Expiry Cleanup

`GET /cron/auto-release`

**Auth:** `x-cron-secret` header.

**Schedule:** Daily at 02:30 AM IST (21:00 UTC previous day).

**Operations in order:**

1. **Auto-release campaigns:**
   - Find campaigns in `delivery_submitted` where `delivery_submitted_at < NOW() - 7 days`
   - For each: call release-escrow logic (§8.3), set `status = 'completed'`
   - Insert `notifications` for both parties

2. **Expire `requested` campaigns:**
   - Find campaigns in `requested` where `expires_at < NOW()`
   - Set `status = 'expired'`
   - Insert `notifications` for brand: `type = 'booking_expired'`

3. **Expire `payment_pending` campaigns:**
   - Find campaigns in `payment_pending` where `expires_at < NOW()`
   - Set `status = 'expired'`
   - Insert `notifications` for both parties

4. **Expire `pre_authorized` campaigns:**
   - Find campaigns in `pre_authorized` where `expires_at < NOW()`
   - If `payment_method = 'upi'` AND payment was captured: Issue Razorpay refund via `razorpay.payments.refund(razorpay_payment_id, { amount: total_charged_paise })`
   - If `payment_method = 'card'`: No action (Razorpay auto-voids pre-auth after 5 days)
   - Set `status = 'expired'`
   - Insert `notifications` for both parties

---

## 16. Constants & Enumerations

### Categories (Influencer)
```
Food | Fitness | Beauty | Lifestyle | Travel | Education | Tech | Fashion | Other
```

### Business Types
```
Restaurant/Cafe | D2C Brand | Local Business | E-commerce | SaaS/Tech | Agency | Personal Brand | Other
```

### Package Types
```
reel | post | story | reel+story | reel+post
```

### Booking Objectives
```
visit_place | feature_product | showcase_service | promote_offer | brand_shoutout
```

Venue address required for: `visit_place`

### Turnaround Times
```
24_hours | 2_3_days | 1_week | 2_weeks
```

### Languages
```
English | Hindi | Telugu | Tamil | Kannada | Malayalam | Marathi | Bengali | Gujarati | Punjabi | Urdu | Other
```

### Content Types
```
Product Reviews | Tutorials | Vlogs | Reels/Shorts | Stories | Unboxing | Recipe | Before/After | Day in Life | Brand Integration
```

### Earnings Tier Labels (UI display)
| Label | Range |
|-------|-------|
| Rising Star | ₹0 – ₹24,999 |
| Influencer | ₹25,000 – ₹99,999 |
| Pro Influencer | ₹1,00,000 – ₹4,99,999 |
| Elite Influencer | ₹5,00,000 – ₹14,99,999 |
| Top Influencer | ₹15,00,000+ |

---

## 17. Platform Business Rules

| Rule | Value |
|------|-------|
| Platform fee rate | 12% (`PLATFORM_FEE_RATE = 0.12`) |
| Campaign booking expiry (influencer to respond) | 48 hours |
| Payment expiry after acceptance | 24 hours |
| Pre-auth expiry (influencer to accept) | 24 hours |
| Auto-release after delivery submitted | 7 days |
| Call request cooldown | 6 hours |
| Razorpay card pre-auth auto-void | 5 days (Razorpay-enforced) |
| Instagram long-lived token expiry | 60 days |
| Instagram token auto-refresh threshold | 10 days before expiry |
| Max delivery file size | 50 MB |
| Max Instagram media sync | 100 items |
| AI profile generation timeout | 60 seconds (influencer), 120 seconds (business) |
| AI profile polling interval | 3 seconds |
| Amounts in escrow_transactions | Paise (₹ × 100) |
| Amounts in campaigns table | Rupees (₹) |

---

## Appendix: Complete API Endpoint Summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/influencers` | optional | List active influencers with filters |
| GET | `/influencers/:id` | optional | Get single influencer profile |
| GET | `/campaigns` | required | List campaigns for auth user |
| GET | `/campaigns/:id` | required | Get single campaign |
| POST | `/campaigns` | business | Create campaign (book influencer) |
| POST | `/campaigns/:id/accept` | influencer | Accept campaign |
| POST | `/campaigns/:id/decline` | influencer | Decline campaign |
| POST | `/campaigns/:id/approve` | business | Approve delivery |
| POST | `/campaigns/:id/dispute` | business | Raise dispute |
| POST | `/campaigns/:id/deliver` | influencer | Submit delivery |
| GET | `/campaigns/:id/delivery/url` | business | Get signed download URL |
| GET | `/campaigns/:id/messages` | participant | Get chat messages |
| POST | `/campaigns/:id/messages` | participant | Send message |
| PATCH | `/campaigns/:id/messages/read` | participant | Mark messages read |
| GET | `/notifications` | required | Get user notifications |
| PATCH | `/notifications/read` | required | Mark notifications read |
| GET | `/inbox/influencer` | influencer | Get influencer conversations |
| GET | `/inbox/business` | business | Get business conversations |
| POST | `/inbox/request-call` | required | Request call with counterpart |
| GET | `/instagram/connect` | required | Get Instagram OAuth URL |
| GET | `/auth/callback/instagram` | public | Instagram OAuth callback |
| POST | `/instagram/sync` | influencer | Sync Instagram media |
| POST | `/ai/generate-profile` | internal | Generate influencer AI profile |
| POST | `/ai/generate-business-profile` | internal | Generate business AI profile |
| POST | `/payment/create-order` | business | Create Razorpay order (standard) |
| POST | `/payment/verify` | business | Verify payment (standard) |
| POST | `/payment/create-escrow-order` | business | Create order for escrow lock |
| POST | `/payment/verify-escrow` | business | Verify escrow payment |
| POST | `/payment/create-booking-order` | business | Create pre-auth booking order |
| POST | `/payment/verify-booking-payment` | business | Verify + create pre-auth campaign |
| POST | `/payment/capture-booking-payment` | internal | Capture card pre-auth |
| POST | `/payment/release-escrow` | business/cron | Release payment to influencer |
| POST | `/payment/webhook` | razorpay | Razorpay webhook handler |
| POST | `/delivery/upload` | influencer | Upload delivery file |
| GET | `/influencer/profile` | influencer | Get own influencer profile |
| PATCH | `/influencer/profile` | influencer | Update influencer profile |
| PATCH | `/influencer/profile/pricing` | influencer | Update pricing |
| PATCH | `/influencer/profile/active` | influencer | Toggle active status |
| GET | `/influencer/payout` | influencer | Get payout details |
| PUT | `/influencer/payout` | influencer | Upsert payout details |
| GET | `/influencer/earnings` | influencer | Get earnings summary |
| GET | `/business/profile` | business | Get own business profile |
| PATCH | `/business/profile` | business | Update business profile |
| GET | `/cron/auto-release` | cron | Daily cleanup job |
