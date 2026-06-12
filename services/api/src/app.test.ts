import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createServices } from './services/marketplace.js';
import {
  FakeAiProvider,
  FakeEmailProvider,
  FakeGeocodingProvider,
  FakeInstagramProvider,
  FakePaymentProvider,
  FakeStorageProvider,
} from './testing/fakes.js';
import { MemoryDataStore } from './testing/memory-store.js';

const businessId = '11111111-1111-4111-8111-111111111111';
const influencerId = '22222222-2222-4222-8222-222222222222';
const influencerProfileId = '33333333-3333-4333-8333-333333333333';
const campaignId = '44444444-4444-4444-8444-444444444444';

function signature(orderId: string, paymentId: string) {
  return crypto.createHmac('sha256', 'test_secret').update(`${orderId}|${paymentId}`).digest('hex');
}

function webhookSignature(body: string) {
  return crypto.createHmac('sha256', 'webhook_secret').update(body).digest('hex');
}

function makeApp(seed = {}) {
  const store = new MemoryDataStore({
    profiles: [
      { id: businessId, email: 'brand@test.dev', full_name: 'Brand Owner' },
      { id: influencerId, email: 'creator@test.dev', full_name: 'Creator' },
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
        brand_category: 'restaurant_cafe',
        brand_location: 'Hyderabad',
      },
    ],
    influencer_profiles: [
      {
        id: influencerProfileId,
        user_id: influencerId,
        display_name: 'Creator One',
        city: 'Hyderabad',
        category: 'food',
        price_per_reel_paise: 3000,
        follower_count: 25000,
        avg_likes_per_reel: 500,
        is_active: true,
      },
    ],
    campaigns: [],
    campaign_messages: [],
    notifications: [],
    deliveries: [],
    escrow_ledger_entries: [],
    payment_orders: [],
    instagram_media: [],
    influencer_payout_accounts: [],
    ...seed,
  });
  const payment = new FakePaymentProvider();
  const storage = new FakeStorageProvider();
  const ai = new FakeAiProvider();
  const geocoding = new FakeGeocodingProvider();
  const app = createApp({
    store,
    config: {
      port: 4000,
      internalSecret: 'internal',
      cronSecret: 'cron',
      razorpayKeyId: 'rzp_test_public',
      razorpayWebhookSecret: 'webhook_secret',
      demoEnabled: true,
    },
    authVerifier: async (token) => {
      if (token === 'business') return { id: businessId, email: 'brand@test.dev' };
      if (token === 'influencer') return { id: influencerId, email: 'creator@test.dev' };
      throw new Error('bad token');
    },
    providers: {
      payment,
      storage,
      email: new FakeEmailProvider(),
      geocoding,
      instagram: new FakeInstagramProvider(),
      ai,
    },
  });
  return { app, store, payment, storage, ai, geocoding };
}

class SearchFallbackStore extends MemoryDataStore {
  override async list<T extends Record<string, any>>(table: string, options = {}, select?: string) {
    if (table === 'influencer_profiles' && 'or' in options && options.or) {
      return [] as T[];
    }
    return super.list<T>(table, options, select);
  }
}

class NoConflictUpsertStore extends MemoryDataStore {
  override async upsert<T extends Record<string, any>>(
    table: string,
    values: Record<string, any>,
    onConflict?: string,
    select?: string,
  ) {
    if (['user_roles', 'profiles', 'business_profiles', 'influencer_profiles'].includes(table)) {
      throw new Error(`unexpected upsert on ${table}`);
    }
    return super.upsert<T>(table, values, onConflict, select);
  }
}

async function json(res: Response) {
  return await res.json();
}

describe('Plugoh API', () => {
  it('returns health and consistent 404 errors', async () => {
    const { app } = makeApp();
    expect((await app.request('/healthz/live')).status).toBe(200);
    const missing = await app.request('/missing');
    expect(missing.status).toBe(404);
    expect((await json(missing)).success).toBe(false);
  });

  it('lists and filters active influencers without auth', async () => {
    const { app } = makeApp();
    const res = await app.request('/influencers?search=creator&category=food&sort=price_asc');
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].starter_price_paise).toBe(3000);
    expect(body.data.items[0].starterPrice).toBe(30);
    expect(body.data.nextOffset).toBeNull();
    expect(body.data.total).toBe(1);
  });

  it('falls back to in-memory search when datastore search returns no rows', async () => {
    const store = new SearchFallbackStore({
      influencer_profiles: [
        {
          id: influencerProfileId,
          user_id: influencerId,
          display_name: 'Creator One',
          city: 'Hyderabad',
          category: 'food',
          price_per_reel_paise: 3000,
          is_active: true,
        },
      ],
    });
    const app = createApp({ store, config: { port: 4000, demoEnabled: false }, providers: {} });
    const res = await app.request('/influencers?search=creator');
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
  });

  it('supports influencer discovery pagination', async () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      user_id: `00000000-0000-4000-8000-${String(index + 101).padStart(12, '0')}`,
      display_name: `Creator ${index + 1}`,
      city: 'Hyderabad',
      category: 'food',
      price_per_reel_paise: 2000 + index,
      is_active: true,
    }));
    const { app } = makeApp({ influencer_profiles: rows });
    const res = await app.request('/influencers?limit=10&offset=10&sort=price_asc');
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(10);
    expect(body.data.nextOffset).toBe(20);
    expect(body.data.total).toBe(25);
  });

  it('does not run auth verification for public influencer discovery', async () => {
    const store = new MemoryDataStore({
      influencer_profiles: [
        {
          id: influencerProfileId,
          user_id: influencerId,
          display_name: 'Creator One',
          is_active: true,
        },
      ],
    });
    let authCalls = 0;
    const app = createApp({
      store,
      config: { port: 4000, demoEnabled: false },
      authVerifier: async () => {
        authCalls += 1;
        return { id: businessId };
      },
      providers: {},
    });
    const res = await app.request('/influencers', {
      headers: { authorization: 'Bearer should-not-be-read' },
    });
    expect(res.status).toBe(200);
    expect(authCalls).toBe(0);
  });

  it('returns needs_role stage when authenticated user has no role', async () => {
    const store = new MemoryDataStore({
      profiles: [
        {
          id: businessId,
          email: 'brand@test.dev',
          full_name: 'Brand Owner',
          phone: '+919999999999',
          location: 'Hyderabad',
        },
      ],
      user_roles: [],
      campaigns: [],
      campaign_messages: [],
      notifications: [],
    });
    const app = createApp({
      store,
      config: { port: 4000, demoEnabled: false },
      authVerifier: async () => ({ id: businessId, email: 'brand@test.dev' }),
      providers: {},
    });
    const res = await app.request('/me/bootstrap', { headers: { authorization: 'Bearer any' } });
    expect(res.status).toBe(200);
    expect((await json(res)).data.onboardingStage).toBe('needs_role');
  });

  it('supports business role + basics + onboarding and reaches ready', async () => {
    const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const store = new MemoryDataStore({
      profiles: [],
      user_roles: [],
      business_profiles: [],
      campaigns: [],
      campaign_messages: [],
      notifications: [],
    });
    const app = createApp({
      store,
      config: { port: 4000, demoEnabled: false },
      authVerifier: async () => ({ id: userId, email: 'brand@test.dev' }),
      providers: {},
    });
    const roleRes = await app.request('/me/role', {
      method: 'POST',
      headers: { authorization: 'Bearer any', 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'business' }),
    });
    expect(roleRes.status).toBe(200);
    const basicsRes = await app.request('/me/profile', {
      method: 'PATCH',
      headers: { authorization: 'Bearer any', 'content-type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Brand Owner',
        phone: '+919999999999',
        location: 'Hyderabad',
      }),
    });
    expect(basicsRes.status).toBe(200);
    const onboardingRes = await app.request('/business/onboarding', {
      method: 'POST',
      headers: { authorization: 'Bearer any', 'content-type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Brand Owner',
        phone: '+919999999999',
        location: 'Hyderabad',
        brand_name: 'Plugoh Cafe',
        brand_category: 'restaurant_cafe',
      }),
    });
    expect(onboardingRes.status).toBe(200);
    const bootstrap = await app.request('/me/bootstrap', {
      headers: { authorization: 'Bearer any' },
    });
    expect(bootstrap.status).toBe(200);
    expect((await json(bootstrap)).data.onboardingStage).toBe('ready');
  });

  it('keeps business profile patch as edit-only for business users', async () => {
    const { app, store } = makeApp();
    const forbiddenRes = await app.request('/business/profile', {
      method: 'PATCH',
      headers: { authorization: 'Bearer influencer', 'content-type': 'application/json' },
      body: JSON.stringify({ brand_name: 'New Name' }),
    });
    expect(forbiddenRes.status).toBe(403);

    const okRes = await app.request('/business/profile', {
      method: 'PATCH',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({ brand_name: 'New Name' }),
    });
    expect(okRes.status).toBe(200);
    expect(store.tables.get('business_profiles')?.[0].brand_name).toBe('New Name');
  });

  it('creates business onboarding without relying on datastore upsert conflict targets', async () => {
    const store = new NoConflictUpsertStore({
      profiles: [],
      user_roles: [],
      business_profiles: [],
      influencer_profiles: [],
      campaigns: [],
      campaign_messages: [],
      notifications: [],
      deliveries: [],
      escrow_ledger_entries: [],
      instagram_media: [],
      influencer_payout_accounts: [],
    });
    const app = createApp({
      store,
      config: { port: 4000, demoEnabled: false },
      authVerifier: async () => ({ id: businessId, email: 'brand@test.dev' }),
      providers: { geocoding: new FakeGeocodingProvider() },
    });
    const res = await app.request('/business/onboarding', {
      method: 'POST',
      headers: { authorization: 'Bearer any', 'content-type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Brand Owner',
        phone: '+919999999999',
        location: 'Hyderabad',
        brand_name: 'Plugoh Cafe',
        brand_category: 'restaurant_cafe',
      }),
    });
    expect(res.status).toBe(200);
    expect(store.tables.get('user_roles')?.[0].role).toBe('business');
    expect(store.tables.get('profiles')?.[0].full_name).toBe('Brand Owner');
    const businessProfile = store.tables.get('business_profiles')?.[0];
    expect(businessProfile?.brand_name).toBe('Plugoh Cafe');
    expect(businessProfile?.brand_latitude).toBe(17.4065);
    expect(businessProfile?.brand_longitude).toBe(78.4772);
  });

  it('creates a campaign and notifies the influencer', async () => {
    const { app, store } = makeApp();
    const res = await app.request('/campaigns', {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({
        influencer_id: influencerId,
        influencer_profile_id: influencerProfileId,
        package_type: 'instagram_reel',
        price_offered_paise: 10000,
        objective: 'visit_place',
        timing_mode: 'choose_date',
        due_date: '2026-07-01',
        place_name: 'Hyderabad',
        business_contact_email: 'brand@test.dev',
        business_contact_phone: '+919999999999',
      }),
    });
    expect(res.status).toBe(201);
    expect((await json(res)).data.campaignId).toBeTruthy();
    expect(store.tables.get('notifications')?.[0].type).toBe('new_booking');
    const campaign = store.tables.get('campaigns')?.[0];
    expect(campaign?.ai_title).toBe('Aura Weekend Reel');
    expect(campaign?.due_date).toBe('2026-07-01');
    expect(campaign?.brief).toContain('Due date: 2026-07-01');
    expect(campaign?.brief).not.toContain('choose_date');
    expect(campaign?.place_latitude).toBe(17.4065);
    expect(campaign?.place_longitude).toBe(78.4772);
    expect(campaign?.card_image_url).toContain('https://storage.test/campaigns/');
    expect(campaign?.creative_status).toBe('ready');

    const detail = await app.request(`/campaigns/${campaign?.id}`, {
      headers: { authorization: 'Bearer business' },
    });
    const detailBody = await json(detail);
    expect(detailBody.data.place_latitude).toBe(17.4065);
    expect(detailBody.data.place_longitude).toBe(78.4772);

    const list = await app.request('/campaigns?role=business', {
      headers: { authorization: 'Bearer business' },
    });
    const listBody = await json(list);
    expect(listBody.data.items[0].place_latitude).toBe(17.4065);
    expect(listBody.data.items[0].place_longitude).toBe(78.4772);
  });

  it('keeps campaign creation successful when geocoding fails', async () => {
    const { app, store, geocoding } = makeApp();
    geocoding.shouldFail = true;

    const res = await app.request('/campaigns', {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({
        influencer_id: influencerId,
        influencer_profile_id: influencerProfileId,
        package_type: 'instagram_reel',
        price_offered_paise: 10000,
        objective: 'visit_place',
        timing_mode: 'choose_date',
        due_date: '2026-07-01',
        place_name: 'Hyderabad',
        business_contact_email: 'brand@test.dev',
        business_contact_phone: '+919999999999',
      }),
    });

    expect(res.status).toBe(201);
    const campaign = store.tables.get('campaigns')?.[0];
    expect(geocoding.calls).toContain('Hyderabad');
    expect(campaign?.place_name).toBe('Hyderabad');
    expect(campaign?.place_latitude).toBeNull();
    expect(campaign?.place_longitude).toBeNull();
  });

  it('keeps campaign creation successful when campaign creative generation fails', async () => {
    const { app, store, ai } = makeApp();
    ai.shouldFailCampaignCreative = true;

    const res = await app.request('/campaigns', {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({
        influencer_id: influencerId,
        influencer_profile_id: influencerProfileId,
        package_type: 'instagram_reel',
        price_offered_paise: 10000,
        objective: 'visit_place',
        timing_mode: 'choose_date',
        due_date: '2026-07-01',
        place_name: 'Hyderabad',
        business_contact_email: 'brand@test.dev',
        business_contact_phone: '+919999999999',
      }),
    });

    expect(res.status).toBe(201);
    const campaign = store.tables.get('campaigns')?.[0];
    expect(campaign?.card_image_url).toBeUndefined();
    expect(campaign?.creative_status).toBe('failed');
    expect(campaign?.creative_error).toContain('fake campaign creative failure');
  });

  it('hydrates campaign business profile images from Instagram and common profile data', async () => {
    const { app } = makeApp({
      profiles: [
        {
          id: businessId,
          email: 'brand@test.dev',
          full_name: 'Brand Owner',
          avatar_url: 'https://cdn.test/brand-avatar.jpg',
        },
        { id: influencerId, email: 'creator@test.dev', full_name: 'Creator' },
      ],
      business_profiles: [
        {
          id: 'bp-1',
          user_id: businessId,
          brand_name: 'Plugoh Cafe',
          brand_category: 'restaurant_cafe',
          brand_location: 'Hyderabad',
          instagram_profile_picture_url: 'https://cdn.test/brand-instagram.jpg',
        },
      ],
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'pre_authorized',
          price_offered_paise: 10000,
          package_type: 'instagram_reel',
        },
      ],
    });

    const res = await app.request('/campaigns?role=influencer', {
      headers: { authorization: 'Bearer influencer' },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.items[0].business_profile.profile_photo_url).toBe(
      'https://cdn.test/brand-instagram.jpg',
    );
    expect(body.data.items[0].business_profile.avatar_url).toBe(
      'https://cdn.test/brand-avatar.jpg',
    );
  });

  it('hydrates inbox campaign business profile images from the brand owner', async () => {
    const { app } = makeApp({
      profiles: [
        {
          id: businessId,
          email: 'brand@test.dev',
          full_name: 'Brand Owner',
          avatar_url: 'https://cdn.test/brand-avatar.jpg',
        },
        { id: influencerId, email: 'creator@test.dev', full_name: 'Creator' },
      ],
      business_profiles: [
        {
          id: 'bp-1',
          user_id: businessId,
          brand_name: 'Plugoh Cafe',
          brand_category: 'restaurant_cafe',
          brand_location: 'Hyderabad',
          instagram_profile_picture_url: 'https://cdn.test/brand-instagram.jpg',
        },
      ],
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'in_escrow',
          price_offered_paise: 10000,
          package_type: 'instagram_reel',
          created_at: '2026-05-16T00:00:00.000Z',
        },
      ],
      campaign_messages: [
        {
          id: 'message-1',
          campaign_id: campaignId,
          sender_id: businessId,
          message_type: 'text',
          content: 'Hello',
          read_by: [],
          created_at: '2026-05-16T01:00:00.000Z',
        },
      ],
    });

    const res = await app.request('/inbox/influencer', {
      headers: { authorization: 'Bearer influencer' },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data[0].campaign.business_profile.profile_photo_url).toBe(
      'https://cdn.test/brand-instagram.jpg',
    );
    expect(body.data[0].campaign.business_profile.avatar_url).toBe(
      'https://cdn.test/brand-avatar.jpg',
    );
    // Aggregated via the inbox_summary RPC: latest message + unread count.
    expect(body.data[0].latestMessage.content).toBe('Hello');
    expect(body.data[0].unreadCount).toBe(1);
  });

  it('validates campaign booking requirements', async () => {
    const { app } = makeApp();
    const res = await app.request('/campaigns', {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({
        influencer_id: influencerId,
        influencer_profile_id: influencerProfileId,
        package_type: 'instagram_reel',
        price_offered_paise: 10000,
        objective: 'visit_place',
        timing_mode: 'asap',
        business_contact_email: 'brand@test.dev',
        business_contact_phone: '+919999999999',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('accepts a pre_authorized campaign into capture_pending', async () => {
    const { app, store } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'pre_authorized',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
      payment_orders: [
        {
          id: 'payment-order-accept',
          campaign_id: campaignId,
          provider: 'razorpay',
          provider_order_id: 'order_accept',
          status: 'authorized',
          amount_paise: 11200,
          currency: 'INR',
        },
      ],
    });
    const res = await app.request(`/campaigns/${campaignId}/accept`, {
      method: 'POST',
      headers: { authorization: 'Bearer influencer' },
    });
    expect(res.status).toBe(200);
    expect(store.tables.get('campaigns')?.[0].status).toBe('capture_pending');
  });

  it('verifies escrow payment idempotently', async () => {
    const orderId = 'order_test';
    const paymentId = 'pay_card';
    const { app, store } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'capture_pending',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
          razorpay_order_id: orderId,
        },
      ],
      payment_orders: [
        {
          id: 'payment-order-verify',
          campaign_id: campaignId,
          provider: 'razorpay',
          provider_order_id: orderId,
          status: 'created',
          amount_paise: 11200,
          currency: 'INR',
        },
      ],
    });
    const payload = {
      campaign_id: campaignId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature(orderId, paymentId),
    };
    const first = await app.request('/payment/verify-escrow', {
      method: 'POST',
      headers: {
        authorization: 'Bearer business',
        'content-type': 'application/json',
        'idempotency-key': 'verify-1',
      },
      body: JSON.stringify(payload),
    });
    const second = await app.request('/payment/verify', {
      method: 'POST',
      headers: {
        authorization: 'Bearer business',
        'content-type': 'application/json',
        'idempotency-key': 'verify-2',
      },
      body: JSON.stringify(payload),
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(store.tables.get('campaigns')?.[0].status).toBe('in_escrow');
  });

  it('keeps create-order as an alias of create-escrow-order', async () => {
    const { app } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'pre_authorized',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
    });
    const first = await app.request('/payment/create-escrow-order', {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId }),
    });
    const second = await app.request('/payment/create-order', {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId }),
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await json(first)).data.orderId).toBe((await json(second)).data.orderId);
  });

  it('rejects booking verification when the paid Razorpay order amount does not match the pre_authorized booking amount', async () => {
    const { app } = makeApp();
    const res = await app.request('/payment/verify-booking-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer business',
        'content-type': 'application/json',
        'idempotency-key': 'booking-verify-1',
      },
      body: JSON.stringify({
        razorpay_order_id: 'order_paid_for_small_amount',
        razorpay_payment_id: 'pay_card',
        razorpay_signature: signature('order_paid_for_small_amount', 'pay_card'),
        influencer_id: influencerId,
        influencer_profile_id: influencerProfileId,
        package_type: 'instagram_reel',
        objective: 'feature_product',
        timing_mode: 'asap',
        business_contact_email: 'brand@test.dev',
        business_contact_phone: '+919999999999',
      }),
    });
    expect(res.status).toBe(409);
  });

  it('generates campaign creative after successful booking payment verification', async () => {
    const { app, store } = makeApp({
      influencer_profiles: [
        {
          id: influencerProfileId,
          user_id: influencerId,
          display_name: 'Creator One',
          city: 'Hyderabad',
          category: 'food',
          price_per_reel_paise: 10000,
          follower_count: 25000,
          avg_likes_per_reel: 500,
          is_active: true,
        },
      ],
    });
    const orderId = 'order_booking_ok';
    const paymentId = 'pay_card';

    const res = await app.request('/payment/verify-booking-payment', {
      method: 'POST',
      headers: {
        authorization: 'Bearer business',
        'content-type': 'application/json',
        'idempotency-key': 'booking-verify-ok',
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature(orderId, paymentId),
        influencer_id: influencerId,
        influencer_profile_id: influencerProfileId,
        package_type: 'instagram_reel',
        objective: 'feature_product',
        timing_mode: 'asap',
        business_contact_email: 'brand@test.dev',
        business_contact_phone: '+919999999999',
      }),
    });

    expect(res.status).toBe(200);
    const campaignIdFromResponse = (await json(res)).data.campaignId;
    const campaign = store.tables
      .get('campaigns')
      ?.find((row) => row.id === campaignIdFromResponse);
    const paymentOrder = store.tables
      .get('payment_orders')
      ?.find((row) => row.campaign_id === campaignIdFromResponse);
    expect(paymentOrder?.status).toBe('authorized');
    expect(campaign?.ai_title).toBe('Aura Weekend Reel');
    expect(campaign?.card_image_url).toContain(`campaigns/${campaignIdFromResponse}/card.png`);
  });

  it('does not regenerate creative for campaigns that already have a card image', async () => {
    const store = new MemoryDataStore({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Existing',
          status: 'pre_authorized',
          creative_status: 'ready',
          card_image_url: 'https://cdn.test/existing.png',
        },
      ],
      business_profiles: [],
      influencer_profiles: [],
    });
    const storage = new FakeStorageProvider();
    const services = createServices(
      store,
      {
        storage,
        ai: new FakeAiProvider(),
      },
      { port: 4000, demoEnabled: false, cronHttpEnabled: true, corsOrigin: '*' },
    );

    const campaign = await services.campaigns.generateCreative(campaignId);

    expect(campaign.card_image_url).toBe('https://cdn.test/existing.png');
    expect(storage.campaignImages).toHaveLength(0);
  });

  it('derives combo package pricing on create booking order', async () => {
    const { app } = makeApp();
    const res = await app.request('/payment/create-booking-order', {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({
        influencer_profile_id: influencerProfileId,
        package_type: 'instagram_reel',
      }),
    });
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body.data.keyId).toBe('rzp_test_public');
    expect(body.data.price_offered_paise).toBe(3000);
    expect(body.data.platform_fee_paise).toBe(360);
    expect(body.data.total_charged_paise).toBe(3360);
  });

  it('rejects booking order creation before taking payment when the business profile is incomplete', async () => {
    const { app } = makeApp({
      business_profiles: [
        {
          id: 'bp-1',
          user_id: businessId,
          brand_name: '',
          brand_category: 'restaurant_cafe',
        },
      ],
    });
    const res = await app.request('/payment/create-booking-order', {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({
        influencer_profile_id: influencerProfileId,
        package_type: 'instagram_reel',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('blocks chat send when campaign is outside active states', async () => {
    const { app } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'pre_authorized',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
    });
    const res = await app.request(`/campaigns/${campaignId}/messages`, {
      method: 'POST',
      headers: { authorization: 'Bearer business', 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Please start', message_type: 'text' }),
    });
    expect(res.status).toBe(409);
  });

  it('returns a newest-first message page with read_by populated', async () => {
    const { app, store } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'in_escrow',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
      campaign_messages: [
        {
          id: 'm1',
          campaign_id: campaignId,
          sender_id: businessId,
          message_type: 'text',
          content: 'first',
          created_at: '2026-05-16T01:00:00.000Z',
        },
        {
          id: 'm2',
          campaign_id: campaignId,
          sender_id: influencerId,
          message_type: 'text',
          content: 'second',
          created_at: '2026-05-16T02:00:00.000Z',
        },
      ],
      campaign_message_reads: [
        { message_id: 'm1', user_id: influencerId, read_at: '2026-05-16T03:00:00.000Z' },
      ],
    });
    void store;
    const res = await app.request(`/campaigns/${campaignId}/messages`, {
      headers: { authorization: 'Bearer business' },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.messages.map((m: { id: string }) => m.id)).toEqual(['m2', 'm1']);
    expect(body.data.nextCursor).toBeNull();
    const m1 = body.data.messages.find((m: { id: string }) => m.id === 'm1');
    expect(m1.read_by).toContain(influencerId);
  });

  it('paginates messages with limit and before cursor', async () => {
    const { app } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'in_escrow',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
      campaign_messages: Array.from({ length: 5 }).map((_, i) => ({
        id: `msg-${i}`,
        campaign_id: campaignId,
        sender_id: businessId,
        message_type: 'text',
        content: `m${i}`,
        created_at: `2026-05-16T0${i}:00:00.000Z`,
      })),
    });
    const first = await json(
      await app.request(`/campaigns/${campaignId}/messages?limit=2`, {
        headers: { authorization: 'Bearer business' },
      }),
    );
    expect(first.data.messages.map((m: { id: string }) => m.id)).toEqual(['msg-4', 'msg-3']);
    expect(first.data.nextCursor).toBe('2026-05-16T03:00:00.000Z');
    const second = await json(
      await app.request(
        `/campaigns/${campaignId}/messages?limit=2&before=${encodeURIComponent(first.data.nextCursor)}`,
        { headers: { authorization: 'Bearer business' } },
      ),
    );
    expect(second.data.messages.map((m: { id: string }) => m.id)).toEqual(['msg-2', 'msg-1']);
  });

  it('marks only unread counterparty messages and is a no-op when already read', async () => {
    const { app, store } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'in_escrow',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
      campaign_messages: [
        {
          id: 'own',
          campaign_id: campaignId,
          sender_id: influencerId,
          message_type: 'text',
          content: 'mine',
          created_at: '2026-05-16T01:00:00.000Z',
        },
        {
          id: 'theirs',
          campaign_id: campaignId,
          sender_id: businessId,
          message_type: 'text',
          content: 'hi',
          created_at: '2026-05-16T02:00:00.000Z',
        },
      ],
      campaign_message_reads: [],
    });
    const first = await json(
      await app.request(`/campaigns/${campaignId}/messages/read`, {
        method: 'PATCH',
        headers: { authorization: 'Bearer influencer' },
      }),
    );
    // Only the counterparty message ('theirs') gets a read row — never the user's own.
    expect(first.data.marked).toBe(1);
    expect(store.tables.get('campaign_message_reads')).toHaveLength(1);
    const second = await json(
      await app.request(`/campaigns/${campaignId}/messages/read`, {
        method: 'PATCH',
        headers: { authorization: 'Bearer influencer' },
      }),
    );
    expect(second.data.marked).toBe(0);
    expect(store.tables.get('campaign_message_reads')).toHaveLength(1);
  });

  it('submits and approves delivery', async () => {
    const { app, store } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'in_escrow',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
      payment_orders: [
        {
          id: 'payment-order-delivery',
          campaign_id: campaignId,
          provider: 'razorpay',
          provider_order_id: 'order_delivery',
          provider_payment_id: 'pay_delivery',
          payment_method: 'card',
          status: 'captured',
          amount_paise: 11200,
          currency: 'INR',
        },
      ],
    });
    const submit = await app.request(`/campaigns/${campaignId}/deliver`, {
      method: 'POST',
      headers: { authorization: 'Bearer influencer', 'content-type': 'application/json' },
      body: JSON.stringify({ storage_path: 'path/file.mp4', creator_note: 'done' }),
    });
    expect(submit.status).toBe(200);
    const approve = await app.request(`/campaigns/${campaignId}/approve`, {
      method: 'POST',
      headers: { authorization: 'Bearer business' },
    });
    expect(approve.status).toBe(200);
    expect(store.tables.get('campaigns')?.[0].status).toBe('completed');
  });

  it('rejects duplicate delivery submissions', async () => {
    const { app } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'delivery_submitted',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
      deliveries: [
        {
          id: 'delivery-1',
          campaign_id: campaignId,
          submitted_by: influencerId,
          storage_path: 'path/file.mp4',
          submitted_at: '2026-05-16T01:00:00.000Z',
        },
      ],
    });
    const res = await app.request(`/campaigns/${campaignId}/deliver`, {
      method: 'POST',
      headers: { authorization: 'Bearer influencer', 'content-type': 'application/json' },
      body: JSON.stringify({ storage_path: 'path/file-2.mp4' }),
    });
    expect(res.status).toBe(409);
  });

  it('release escrow is idempotent after completion', async () => {
    const { app, store } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'completed',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
      escrow_ledger_entries: [
        {
          id: 'tx-1',
          campaign_id: campaignId,
          entry_type: 'payout_influencer',
          amount_paise: 1000000,
          status: 'pending',
        },
        {
          id: 'tx-2',
          campaign_id: campaignId,
          entry_type: 'platform_fee',
          amount_paise: 120000,
          status: 'succeeded',
        },
      ],
      payment_orders: [
        {
          id: 'payment-order-release',
          campaign_id: campaignId,
          provider: 'razorpay',
          provider_order_id: 'order_release',
          provider_payment_id: 'pay_release',
          payment_method: 'card',
          status: 'captured',
          amount_paise: 11200,
          currency: 'INR',
        },
      ],
    });
    const res = await app.request('/payment/release-escrow', {
      method: 'POST',
      headers: {
        authorization: 'Bearer business',
        'content-type': 'application/json',
        'idempotency-key': 'release-1',
      },
      body: JSON.stringify({ campaign_id: campaignId }),
    });
    expect(res.status).toBe(200);
    expect(store.tables.get('escrow_ledger_entries')).toHaveLength(2);
  });

  it('validates Razorpay webhook signatures', async () => {
    const { app, store } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          status: 'capture_pending',
        },
      ],
      payment_orders: [
        {
          id: 'payment-order-failed',
          campaign_id: campaignId,
          provider: 'razorpay',
          provider_order_id: 'order_failed',
          status: 'authorized',
          amount_paise: 11200,
          currency: 'INR',
        },
      ],
    });
    const body = JSON.stringify({
      event: 'payment.failed',
      payload: { payment: { entity: { order_id: 'order_failed' } } },
    });
    const invalid = await app.request('/payment/webhook', {
      method: 'POST',
      headers: { 'x-razorpay-signature': 'bad' },
      body,
    });
    expect(invalid.status).toBe(403);
    const valid = await app.request('/payment/webhook', {
      method: 'POST',
      headers: { 'x-razorpay-signature': webhookSignature(body) },
      body,
    });
    expect(valid.status).toBe(200);
    expect(store.tables.get('payment_orders')?.[0].status).toBe('failed');
  });

  it('rejects instagram connect when query user does not match auth user', async () => {
    const { app } = makeApp();
    const res = await app.request(`/instagram/connect?userId=${businessId}&role=influencer`, {
      headers: { authorization: 'Bearer influencer' },
    });
    expect(res.status).toBe(403);
  });

  it('rejects instagram connect when query role does not match auth role', async () => {
    const { app } = makeApp();
    const res = await app.request(`/instagram/connect?userId=${influencerId}&role=business`, {
      headers: { authorization: 'Bearer influencer' },
    });
    expect(res.status).toBe(403);
  });

  it('allows instagram connect for the authenticated user and role', async () => {
    const { app } = makeApp();
    const res = await app.request(`/instagram/connect?userId=${influencerId}&role=influencer`, {
      headers: { authorization: 'Bearer influencer' },
    });
    expect(res.status).toBe(200);
    expect((await json(res)).data.url).toContain('instagram.test/oauth');
  });

  it('voids declined UPI pre-authorized campaigns without issuing a refund', async () => {
    const { app, store, payment } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'pre_authorized',
          payment_method: 'upi',
          razorpay_payment_id: 'pay_upi',
          razorpay_order_id: 'order_upi',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
      payment_orders: [
        {
          id: 'payment-order-upi',
          campaign_id: campaignId,
          provider: 'razorpay',
          provider_order_id: 'order_upi',
          provider_payment_id: 'pay_upi',
          payment_method: 'upi',
          status: 'authorized',
          amount_paise: 11200,
          currency: 'INR',
        },
      ],
    });
    const declined = await app.request(`/campaigns/${campaignId}/decline`, {
      method: 'POST',
      headers: { authorization: 'Bearer influencer' },
    });
    expect(declined.status).toBe(200);
    expect(payment.refunds).toHaveLength(0);
    expect(store.tables.get('payment_orders')?.[0].status).toBe('voided');
    expect(store.tables.get('escrow_ledger_entries') ?? []).toHaveLength(0);
  });

  it('does not refund card pre-authorized campaigns on decline because Razorpay auto-voids them', async () => {
    const { app, payment } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'pre_authorized',
          payment_method: 'card',
          razorpay_payment_id: 'pay_card',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
    });
    const declined = await app.request(`/campaigns/${campaignId}/decline`, {
      method: 'POST',
      headers: { authorization: 'Bearer influencer' },
    });
    expect(declined.status).toBe(200);
    expect(payment.refunds).toHaveLength(0);
  });

  it('voids expired UPI pre-authorized campaigns from the cron flow', async () => {
    const { app, store, payment } = makeApp({
      campaigns: [
        {
          id: campaignId,
          business_id: businessId,
          influencer_id: influencerId,
          title: 'Booking',
          status: 'pre_authorized',
          payment_method: 'upi',
          razorpay_payment_id: 'pay_upi',
          razorpay_order_id: 'order_upi',
          expires_at: '2020-01-01T00:00:00.000Z',
          price_offered_paise: 10000,
          platform_fee_paise: 1200,
          total_charged_paise: 11200,
        },
      ],
      payment_orders: [
        {
          id: 'payment-order-expired-upi',
          campaign_id: campaignId,
          provider: 'razorpay',
          provider_order_id: 'order_upi',
          provider_payment_id: 'pay_upi',
          payment_method: 'upi',
          status: 'authorized',
          amount_paise: 11200,
          currency: 'INR',
        },
      ],
    });
    const res = await app.request('/cron/auto-release', { headers: { 'x-cron-secret': 'cron' } });
    expect(res.status).toBe(200);
    expect(payment.refunds).toHaveLength(0);
    expect(store.tables.get('campaigns')?.[0].status).toBe('expired');
    expect(store.tables.get('payment_orders')?.[0].status).toBe('voided');
  });

  it('guards internal AI and cron endpoints', async () => {
    const { app } = makeApp();
    expect(
      (
        await app.request('/ai/generate-profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId: influencerId }),
        })
      ).status,
    ).toBe(403);
    expect(
      (await app.request('/cron/auto-release', { headers: { 'x-cron-secret': 'cron' } })).status,
    ).toBe(200);
  });

  it('applies generated AI fields to empty influencer profiles', async () => {
    const { app, store } = makeApp({
      influencer_profiles: [
        {
          id: influencerProfileId,
          user_id: influencerId,
          display_name: 'Creator One',
          city: 'Hyderabad',
          ig_biography: 'Food reels and restaurant reviews',
          price_per_reel_paise: null,
          category: null,
          languages: null,
          bio: null,
          ig_followers_count: 25000,
          is_active: true,
        },
      ],
      instagram_media: [
        {
          id: 'media-1',
          user_id: influencerId,
          caption: 'Best cafe reel in Hyderabad',
          engagement: 500,
        },
      ],
    });
    const res = await app.request('/ai/generate-profile', {
      method: 'POST',
      headers: { 'x-internal-secret': 'internal', 'content-type': 'application/json' },
      body: JSON.stringify({ userId: influencerId }),
    });
    expect(res.status).toBe(200);
    const profile = store.tables.get('influencer_profiles')?.[0];
    expect(profile?.category).toBeTruthy();
    expect(profile?.bio).toBeTruthy();
    expect(profile?.price_per_reel_paise).toBeTruthy();
  });

  it('applies generated AI fields to empty business profiles', async () => {
    const { app, store } = makeApp({
      business_profiles: [
        {
          id: 'bp-1',
          user_id: businessId,
          brand_name: 'Plugoh Cafe',
          brand_category: 'restaurant_cafe',
          ig_biography: 'Modern coffee and brunch spot in Hyderabad',
          brand_summary: null,
          tagline: null,
        },
      ],
    });
    const res = await app.request('/ai/generate-business-profile', {
      method: 'POST',
      headers: { 'x-internal-secret': 'internal', 'content-type': 'application/json' },
      body: JSON.stringify({ userId: businessId }),
    });
    expect(res.status).toBe(200);
    const profile = store.tables.get('business_profiles')?.[0];
    expect(profile?.brand_summary).toBeTruthy();
    expect(profile?.tagline).toBeTruthy();
  });
});
