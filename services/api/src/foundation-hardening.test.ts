import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import {
  FakeAiProvider,
  FakeEmailProvider,
  FakeInstagramProvider,
  FakePaymentProvider,
  FakePushProvider,
  FakeStorageProvider,
} from './testing/fakes.js';
import { MemoryDataStore } from './testing/memory-store.js';

const businessId = '11111111-1111-4111-8111-111111111111';
const influencerId = '22222222-2222-4222-8222-222222222222';
const outsiderId = '99999999-9999-4999-8999-999999999999';
const influencerProfileId = '33333333-3333-4333-8333-333333333333';
const campaignId = '44444444-4444-4444-8444-444444444444';

function makeApp(
  seed: Record<string, unknown> = {},
  overrides?: { withStorage?: boolean; pushShouldFail?: boolean },
) {
  const store = new MemoryDataStore({
    profiles: [
      { id: businessId, email: 'brand@test.dev', full_name: 'Brand Owner' },
      { id: influencerId, email: 'creator@test.dev', full_name: 'Creator' },
      { id: outsiderId, email: 'outsider@test.dev', full_name: 'Outsider' },
    ],
    user_roles: [
      { id: 'role-business', user_id: businessId, role: 'business' },
      { id: 'role-influencer', user_id: influencerId, role: 'influencer' },
    ],
    business_profiles: [
      {
        id: 'bp-1',
        user_id: businessId,
        brand_name: 'Plugoh Cafe',
        brand_type: 'Restaurant/Cafe',
        brand_location: 'Hyderabad',
      },
    ],
    influencer_profiles: [
      {
        id: influencerProfileId,
        user_id: influencerId,
        display_name: 'Creator One',
        city: 'Hyderabad',
        category: 'Food',
        price_per_reel: 10000,
        price_per_post: 8000,
        price_per_story: 3000,
        follower_count: 25000,
        avg_likes_per_reel: 500,
        is_active: true,
      },
    ],
    campaigns: [],
    campaign_messages: [],
    notifications: [],
    deliveries: [],
    escrow_transactions: [],
    instagram_media: [],
    influencer_payout_details: [],
    user_push_tokens: [],
    ...seed,
  });

  const push = new FakePushProvider();
  push.shouldFail = overrides?.pushShouldFail ?? false;

  const app = createApp({
    store,
    config: {
      port: 4000,
      demoEnabled: true,
    },
    authVerifier: async (token) => {
      if (token === 'business') return { id: businessId, email: 'brand@test.dev' };
      if (token === 'influencer') return { id: influencerId, email: 'creator@test.dev' };
      if (token === 'outsider') return { id: outsiderId, email: 'outsider@test.dev' };
      throw new Error('bad token');
    },
    providers: {
      payment: new FakePaymentProvider(),
      storage: overrides?.withStorage === false ? undefined : new FakeStorageProvider(),
      email: new FakeEmailProvider(),
      instagram: new FakeInstagramProvider(),
      ai: new FakeAiProvider(),
      push,
    },
  });

  return { app, store, push };
}

async function json(res: Response) {
  return await res.json();
}

describe('Foundation Hardening Routes', () => {
  it('returns /me/bootstrap for authenticated users', async () => {
    const { app } = makeApp();
    const res = await app.request('/me/bootstrap', {
      headers: { authorization: 'Bearer influencer' },
    });
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body.data.user.id).toBe(influencerId);
    expect(body.data.onboardingStage).toBe('needs_basics');
  });

  it('returns JSON when authenticated bootstrap requests are rate limited', async () => {
    const { app } = makeApp();
    let res: Response | undefined;

    for (let i = 0; i < 121; i += 1) {
      res = await app.request('/me/bootstrap', {
        headers: { authorization: 'Bearer influencer' },
      });
    }

    expect(res?.status).toBe(429);
    expect(res?.headers.get('content-type')).toContain('application/json');
    const body = await json(res);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('validates /influencer/onboarding payload and persists onboarding basics', async () => {
    const { app, store } = makeApp({
      profiles: [{ id: influencerId, email: 'creator@test.dev' }],
      influencer_profiles: [],
    });

    const invalid = await app.request('/influencer/onboarding', {
      method: 'POST',
      headers: { authorization: 'Bearer influencer', 'content-type': 'application/json' },
      body: JSON.stringify({ full_name: '', phone: '', location: '' }),
    });
    expect(invalid.status).toBe(400);

    const valid = await app.request('/influencer/onboarding', {
      method: 'POST',
      headers: { authorization: 'Bearer influencer', 'content-type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Creator New',
        phone: '+919999999999',
        location: 'Hyderabad',
      }),
    });
    expect(valid.status).toBe(200);
    const profile = store.tables
      .get('influencer_profiles')
      ?.find((row) => row.user_id === influencerId);
    expect(profile?.city).toBe('Hyderabad');
  });

  it('supports /push/register and /push/unregister with auth + validation', async () => {
    const { app, store } = makeApp();

    const unauth = await app.request('/push/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expo_push_token: 'ExponentPushToken[abc]', platform: 'ios' }),
    });
    expect(unauth.status).toBe(401);

    const invalid = await app.request('/push/register', {
      method: 'POST',
      headers: { authorization: 'Bearer influencer', 'content-type': 'application/json' },
      body: JSON.stringify({ expo_push_token: '', platform: 'ios' }),
    });
    expect(invalid.status).toBe(400);

    const register = await app.request('/push/register', {
      method: 'POST',
      headers: { authorization: 'Bearer influencer', 'content-type': 'application/json' },
      body: JSON.stringify({ expo_push_token: 'ExponentPushToken[abc]', platform: 'ios' }),
    });
    expect(register.status).toBe(200);
    expect(
      store.tables.get('user_push_tokens')?.find((row) => row.user_id === influencerId)
        ?.expo_push_token,
    ).toBe('ExponentPushToken[abc]');

    const unregister = await app.request('/push/unregister', {
      method: 'POST',
      headers: { authorization: 'Bearer influencer' },
    });
    expect(unregister.status).toBe(200);
    expect(
      store.tables.get('user_push_tokens')?.find((row) => row.user_id === influencerId)
        ?.expo_push_token,
    ).toBeNull();
  });

  it('enforces /campaigns/:id/messages/attachment validation and storage provider checks', async () => {
    const baseSeed = {
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'in_escrow',
          price_offered: 10000,
          platform_fee_amount: 1200,
          total_charged_amount: 11200,
        },
      ],
    };

    const withStorage = makeApp(baseSeed);
    const missingFile = await withStorage.app.request(
      `/campaigns/${campaignId}/messages/attachment`,
      {
        method: 'POST',
        headers: { authorization: 'Bearer influencer' },
        body: new FormData(),
      },
    );
    expect(missingFile.status).toBe(400);

    const withoutStorage = makeApp(baseSeed, { withStorage: false });
    const form = new FormData();
    form.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }));
    const noStorage = await withoutStorage.app.request(
      `/campaigns/${campaignId}/messages/attachment`,
      {
        method: 'POST',
        headers: { authorization: 'Bearer influencer' },
        body: form,
      },
    );
    const noStorageBody = await json(noStorage);
    expect(noStorage.status).toBe(400);
    expect(noStorageBody.error.code).toBe('STORAGE_PROVIDER_UNAVAILABLE');
  });

  it('rejects non-text message types on /campaigns/:id/messages', async () => {
    const { app } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'in_escrow',
          price_offered: 10000,
          platform_fee_amount: 1200,
          total_charged_amount: 11200,
        },
      ],
    });
    const res = await app.request(`/campaigns/${campaignId}/messages`, {
      method: 'POST',
      headers: { authorization: 'Bearer influencer', 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'forged', message_type: 'system' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects unsupported attachment mime types', async () => {
    const { app } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'in_escrow',
          price_offered: 10000,
          platform_fee_amount: 1200,
          total_charged_amount: 11200,
        },
      ],
    });
    const form = new FormData();
    form.append('file', new File(['#!/bin/bash'], 'script.sh', { type: 'application/x-sh' }));
    const res = await app.request(`/campaigns/${campaignId}/messages/attachment`, {
      method: 'POST',
      headers: { authorization: 'Bearer influencer' },
      body: form,
    });
    const body = await json(res);
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('restricts /campaigns/:id/delivery/url to campaign participants', async () => {
    const { app } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'delivery_submitted',
          price_offered: 10000,
          platform_fee_amount: 1200,
          total_charged_amount: 11200,
        },
      ],
      deliveries: [
        {
          id: 'delivery-1',
          campaign_id: campaignId,
          submitted_by: influencerId,
          content_url: 'deliveries/path/file.mp4',
        },
      ],
    });

    const allowed = await app.request(`/campaigns/${campaignId}/delivery/url`, {
      headers: { authorization: 'Bearer influencer' },
    });
    expect(allowed.status).toBe(200);

    const blocked = await app.request(`/campaigns/${campaignId}/delivery/url`, {
      headers: { authorization: 'Bearer outsider' },
    });
    expect(blocked.status).toBe(403);
  });

  it('validates mobile Instagram OAuth state and redirects correctly for valid callback', async () => {
    const { app } = makeApp();

    const invalid = await app.request('/auth/callback/instagram?code=test-code&state=bad-state');
    expect(invalid.status).toBe(403);

    const connect = await app.request(
      `/instagram/connect?userId=${influencerId}&role=influencer&platform=mobile`,
      { headers: { authorization: 'Bearer influencer' } },
    );
    expect(connect.status).toBe(200);
    const cookie = connect.headers.get('set-cookie') ?? '';
    const stateMatch = cookie.match(/ig_oauth_state=([^;]+)/);
    expect(stateMatch?.[1]).toBeTruthy();
    const state = decodeURIComponent(stateMatch[1]);

    const callback = await app.request(
      `/auth/callback/instagram?code=test-code&state=${encodeURIComponent(state)}`,
      {
        headers: { cookie: `ig_oauth_state=${encodeURIComponent(state)}` },
      },
    );
    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).toContain(
      'plugoh://instagram/callback?status=success&role=influencer&source=onboarding',
    );
  });

  it('keeps request success path when push provider fails while still attempting push delivery', async () => {
    const { app, store, push } = makeApp(
      {
        user_push_tokens: [
          {
            id: 'push-1',
            user_id: influencerId,
            expo_push_token: 'ExponentPushToken[abc]',
            platform: 'ios',
          },
        ],
      },
      { pushShouldFail: true },
    );

    const res = await app.request('/campaigns', {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({
        influencer_id: influencerId,
        influencer_profile_id: influencerProfileId,
        package_type: 'reel',
        price_offered: 10000,
        objective: 'visit_place',
        timing_mode: 'choose_date',
        due_date: '2026-07-01',
        event_name: 'Hyderabad',
        contact_email: 'brand@test.dev',
        contact_phone: '+919999999999',
      }),
    });

    expect(res.status).toBe(201);
    expect(store.tables.get('notifications')?.length).toBeGreaterThan(0);
    expect(push.sent.length).toBeGreaterThan(0);
  });
});
