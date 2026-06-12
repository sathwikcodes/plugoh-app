import type {
  CampaignStatus,
  NotificationType,
  OnboardingStage,
  UserRole,
} from '@plugoh/contracts';
import type {
  AiProvider,
  EmailProvider,
  GeocodingProvider,
  InstagramProvider,
  PaymentProvider,
  PushProvider,
  StorageProvider,
  WeatherProvider,
} from '../clients/providers.js';
import { verifyHmacSha256 } from '../clients/providers.js';
import type { EnvConfig } from '../config/env.js';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  tooManyRequests,
  unauthorized,
} from '../core/errors.js';
import { logger } from '../core/logger.js';
import type { DataStore } from '../repositories/data-store.js';
import type { AuthUser } from '../types.js';

type Row = Record<string, any>;

const PLATFORM_FEE_RATE = 0.12;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_MESSAGE_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const MESSAGE_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'text/plain',
]);

export type Services = {
  discovery: DiscoveryService;
  profiles: ProfileService;
  campaigns: CampaignService;
  payments: PaymentService;
  delivery: DeliveryService;
  messaging: MessagingService;
  notifications: NotificationService;
  instagram: InstagramService;
  ai: AiProfileService;
  earnings: EarningsService;
  cron: CronService;
};

export type ProviderBundle = {
  payment?: PaymentProvider;
  email?: EmailProvider;
  geocoding?: GeocodingProvider;
  weather?: WeatherProvider;
  instagram?: InstagramProvider;
  storage?: StorageProvider;
  ai?: AiProvider;
  push?: PushProvider;
};

export function createServices(
  store: DataStore,
  providers: ProviderBundle,
  config: EnvConfig,
): Services {
  const notifications = new NotificationService(store, providers.push);
  const campaignCore = new CampaignService(
    store,
    notifications,
    providers.payment,
    providers.storage,
    providers.ai,
    providers.geocoding,
    providers.weather,
  );
  const payments = new PaymentService(
    store,
    notifications,
    campaignCore,
    config,
    providers.payment,
  );
  return {
    discovery: new DiscoveryService(store),
    profiles: new ProfileService(store, providers.geocoding),
    campaigns: campaignCore,
    payments,
    delivery: new DeliveryService(store, notifications, providers.storage),
    messaging: new MessagingService(store, providers.email, providers.storage),
    notifications,
    instagram: new InstagramService(store, providers.instagram),
    ai: new AiProfileService(store, providers.ai),
    earnings: new EarningsService(store),
    cron: new CronService(store, notifications, payments, providers.payment),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

function campaignTimingBrief(input: Row) {
  if (input.timing_mode === 'choose_date') {
    return input.due_date ? `Due date: ${input.due_date}` : undefined;
  }
  return 'Timing: ASAP';
}

function blankCoordinates(prefix: 'brand' | 'place') {
  return {
    [`${prefix}_latitude`]: null,
    [`${prefix}_longitude`]: null,
  };
}

async function geocodeValues(
  provider: GeocodingProvider | undefined,
  address: unknown,
  prefix: 'brand' | 'place',
) {
  const value = typeof address === 'string' ? address.trim() : '';
  if (!provider || !value) return blankCoordinates(prefix);
  try {
    const result = await provider.geocode(value);
    if (!result) return blankCoordinates(prefix);
    return {
      [`${prefix}_latitude`]: result.latitude,
      [`${prefix}_longitude`]: result.longitude,
    };
  } catch (error) {
    logger.warn(
      {
        prefix,
        error: error instanceof Error ? error.message : String(error),
      },
      'Location geocoding failed',
    );
    return blankCoordinates(prefix);
  }
}

function moneyPaise(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function platformFeePaise(pricePaise: number) {
  return Math.round(pricePaise * PLATFORM_FEE_RATE);
}

function matchesSearch(profile: Row, term: string) {
  return ['display_name', 'instagram_username', 'bio', 'category', 'city'].some((key) =>
    String(profile[key] ?? '')
      .toLowerCase()
      .includes(term),
  );
}

function starterPrice(profile: Row) {
  return Number(profile.price_per_reel_paise ?? Number.POSITIVE_INFINITY);
}

function packagePricePaise(profile: Row, packageType: string) {
  if (packageType !== 'instagram_reel') {
    throw badRequest(
      'PACKAGE_UNAVAILABLE',
      `${packageType} pricing is not available for this creator`,
    );
  }
  const pricePaise = Number(profile.price_per_reel_paise ?? Number.NaN);
  if (!Number.isFinite(pricePaise) || pricePaise <= 0) {
    throw badRequest(
      'PACKAGE_UNAVAILABLE',
      `${packageType} pricing is not available for this creator`,
    );
  }
  return Math.round(pricePaise);
}

function paginateRows<T>(rows: T[], query: Row) {
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);
  const offset = Math.max(Number(query.offset ?? 0), 0);
  const items = rows.slice(offset, offset + limit);
  const nextOffset = offset + limit < rows.length ? offset + limit : null;
  return { items, nextOffset, total: rows.length };
}

function hasInfluencerBasics(profile?: Row | null) {
  return Boolean(
    String(profile?.full_name ?? '').trim() &&
    String(profile?.phone ?? '').trim() &&
    String(profile?.location ?? '').trim(),
  );
}

function hasBusinessProfileDetails(profile?: Row | null) {
  return Boolean(
    String(profile?.brand_name ?? '').trim() && String(profile?.brand_category ?? '').trim(),
  );
}

function hasInstagramConnection(profile?: Row | null) {
  return Boolean(profile?.instagram_username || profile?.instagram_connected_at);
}

function withBusinessProfileImage(profile?: Row | null, account?: Row | null) {
  if (!profile) return null;
  const instagramPhoto =
    typeof profile.instagram_profile_picture_url === 'string'
      ? profile.instagram_profile_picture_url.trim()
      : '';
  const accountAvatar = typeof account?.avatar_url === 'string' ? account.avatar_url.trim() : '';
  const profilePhoto = instagramPhoto || accountAvatar || undefined;

  return {
    ...profile,
    email: typeof account?.email === 'string' ? account.email : undefined,
    profile_photo_url: profilePhoto,
    avatar_url: accountAvatar || undefined,
    instagram_connected: hasInstagramConnection(profile),
  };
}

function withInfluencerProfileImage(profile?: Row | null, account?: Row | null) {
  if (!profile) return null;
  const profilePhoto =
    (typeof profile.profile_photo_url === 'string' && profile.profile_photo_url.trim()) ||
    (typeof account?.avatar_url === 'string' && account.avatar_url.trim()) ||
    undefined;

  return {
    ...profile,
    profile_photo_url: profilePhoto,
    avatar_url: typeof account?.avatar_url === 'string' ? account.avatar_url : undefined,
    instagram_connected: hasInstagramConnection(profile),
  };
}

function creativeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 240);
}

function campaignCreativePath(campaignId: string, mimeType: 'image/png' | 'image/jpeg') {
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  return `campaigns/${campaignId}/card.${ext}`;
}

function hasGeneratedInfluencerFields(profile?: Row | null) {
  return Boolean(profile?.category && profile.price_per_reel_paise != null);
}

function assertUser(user?: AuthUser): AuthUser {
  if (!user) throw unauthorized();
  return user;
}

async function campaignForParticipant(store: DataStore, campaignId: string, userId: string) {
  const campaign = await store.getById<Row>('campaigns', campaignId);
  if (!campaign) throw notFound('Campaign');
  if (campaign.business_id !== userId && campaign.influencer_id !== userId)
    throw forbidden('Campaign participant required');
  return campaign;
}

async function requireCampaignRole(
  store: DataStore,
  campaignId: string,
  userId: string,
  role: 'business' | 'influencer',
) {
  const campaign = await store.getById<Row>('campaigns', campaignId);
  if (!campaign) throw notFound('Campaign');
  const key = role === 'business' ? 'business_id' : 'influencer_id';
  if (campaign[key] !== userId) throw forbidden(`${role} on campaign required`);
  return campaign;
}

function requireStatus(campaign: Row, statuses: CampaignStatus[]) {
  if (!statuses.includes(campaign.status)) {
    throw conflict('INVALID_CAMPAIGN_STATUS', `Campaign must be in status: ${statuses.join(', ')}`);
  }
}

export class NotificationService {
  constructor(
    private readonly store: DataStore,
    private readonly push?: PushProvider,
  ) {}

  async list(user: AuthUser) {
    return this.store.list<Row>('notifications', {
      eq: { user_id: user.id },
      order: { column: 'created_at', ascending: false },
    });
  }

  async markRead(user: AuthUser, input: { ids?: string[] | undefined; all?: boolean | undefined }) {
    const options = input.all
      ? { eq: { user_id: user.id } }
      : { eq: { user_id: user.id }, in: { id: input.ids ?? [] } };
    await this.store.update('notifications', options, { read: true });
    return { ok: true };
  }

  async create(userId: string, type: NotificationType, data: Row = {}) {
    await this.store.insert('notifications', {
      user_id: userId,
      type,
      data,
      read: false,
      created_at: nowIso(),
    });
    await this.sendPush(userId, type, data);
  }

  async createForMany(userIds: string[], type: NotificationType, data: Row = {}) {
    await Promise.all(userIds.map((userId) => this.create(userId, type, data)));
  }

  async registerPush(user: AuthUser, input: { expo_push_token: string; platform: string }) {
    return this.store.upsert(
      'user_push_tokens',
      {
        user_id: user.id,
        expo_push_token: input.expo_push_token,
        platform: input.platform,
        updated_at: nowIso(),
      },
      'user_id',
    );
  }

  async unregisterPush(user: AuthUser) {
    await this.store.update(
      'user_push_tokens',
      { eq: { user_id: user.id } },
      { expo_push_token: null, updated_at: nowIso() },
    );
    return { ok: true };
  }

  private async sendPush(userId: string, type: NotificationType, data: Row) {
    if (!this.push) return;
    const tokens = await this.store.list<Row>('user_push_tokens', {
      eq: { user_id: userId },
    });
    const activeTokens = tokens
      .map((row) => row.expo_push_token)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    if (activeTokens.length === 0) return;
    try {
      const result = await this.push.send(
        activeTokens.map((to) => ({
          to,
          title: notificationTitle(type),
          body: notificationBody(type, data),
          data: { type, ...data },
        })),
      );
      if (result.failed > 0) {
        logger.warn(
          { userId, type, failed: result.failed, errors: result.errors },
          'Push notifications had delivery failures',
        );
      } else {
        logger.info({ userId, type, sent: result.sent }, 'Push notifications delivered');
      }
    } catch (error) {
      logger.error({ err: error, userId, type }, 'Push provider send failed');
    }
  }
}

function notificationTitle(type: NotificationType) {
  switch (type) {
    case 'new_booking':
      return 'New campaign request';
    case 'booking_accepted':
      return 'Campaign accepted';
    case 'payment_secured':
      return 'Payment secured';
    case 'delivery_submitted':
      return 'Delivery submitted';
    case 'booking_completed':
      return 'Campaign completed';
    case 'booking_declined':
      return 'Campaign declined';
    case 'booking_expired':
      return 'Campaign expired';
    case 'changes_requested':
      return 'Changes requested';
    default:
      return 'Plugoh update';
  }
}

function notificationBody(type: NotificationType, data: Row) {
  const title = String(data.campaignTitle ?? 'campaign');
  switch (type) {
    case 'new_booking':
      return `${title} needs your response.`;
    case 'payment_secured':
      return `${title} is funded and ready to execute.`;
    case 'delivery_submitted':
      return `${title} is waiting for approval.`;
    case 'booking_completed':
      return `${title} has been completed.`;
    case 'changes_requested':
      return `${title} needs revisions.`;
    default:
      return `${title} has a new update.`;
  }
}

export class DiscoveryService {
  constructor(private readonly store: DataStore) {}

  async list(query: Row) {
    const baseOptions = {
      eq: {
        is_active: true,
        ...(query.place && query.place !== 'All' ? { city: query.place } : {}),
        ...(query.category && query.category !== 'All' ? { category: query.category } : {}),
      },
    };
    const searchOptions = query.search
      ? {
          ...baseOptions,
          or: ['display_name', 'instagram_username', 'bio', 'category', 'city']
            .map(
              (field) =>
                `${field}.ilike.%${String(query.search).replaceAll('%', '\\%').replaceAll('_', '\\_')}%`,
            )
            .join(','),
        }
      : baseOptions;
    let profiles = await this.store.list<Row>('influencer_profiles', searchOptions);
    if (query.search && profiles.length === 0) {
      const term = String(query.search).toLowerCase();
      profiles = (await this.store.list<Row>('influencer_profiles', baseOptions)).filter(
        (profile) => matchesSearch(profile, term),
      );
    }
    if (query.price_min !== undefined)
      profiles = profiles.filter((profile) => starterPrice(profile) >= Number(query.price_min));
    if (query.price_max !== undefined)
      profiles = profiles.filter((profile) => starterPrice(profile) <= Number(query.price_max));
    profiles = profiles.map((profile) => ({
      ...profile,
      starter_price_paise: Number.isFinite(starterPrice(profile)) ? starterPrice(profile) : null,
      starterPrice: Number.isFinite(starterPrice(profile)) ? starterPrice(profile) / 100 : null,
      price_per_reel: Number.isFinite(starterPrice(profile)) ? starterPrice(profile) / 100 : null,
    }));
    switch (query.sort) {
      case 'followers_desc':
        profiles.sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0));
        break;
      case 'engagement_asc':
        profiles.sort((a, b) => (a.avg_likes_per_reel ?? 0) - (b.avg_likes_per_reel ?? 0));
        break;
      case 'engagement_desc':
        profiles.sort((a, b) => (b.avg_likes_per_reel ?? 0) - (a.avg_likes_per_reel ?? 0));
        break;
      case 'price_asc':
        profiles.sort(
          (a, b) => (a.starter_price_paise ?? Infinity) - (b.starter_price_paise ?? Infinity),
        );
        break;
      case 'price_desc':
        profiles.sort((a, b) => (b.starter_price_paise ?? 0) - (a.starter_price_paise ?? 0));
        break;
    }
    return paginateRows(profiles, query);
  }

  async get(id: string) {
    const profile = await this.store.getById<Row>('influencer_profiles', id);
    if (!profile || profile.is_active !== true) throw notFound('Influencer');
    const media = await this.store.list<Row>('instagram_media', {
      eq: { user_id: profile.user_id },
      order: { column: 'engagement', ascending: false },
      limit: 3,
    });
    return { ...profile, media };
  }
}

export class ProfileService {
  constructor(
    private readonly store: DataStore,
    private readonly geocoding?: GeocodingProvider,
  ) {}

  async bootstrap(user: AuthUser, role: UserRole | null) {
    const [accountProfile, influencerProfile, businessProfile, notifications] = await Promise.all([
      this.store.findOne<Row>('profiles', { eq: { id: user.id } }),
      this.store.findOne<Row>('influencer_profiles', { eq: { user_id: user.id } }),
      this.store.findOne<Row>('business_profiles', { eq: { user_id: user.id } }),
      this.store.list<Row>('notifications', { eq: { user_id: user.id } }),
    ]);

    let inboxUnread = 0;
    if (role) {
      // Reuse the aggregate inbox summary instead of re-scanning every message.
      const summary = (await this.store.rpc('inbox_summary', {
        p_user_id: user.id,
        p_role: role,
      })) as unknown as Array<{ unread_count: number | string }>;
      inboxUnread = summary.reduce((total, entry) => total + Number(entry.unread_count), 0);
    }

    let onboardingStage: OnboardingStage = 'ready';
    if (!role) {
      onboardingStage = 'needs_role';
    } else if (!hasInfluencerBasics(accountProfile)) {
      onboardingStage = 'needs_basics';
    } else if (role === 'influencer') {
      if (!hasInstagramConnection(influencerProfile)) {
        onboardingStage = 'needs_instagram';
      } else if (!hasGeneratedInfluencerFields(influencerProfile)) {
        onboardingStage = 'ai_pending';
      }
    } else {
      if (!businessProfile) {
        onboardingStage = 'needs_brand_choice';
      } else if (!hasBusinessProfileDetails(businessProfile)) {
        onboardingStage = 'needs_brand_details';
      } else if (
        hasInstagramConnection(businessProfile) &&
        (!businessProfile.brand_summary || !businessProfile.tagline)
      ) {
        onboardingStage = 'ai_pending';
      }
    }

    return {
      user: { id: user.id, email: user.email },
      role,
      onboardingStage,
      unreadCounts: {
        notifications: notifications.filter((item) => item.read !== true).length,
        inbox: inboxUnread,
      },
    };
  }

  async upsertRole(user: AuthUser, role: UserRole) {
    const existing = await this.store.findOne<Row>('user_roles', { eq: { user_id: user.id } });
    if (existing) {
      const [updated] = await this.store.update<Row>(
        'user_roles',
        { eq: { user_id: user.id } },
        { role, updated_at: nowIso() },
      );
      return updated;
    }
    return this.store.insert<Row>('user_roles', {
      user_id: user.id,
      role,
      updated_at: nowIso(),
    });
  }

  async upsertCommonProfile(
    user: AuthUser,
    input: { full_name: string; phone: string; location: string },
  ) {
    const values = {
      id: user.id,
      email: user.email,
      full_name: input.full_name,
      phone: input.phone,
      location: input.location,
      updated_at: nowIso(),
    };
    const existing = await this.store.findOne<Row>('profiles', { eq: { id: user.id } });
    if (existing) {
      const [updated] = await this.store.update<Row>('profiles', { eq: { id: user.id } }, values);
      return updated;
    }
    return this.store.insert<Row>('profiles', values);
  }

  async getInfluencer(user: AuthUser) {
    const [profile, account] = await Promise.all([
      this.store.findOne<Row>('influencer_profiles', {
        eq: { user_id: user.id },
      }),
      this.store.findOne<Row>('profiles', { eq: { id: user.id } }),
    ]);
    if (!profile) throw notFound('Influencer profile');
    return withInfluencerProfileImage(profile, account);
  }

  async upsertInfluencerOnboarding(
    user: AuthUser,
    input: { full_name: string; phone: string; location: string },
  ) {
    await this.upsertRole(user, 'influencer');
    await this.upsertCommonProfile(user, input);
    const values = {
      user_id: user.id,
      city: input.location,
      is_active: false,
      updated_at: nowIso(),
    };
    const existing = await this.store.findOne<Row>('influencer_profiles', {
      eq: { user_id: user.id },
    });
    if (existing) {
      const [updated] = await this.store.update<Row>(
        'influencer_profiles',
        { eq: { user_id: user.id } },
        values,
      );
      return updated;
    }
    return this.store.insert<Row>('influencer_profiles', values);
  }

  async upsertBusinessOnboarding(user: AuthUser, input: Row) {
    await this.upsertRole(user, 'business');
    await this.upsertCommonProfile(
      user,
      input as { full_name: string; phone: string; location: string },
    );
    const brandLocation = input.brand_location ?? input.location;
    const values = {
      user_id: user.id,
      brand_name: input.brand_name,
      brand_category: input.brand_category,
      brand_location: brandLocation,
      ...(await geocodeValues(this.geocoding, brandLocation, 'brand')),
      brand_summary: input.brand_summary,
      tagline: input.tagline,
      updated_at: nowIso(),
    };
    const existing = await this.store.findOne<Row>('business_profiles', {
      eq: { user_id: user.id },
    });
    if (existing) {
      const [updated] = await this.store.update<Row>(
        'business_profiles',
        { eq: { user_id: user.id } },
        values,
      );
      return updated;
    }
    return this.store.insert<Row>('business_profiles', values);
  }

  async updateInfluencer(user: AuthUser, input: Row) {
    const [profile] = await this.store.update<Row>(
      'influencer_profiles',
      { eq: { user_id: user.id } },
      input,
    );
    if (!profile) throw notFound('Influencer profile');
    return profile;
  }

  async getPayout(user: AuthUser) {
    return this.store.findOne<Row>('influencer_payout_accounts', { eq: { user_id: user.id } });
  }

  async upsertPayout(user: AuthUser, input: Row) {
    return this.store.upsert<Row>(
      'influencer_payout_accounts',
      { ...input, user_id: user.id, updated_at: nowIso() },
      'user_id',
    );
  }

  async getBusiness(user: AuthUser) {
    const [profile, account] = await Promise.all([
      this.store.findOne<Row>('business_profiles', {
        eq: { user_id: user.id },
      }),
      this.store.findOne<Row>('profiles', { eq: { id: user.id } }),
    ]);
    if (!profile) throw notFound('Business profile');
    return withBusinessProfileImage(profile, account);
  }

  async updateBusiness(user: AuthUser, input: Row) {
    const coordinateValues =
      Object.prototype.hasOwnProperty.call(input, 'brand_location') ||
      Object.prototype.hasOwnProperty.call(input, 'location')
        ? await geocodeValues(this.geocoding, input.brand_location ?? input.location, 'brand')
        : {};
    const [profile] = await this.store.update<Row>(
      'business_profiles',
      { eq: { user_id: user.id } },
      { ...input, ...coordinateValues, updated_at: nowIso() },
    );
    if (!profile) throw notFound('Business profile');
    return profile;
  }

  async assertBusinessComplete(userId: string) {
    const profile = await this.store.findOne<Row>('business_profiles', { eq: { user_id: userId } });
    if (!profile) throw forbidden('Business profile required before booking');
    const hasName = String(profile.brand_name ?? '').trim().length > 0;
    const hasIdentity = Boolean(profile.instagram_username || profile.brand_category);
    if (!hasName || !hasIdentity) throw forbidden('Business profile is incomplete');
    return profile;
  }
}

export class CampaignService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly payment?: PaymentProvider,
    private readonly storage?: StorageProvider,
    private readonly ai?: AiProvider,
    private readonly geocoding?: GeocodingProvider,
    private readonly weather?: WeatherProvider,
  ) {}

  async create(
    user: AuthUser,
    input: Row,
    paymentInput: Partial<Row> = {},
    options: { skipCreative?: boolean } = {},
  ) {
    const profileService = new ProfileService(this.store, this.geocoding);
    await profileService.assertBusinessComplete(user.id);
    const influencer = await this.store.findOne<Row>('influencer_profiles', {
      eq: { id: input.influencer_profile_id, is_active: true },
    });
    if (!influencer) throw notFound('Influencer profile');
    const pricePaise = packagePricePaise(influencer, input.package_type);
    if (input.influencer_id && input.influencer_id !== influencer.user_id)
      throw badRequest('INFLUENCER_MISMATCH', 'Influencer does not match profile');
    const feePaise = platformFeePaise(pricePaise);
    const title = `${input.objective.replaceAll('_', ' ')} with ${
      influencer.display_name ?? influencer.instagram_username ?? 'influencer'
    }`;
    const businessProfile = await this.store.findOne<Row>('business_profiles', {
      eq: { user_id: user.id },
    });
    const campaignLocation = input.place_name || businessProfile?.brand_location;
    const brief = [
      `Objective: ${input.objective}`,
      `Package: ${input.package_type}`,
      campaignTimingBrief(input),
      input.place_name ? `Place: ${input.place_name}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
    const campaign = await this.store.insert<Row>('campaigns', {
      business_id: user.id,
      influencer_id: influencer.user_id,
      influencer_profile_id: input.influencer_profile_id,
      title,
      brief,
      package_type: input.package_type,
      objective: input.objective,
      timing_mode: input.timing_mode,
      due_date: input.due_date,
      place_name: input.place_name,
      ...(await geocodeValues(this.geocoding, campaignLocation, 'place')),
      price_offered_paise: pricePaise,
      platform_fee_paise: feePaise,
      status: paymentInput.status ?? 'pre_authorized',
      business_contact_email: input.business_contact_email,
      business_contact_phone: input.business_contact_phone,
      pre_authorized_at: nowIso(),
      expires_at: paymentInput.expires_at ?? futureIso(24 * HOUR_MS),
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    if (paymentInput.provider_order_id) {
      await this.store.insert('payment_orders', {
        campaign_id: campaign.id,
        provider: 'razorpay',
        provider_order_id: paymentInput.provider_order_id,
        provider_payment_id: paymentInput.provider_payment_id,
        payment_method: paymentInput.payment_method ?? 'card',
        status: paymentInput.payment_order_status ?? 'authorized',
        amount_paise: campaign.total_charged_paise ?? pricePaise + feePaise,
        currency: 'INR',
        authorized_at: paymentInput.authorized_at ?? nowIso(),
        metadata: {},
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    }
    await this.notifications.create(
      influencer.user_id,
      'new_booking',
      this.notificationData(campaign, influencer),
    );
    const message = await this.store.insert<Row>('campaign_messages', {
      campaign_id: campaign.id,
      sender_id: user.id,
      message_type: 'booking_card',
      content: title,
      metadata: { campaignId: campaign.id },
      created_at: nowIso(),
    });
    await this.store.upsert(
      'campaign_message_reads',
      { message_id: message.id, user_id: user.id, read_at: nowIso() },
      'message_id,user_id',
    );
    if (!options.skipCreative) {
      await this.generateCreative(campaign.id);
    }
    return { campaignId: campaign.id };
  }

  async list(user: AuthUser, role: UserRole, query: Row = {}) {
    const key = role === 'business' ? 'business_id' : 'influencer_id';
    let campaigns = await this.store.list<Row>('campaigns', {
      eq: { [key]: user.id },
      order: { column: 'created_at', ascending: false },
    });
    if (query.status) campaigns = campaigns.filter((campaign) => campaign.status === query.status);
    if (query.search) {
      const term = String(query.search).toLowerCase();
      campaigns = campaigns.filter((campaign) =>
        [campaign.ai_title, campaign.title, campaign.brief, campaign.package_type].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(term),
        ),
      );
    }
    switch (query.sort) {
      case 'created_asc':
        campaigns.sort((a, b) =>
          String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')),
        );
        break;
      case 'amount_desc':
        campaigns.sort(
          (a, b) =>
            Number(b.total_charged_paise ?? b.price_offered_paise ?? 0) -
            Number(a.total_charged_paise ?? a.price_offered_paise ?? 0),
        );
        break;
      case 'amount_asc':
        campaigns.sort(
          (a, b) =>
            Number(a.total_charged_paise ?? a.price_offered_paise ?? 0) -
            Number(b.total_charged_paise ?? b.price_offered_paise ?? 0),
        );
        break;
      default:
        campaigns.sort((a, b) =>
          String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
        );
        break;
    }
    return paginateRows(await this.withProfilesMany(campaigns), query);
  }

  async get(user: AuthUser, id: string) {
    const campaign = await campaignForParticipant(this.store, id, user.id);
    const delivery = await this.store.findOne<Row>('deliveries', { eq: { campaign_id: id } });
    const messages = await this.store.list<Row>('campaign_messages', {
      eq: { campaign_id: id },
      order: { column: 'created_at', ascending: true },
    });
    return { ...(await this.withProfiles(campaign)), delivery, messages };
  }

  async generateCreative(id: string) {
    const campaign = await this.store.getById<Row>('campaigns', id);
    if (!campaign) throw notFound('Campaign');
    if (campaign.card_image_url || campaign.creative_status === 'ready') {
      return campaign;
    }

    await this.store.update(
      'campaigns',
      { eq: { id } },
      { creative_status: 'pending', creative_error: null, updated_at: nowIso() },
    );

    if (!this.ai || !this.storage) {
      const error = 'Campaign creative requires configured AI and storage providers';
      await this.markCreativeFailed(id, error);
      return { ...campaign, creative_status: 'failed', creative_error: error };
    }

    try {
      const [business, influencer] = await Promise.all([
        this.store.findOne<Row>('business_profiles', { eq: { user_id: campaign.business_id } }),
        this.store.findOne<Row>('influencer_profiles', { eq: { user_id: campaign.influencer_id } }),
      ]);
      const creative = await this.ai.generateCampaignCreative({
        campaign,
        businessProfile: business,
        influencerProfile: influencer,
      });
      const upload = await this.storage.uploadCampaignCardImage({
        path: campaignCreativePath(id, creative.imageMimeType),
        bytes: creative.imageBytes,
        contentType: creative.imageMimeType,
      });
      const [updated] = await this.store.update<Row>(
        'campaigns',
        { eq: { id } },
        {
          ai_title: creative.title,
          card_image_url: upload.publicUrl,
          card_image_path: upload.path,
          card_image_prompt: creative.imagePrompt,
          creative_status: 'ready',
          creative_error: null,
          creative_generated_at: nowIso(),
          updated_at: nowIso(),
        },
      );
      return updated ?? (await this.store.getById<Row>('campaigns', id)) ?? campaign;
    } catch (error) {
      const message = creativeErrorMessage(error);
      logger.warn({ err: error, campaignId: id }, 'Campaign creative generation failed');
      await this.markCreativeFailed(id, message);
      return { ...campaign, creative_status: 'failed', creative_error: message };
    }
  }

  private async markCreativeFailed(id: string, message: string) {
    await this.store.update(
      'campaigns',
      { eq: { id } },
      {
        creative_status: 'failed',
        creative_error: message,
        updated_at: nowIso(),
      },
    );
  }

  async accept(user: AuthUser, id: string) {
    const accepted = await this.store.rpc<Row>('accept_campaign', {
      p_campaign_id: id,
      p_actor: user.id,
    });
    await this.notifications.create(
      accepted.business_id,
      'booking_accepted',
      this.notificationData(accepted),
    );

    const paymentOrder = await this.store.findOne<Row>('payment_orders', {
      eq: { campaign_id: id },
    });
    if (!paymentOrder?.provider_payment_id) {
      return { ok: true };
    }

    await this.payment?.capturePayment(
      String(paymentOrder.provider_payment_id),
      moneyPaise(paymentOrder.amount_paise),
    );
    const captured = await this.store.rpc<Row>('confirm_campaign_capture', {
      p_campaign_id: id,
      p_actor: user.id,
      p_provider_payment_id: paymentOrder.provider_payment_id,
      p_payment_method: paymentOrder.payment_method ?? 'card',
    });
    await this.notifications.create(
      captured.influencer_id,
      'payment_secured',
      this.notificationData(captured),
    );
    return { ok: true };
  }

  async decline(user: AuthUser, id: string) {
    const declined = await this.store.rpc<{ campaign: Row; should_refund: boolean }>(
      'decline_campaign',
      {
        p_campaign_id: id,
        p_actor: user.id,
      },
    );
    const campaign = declined.campaign;
    if (declined.should_refund) {
      await issueRefund(this.store, this.payment, campaign, 'declined');
    }
    await this.notifications.create(
      campaign.business_id,
      'booking_declined',
      this.notificationData(campaign),
    );
    return { ok: true };
  }

  async approve(user: AuthUser, id: string) {
    const campaign = await requireCampaignRole(this.store, id, user.id, 'business');
    requireStatus(campaign, ['delivery_submitted', 'completed']);
    await this.release(campaign, user.id);
    return { ok: true };
  }

  async dispute(user: AuthUser, id: string, reason: string) {
    const campaign = await requireCampaignRole(this.store, id, user.id, 'business');
    requireStatus(campaign, ['delivery_submitted']);
    const transitioned = await this.store.rpc<Row>('request_delivery_changes', {
      p_campaign_id: id,
      p_actor: user.id,
      p_change_request_note: reason,
    });
    await this.notifications.createForMany(
      [campaign.business_id, campaign.influencer_id],
      'changes_requested',
      this.notificationData(transitioned),
    );
    return { ok: true };
  }

  async release(campaign: Row, approvedBy?: string, notify = true) {
    const transitioned = await this.store.rpc<Row>('release_escrow', {
      p_campaign_id: campaign.id,
      p_actor: approvedBy ?? null,
    });
    const existingLedger = await this.store.list<Row>('escrow_ledger_entries', {
      eq: { campaign_id: transitioned.id },
      in: { entry_type: ['payout_influencer', 'platform_fee'] },
    });
    const alreadyReleased =
      existingLedger.some((row) => row.entry_type === 'payout_influencer') &&
      existingLedger.some((row) => row.entry_type === 'platform_fee');
    if (notify && campaign.status !== 'completed') {
      await this.notifications.create(
        transitioned.influencer_id,
        'booking_completed',
        this.notificationData(transitioned),
      );
    }
    return { alreadyReleased };
  }

  async withProfiles(campaign: Row) {
    const [business, businessAccount, influencer, influencerAccount] = await Promise.all([
      this.store.findOne<Row>('business_profiles', { eq: { user_id: campaign.business_id } }),
      this.store.findOne<Row>('profiles', { eq: { id: campaign.business_id } }),
      this.store.findOne<Row>('influencer_profiles', { eq: { user_id: campaign.influencer_id } }),
      this.store.findOne<Row>('profiles', { eq: { id: campaign.influencer_id } }),
    ]);
    const businessProfile = withBusinessProfileImage(business, businessAccount);
    return {
      ...campaign,
      business_profile: businessProfile,
      influencer_profile: withInfluencerProfileImage(influencer, influencerAccount),
      location_weather: await this.locationWeather(campaign, businessProfile),
    };
  }

  private async locationWeather(campaign: Row, businessProfile?: Row | null) {
    if (!this.weather) return null;
    const latitude = Number(campaign.place_latitude ?? businessProfile?.brand_latitude);
    const longitude = Number(campaign.place_longitude ?? businessProfile?.brand_longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    try {
      return await this.weather.current({ latitude, longitude });
    } catch (error) {
      logger.warn({ err: error, campaignId: campaign.id }, 'location weather lookup failed');
      return null;
    }
  }

  async withProfilesMany(campaigns: Row[]) {
    if (campaigns.length === 0) return [];
    const businessIds = [
      ...new Set(campaigns.map((campaign) => campaign.business_id).filter(Boolean)),
    ];
    const influencerIds = [
      ...new Set(campaigns.map((campaign) => campaign.influencer_id).filter(Boolean)),
    ];
    const [businessProfiles, businessAccounts, influencerProfiles, influencerAccounts] =
      await Promise.all([
        businessIds.length
          ? this.store.list<Row>('business_profiles', { in: { user_id: businessIds } })
          : [],
        businessIds.length ? this.store.list<Row>('profiles', { in: { id: businessIds } }) : [],
        influencerIds.length
          ? this.store.list<Row>('influencer_profiles', { in: { user_id: influencerIds } })
          : [],
        influencerIds.length ? this.store.list<Row>('profiles', { in: { id: influencerIds } }) : [],
      ]);
    const businessByUserId = new Map(businessProfiles.map((profile) => [profile.user_id, profile]));
    const accountByUserId = new Map(businessAccounts.map((account) => [account.id, account]));
    const influencerByUserId = new Map(
      influencerProfiles.map((profile) => [profile.user_id, profile]),
    );
    const influencerAccountByUserId = new Map(
      influencerAccounts.map((account) => [account.id, account]),
    );
    return campaigns.map((campaign) => ({
      ...campaign,
      business_profile: withBusinessProfileImage(
        businessByUserId.get(campaign.business_id),
        accountByUserId.get(campaign.business_id),
      ),
      influencer_profile: withInfluencerProfileImage(
        influencerByUserId.get(campaign.influencer_id),
        influencerAccountByUserId.get(campaign.influencer_id),
      ),
    }));
  }

  notificationData(campaign: Row, influencer?: Row) {
    return {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      influencerName: influencer?.display_name,
      amount_paise: campaign.price_offered_paise,
    };
  }
}

export class PaymentService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly campaigns: CampaignService,
    private readonly config: EnvConfig,
    private readonly payment?: PaymentProvider,
  ) {}

  private requirePayment() {
    if (!this.payment)
      throw badRequest('PAYMENT_PROVIDER_UNAVAILABLE', 'Payment provider is not configured');
    return this.payment;
  }

  async createEscrowOrder(user: AuthUser, campaignId: string) {
    const campaign = await requireCampaignRole(this.store, campaignId, user.id, 'business');
    requireStatus(campaign, ['pre_authorized']);
    const provider = this.requirePayment();
    const existing = await this.store.findOne<Row>('payment_orders', {
      eq: { campaign_id: campaign.id },
    });
    const order = existing?.provider_order_id
      ? await provider.fetchOrder(String(existing.provider_order_id))
      : await provider.createOrder({
          amount: moneyPaise(campaign.total_charged_paise),
          currency: 'INR',
          receipt: campaign.id,
          payment_capture: 0,
        });
    if (!existing?.provider_order_id) {
      await this.store.insert('payment_orders', {
        campaign_id: campaign.id,
        provider: 'razorpay',
        provider_order_id: order.id,
        status: 'created',
        amount_paise: order.amount,
        currency: order.currency,
        metadata: {},
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    }
    return { orderId: order.id, amount: order.amount, currency: order.currency };
  }

  async verifyEscrow(user: AuthUser, input: Row) {
    const campaign = await requireCampaignRole(this.store, input.campaign_id, user.id, 'business');
    const existingOrder = await this.store.findOne<Row>('payment_orders', {
      eq: { campaign_id: campaign.id, provider_payment_id: input.razorpay_payment_id },
    });
    if (campaign.status === 'in_escrow' && existingOrder) {
      return { success: true, campaignId: campaign.id };
    }
    requireStatus(campaign, ['capture_pending']);
    const provider = this.requirePayment();
    if (
      !provider.verifySignature({
        orderId: input.razorpay_order_id,
        paymentId: input.razorpay_payment_id,
        signature: input.razorpay_signature,
      })
    ) {
      throw forbidden('Invalid Razorpay signature');
    }
    const payment = await provider.fetchPayment(input.razorpay_payment_id);
    const transitioned = await this.store.rpc<Row>('confirm_campaign_capture', {
      p_campaign_id: campaign.id,
      p_actor: user.id,
      p_provider_payment_id: input.razorpay_payment_id,
      p_payment_method: payment.method,
    });
    await this.notifications.create(
      transitioned.influencer_id,
      'payment_secured',
      this.campaigns.notificationData(transitioned),
    );
    return { success: true, campaignId: campaign.id };
  }

  async createBookingOrder(user: AuthUser, input: Row) {
    const profileService = new ProfileService(this.store);
    await profileService.assertBusinessComplete(user.id);
    const influencer = await this.store.getById<Row>(
      'influencer_profiles',
      input.influencer_profile_id,
    );
    if (!influencer || influencer.is_active !== true) throw notFound('Influencer profile');
    const pricePaise = packagePricePaise(influencer, input.package_type);
    const feePaise = platformFeePaise(pricePaise);
    const totalPaise = pricePaise + feePaise;
    const order = await this.requirePayment().createOrder({
      amount: totalPaise,
      currency: 'INR',
      payment_capture: 0,
    });
    return {
      orderId: order.id,
      keyId: this.config.razorpayKeyId,
      amount: order.amount,
      currency: order.currency,
      price_offered_paise: pricePaise,
      platform_fee_paise: feePaise,
      total_charged_paise: totalPaise,
    };
  }

  async verifyBookingPayment(user: AuthUser, input: Row) {
    const existingOrder = await this.store.findOne<Row>('payment_orders', {
      eq: { provider: 'razorpay', provider_order_id: input.razorpay_order_id },
    });
    if (existingOrder) return { success: true, campaignId: existingOrder.campaign_id };
    const provider = this.requirePayment();
    if (
      !provider.verifySignature({
        orderId: input.razorpay_order_id,
        paymentId: input.razorpay_payment_id,
        signature: input.razorpay_signature,
      })
    ) {
      throw forbidden('Invalid Razorpay signature');
    }
    const influencer = await this.store.getById<Row>(
      'influencer_profiles',
      input.influencer_profile_id,
    );
    if (!influencer || influencer.is_active !== true) throw notFound('Influencer profile');
    const pricePaise = packagePricePaise(influencer, input.package_type);
    if (input.influencer_id && input.influencer_id !== influencer.user_id)
      throw badRequest('INFLUENCER_MISMATCH', 'Influencer does not match profile');
    const order = await provider.fetchOrder(input.razorpay_order_id);
    const expectedAmount = pricePaise + platformFeePaise(pricePaise);
    if (order.amount !== expectedAmount) {
      throw conflict(
        'PAYMENT_AMOUNT_MISMATCH',
        'Paid order amount does not match the requested booking amount',
      );
    }
    const payment = await provider.fetchPayment(input.razorpay_payment_id);
    if (payment.method !== 'card') {
      throw badRequest('UNSUPPORTED_PAYMENT_METHOD', 'Only card pre-authorization is supported');
    }
    const created = await this.campaigns.create(
      user,
      { ...input, influencer_id: influencer.user_id },
      {
        status: 'pre_authorized',
        provider_order_id: input.razorpay_order_id,
        provider_payment_id: input.razorpay_payment_id,
        payment_method: 'card',
        payment_order_status: 'authorized',
        authorized_at: nowIso(),
        expires_at: futureIso(24 * HOUR_MS),
      },
      { skipCreative: true },
    );
    await this.campaigns.generateCreative(created.campaignId);
    return { success: true, campaignId: created.campaignId };
  }

  async captureBookingPayment(campaignId: string) {
    const campaign = await this.store.getById<Row>('campaigns', campaignId);
    if (!campaign) throw notFound('Campaign');
    const paymentOrder = await this.store.findOne<Row>('payment_orders', {
      eq: { campaign_id: campaignId },
    });
    if (!paymentOrder?.provider_payment_id) throw notFound('Payment order');
    await this.requirePayment().capturePayment(
      String(paymentOrder.provider_payment_id),
      moneyPaise(paymentOrder.amount_paise),
    );
    await this.store.rpc<Row>('confirm_campaign_capture', {
      p_campaign_id: campaignId,
      p_actor: null,
      p_provider_payment_id: paymentOrder.provider_payment_id,
      p_payment_method: paymentOrder.payment_method ?? 'card',
    });
    return { ok: true };
  }

  async releaseEscrow(user: AuthUser | undefined, campaignId: string, notify = true) {
    const campaign = user
      ? await requireCampaignRole(this.store, campaignId, user.id, 'business')
      : await this.store.getById<Row>('campaigns', campaignId);
    if (!campaign) throw notFound('Campaign');
    requireStatus(campaign, ['delivery_submitted', 'completed']);
    return { ok: true, ...(await this.campaigns.release(campaign, user?.id, notify)) };
  }

  async webhook(rawBody: string, signature?: string) {
    if (!this.config.razorpayWebhookSecret)
      throw forbidden('Razorpay webhook secret is not configured');
    if (
      !signature ||
      !verifyHmacSha256({ body: rawBody, signature, secret: this.config.razorpayWebhookSecret })
    ) {
      throw forbidden('Invalid Razorpay webhook signature');
    }
    let event: Row;
    try {
      event = JSON.parse(rawBody) as Row;
    } catch {
      throw badRequest('INVALID_WEBHOOK_BODY', 'Razorpay webhook body must be valid JSON');
    }
    if (event.event === 'payment.failed') {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        await this.store.update(
          'payment_orders',
          { eq: { provider: 'razorpay', provider_order_id: orderId } },
          { status: 'failed', failure_reason: 'Razorpay payment failed', updated_at: nowIso() },
        );
      }
    }
    if (event.event === 'refund.processed') {
      const refund = event.payload?.refund?.entity;
      if (refund?.id) {
        await this.store.update(
          'escrow_ledger_entries',
          { eq: { provider_refund_id: refund.id } },
          { status: 'succeeded', updated_at: nowIso() },
        );
      }
    }
    return { ok: true };
  }
}

export class DeliveryService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly storage?: StorageProvider,
  ) {}

  async upload(user: AuthUser, campaignId: string, file: File) {
    const campaign = await requireCampaignRole(this.store, campaignId, user.id, 'influencer');
    requireStatus(campaign, ['in_escrow']);
    if (file.size > 50 * 1024 * 1024)
      throw badRequest('FILE_TOO_LARGE', 'Delivery files must be 50 MB or smaller');
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'application/pdf',
      'application/zip',
    ];
    if (!allowed.includes(file.type))
      throw badRequest('UNSUPPORTED_FILE_TYPE', 'Unsupported delivery file type');
    if (!this.storage)
      throw badRequest('STORAGE_PROVIDER_UNAVAILABLE', 'Storage provider is not configured');
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${campaignId}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const storagePath = await this.storage.uploadDelivery({ path, file });
    return { storage_path: storagePath };
  }

  async submit(user: AuthUser, id: string, input: Row) {
    const campaign = await this.store.rpc<Row>('submit_delivery', {
      p_campaign_id: id,
      p_actor: user.id,
      p_storage_path: input.storage_path,
      p_creator_note: input.creator_note ?? null,
    });
    await this.notifications.create(campaign.business_id, 'delivery_submitted', {
      campaignId: id,
      campaignTitle: campaign.title,
    });
    return { ok: true };
  }

  async signedUrl(user: AuthUser, id: string) {
    await campaignForParticipant(this.store, id, user.id);
    const delivery = await this.store.findOne<Row>('deliveries', { eq: { campaign_id: id } });
    if (!delivery) throw notFound('Delivery');
    if (!this.storage)
      throw badRequest('STORAGE_PROVIDER_UNAVAILABLE', 'Storage provider is not configured');
    const signedUrl = await this.storage.signedUrl(delivery.storage_path, 3600);
    return { signedUrl, expiresAt: new Date(Date.now() + HOUR_MS).toISOString() };
  }
}

export class MessagingService {
  constructor(
    private readonly store: DataStore,
    private readonly email?: EmailProvider,
    private readonly storage?: StorageProvider,
  ) {}

  async inbox(user: AuthUser, role: UserRole) {
    // One aggregate query returns each campaign's latest message + unread count,
    // already ordered newest-activity-first (see the inbox_summary RPC migration).
    const summary = (await this.store.rpc('inbox_summary', {
      p_user_id: user.id,
      p_role: role,
    })) as unknown as Array<{
      campaign: Row;
      latest_message: Row | null;
      unread_count: number | string;
    }>;
    const campaigns = summary.map((entry) => entry.campaign);
    const businessIds = [
      ...new Set(campaigns.map((campaign) => campaign.business_id).filter(Boolean)),
    ];
    const influencerIds = [
      ...new Set(campaigns.map((campaign) => campaign.influencer_id).filter(Boolean)),
    ];
    const [businessProfiles, businessAccounts, influencerProfiles, influencerAccounts] =
      await Promise.all([
        businessIds.length
          ? this.store.list<Row>('business_profiles', { in: { user_id: businessIds } })
          : [],
        businessIds.length ? this.store.list<Row>('profiles', { in: { id: businessIds } }) : [],
        influencerIds.length
          ? this.store.list<Row>('influencer_profiles', { in: { user_id: influencerIds } })
          : [],
        influencerIds.length ? this.store.list<Row>('profiles', { in: { id: influencerIds } }) : [],
      ]);
    const businessByUserId = new Map(businessProfiles.map((profile) => [profile.user_id, profile]));
    const accountByUserId = new Map(businessAccounts.map((account) => [account.id, account]));
    const influencerByUserId = new Map(
      influencerProfiles.map((profile) => [profile.user_id, profile]),
    );
    const influencerAccountByUserId = new Map(
      influencerAccounts.map((account) => [account.id, account]),
    );
    return summary.map((entry) => ({
      campaign: {
        ...entry.campaign,
        business_profile: withBusinessProfileImage(
          businessByUserId.get(entry.campaign.business_id),
          accountByUserId.get(entry.campaign.business_id),
        ),
        influencer_profile: withInfluencerProfileImage(
          influencerByUserId.get(entry.campaign.influencer_id),
          influencerAccountByUserId.get(entry.campaign.influencer_id),
        ),
      },
      latestMessage: entry.latest_message,
      unreadCount: Number(entry.unread_count),
    }));
  }

  async messages(user: AuthUser, id: string, options: { limit?: number; before?: string } = {}) {
    await campaignForParticipant(this.store, id, user.id);
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
    // Newest-first window; fetch one extra row to detect whether older messages remain.
    const page = await this.store.list<Row>('campaign_messages', {
      eq: { campaign_id: id },
      ...(options.before ? { lt: { created_at: options.before } } : {}),
      order: { column: 'created_at', ascending: false },
      limit: limit + 1,
    });
    const hasMore = page.length > limit;
    const windowed = hasMore ? page.slice(0, limit) : page;
    const nextCursor = hasMore ? String(windowed[windowed.length - 1]?.created_at) : null;
    const messageIds = windowed.map((message) => String(message.id)).filter(Boolean);
    // Fetch ALL reads (not just this user's) so `read_by` reflects the counterparty too.
    const reads = messageIds.length
      ? await this.store.list<Row>('campaign_message_reads', { in: { message_id: messageIds } })
      : [];
    const readBy = new Map<string, string[]>();
    const ownReadAt = new Map<string, string>();
    for (const read of reads) {
      const messageId = String(read.message_id);
      const readers = readBy.get(messageId) ?? [];
      readers.push(String(read.user_id));
      readBy.set(messageId, readers);
      if (read.user_id === user.id) ownReadAt.set(messageId, String(read.read_at));
    }
    const messages = windowed.map((message) => ({
      ...message,
      read_by: readBy.get(String(message.id)) ?? [],
      read_at: ownReadAt.get(String(message.id)) ?? null,
    }));
    return { messages, nextCursor };
  }

  async send(user: AuthUser, id: string, input: Row) {
    const campaign = await campaignForParticipant(this.store, id, user.id);
    requireStatus(campaign, ['in_escrow', 'delivery_submitted', 'changes_requested', 'completed']);
    const message = await this.store.insert<Row>('campaign_messages', {
      campaign_id: id,
      sender_id: user.id,
      message_type: input.message_type,
      content: input.content,
      metadata: {},
      created_at: nowIso(),
    });
    await this.store.upsert(
      'campaign_message_reads',
      { message_id: message.id, user_id: user.id, read_at: nowIso() },
      'message_id,user_id',
    );
    return message;
  }

  async sendAttachment(user: AuthUser, id: string, input: { caption?: string; file: File }) {
    const campaign = await campaignForParticipant(this.store, id, user.id);
    requireStatus(campaign, ['in_escrow', 'delivery_submitted', 'changes_requested', 'completed']);
    if (!this.storage)
      throw badRequest('STORAGE_PROVIDER_UNAVAILABLE', 'Storage provider is not configured');
    if (input.file.size > MAX_MESSAGE_ATTACHMENT_SIZE) {
      throw badRequest('FILE_TOO_LARGE', 'Message attachments must be 25 MB or smaller');
    }
    if (!MESSAGE_ATTACHMENT_MIME_TYPES.has(input.file.type)) {
      throw badRequest('UNSUPPORTED_FILE_TYPE', 'Unsupported message attachment file type');
    }
    const ext = input.file.name.split('.').pop() ?? 'bin';
    const path = `messages/${id}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const storagePath = await this.storage.uploadMessageAttachment({ path, file: input.file });
    const message = await this.store.insert<Row>('campaign_messages', {
      campaign_id: id,
      sender_id: user.id,
      message_type: 'attachment',
      content: input.caption?.trim() || input.file.name,
      metadata: {
        storage_path: storagePath,
        fileName: input.file.name,
        mimeType: input.file.type,
        fileSize: input.file.size,
      },
      created_at: nowIso(),
    });
    await this.store.upsert(
      'campaign_message_reads',
      { message_id: message.id, user_id: user.id, read_at: nowIso() },
      'message_id,user_id',
    );
    await this.store.insert('campaign_files', {
      campaign_id: id,
      message_id: message.id,
      uploaded_by: user.id,
      file_type: 'message_attachment',
      storage_bucket: 'campaign-messages',
      storage_path: storagePath,
      file_name: input.file.name,
      file_size: input.file.size,
      mime_type: input.file.type,
      created_at: nowIso(),
    });
    return message;
  }

  async markRead(user: AuthUser, id: string) {
    await campaignForParticipant(this.store, id, user.id);
    // Only the counterparty's messages need a read record for this user.
    const messages = await this.store.list<Row>('campaign_messages', {
      eq: { campaign_id: id },
    });
    const counterpartyMessageIds = messages
      .filter((message) => message.sender_id !== user.id)
      .map((message) => String(message.id));
    if (counterpartyMessageIds.length === 0) return { ok: true, marked: 0 };
    // Skip messages this user has already read so a re-open is a no-op write.
    const existingReads = await this.store.list<Row>('campaign_message_reads', {
      eq: { user_id: user.id },
      in: { message_id: counterpartyMessageIds },
    });
    const alreadyRead = new Set(existingReads.map((read) => String(read.message_id)));
    const unread = counterpartyMessageIds.filter((messageId) => !alreadyRead.has(messageId));
    if (unread.length === 0) return { ok: true, marked: 0 };
    const readAt = nowIso();
    await this.store.upsertMany(
      'campaign_message_reads',
      unread.map((messageId) => ({ message_id: messageId, user_id: user.id, read_at: readAt })),
      'message_id,user_id',
    );
    return { ok: true, marked: unread.length };
  }

  async requestCall(user: AuthUser, campaignId: string) {
    const campaign = await campaignForParticipant(this.store, campaignId, user.id);
    requireStatus(campaign, ['in_escrow', 'delivery_submitted', 'changes_requested', 'completed']);
    const recent = await this.store.findOne<Row>('campaign_messages', {
      eq: {
        campaign_id: campaignId,
        sender_id: user.id,
        message_type: 'system',
        content: 'call_requested',
      },
    });
    if (recent && Date.parse(recent.created_at) > Date.now() - 6 * HOUR_MS)
      throw tooManyRequests('Call already requested in the last 6 hours');
    const message = await this.store.insert<Row>('campaign_messages', {
      campaign_id: campaignId,
      sender_id: user.id,
      message_type: 'system',
      content: 'call_requested',
      metadata: {},
      created_at: nowIso(),
    });
    await this.store.upsert(
      'campaign_message_reads',
      { message_id: message.id, user_id: user.id, read_at: nowIso() },
      'message_id,user_id',
    );
    if (this.email) {
      const otherUserId =
        campaign.business_id === user.id ? campaign.influencer_id : campaign.business_id;
      const profile = await this.store.findOne<Row>('profiles', { eq: { id: otherUserId } });
      if (profile?.email)
        await this.email.sendCallRequest({
          to: profile.email,
          subject: 'Plugoh call request',
          html: `<p>A call was requested for ${campaign.title}.</p>`,
        });
    }
    return { ok: true };
  }
}

export class InstagramService {
  constructor(
    private readonly store: DataStore,
    private readonly instagram?: InstagramProvider,
  ) {}

  connect(input: { userId: string; role: UserRole; platform?: 'web' | 'mobile' }) {
    if (!this.instagram)
      throw badRequest('INSTAGRAM_PROVIDER_UNAVAILABLE', 'Instagram provider is not configured');
    const platform = input.platform ?? 'web';
    const state = `${input.role}:${platform}:${crypto.randomUUID()}:${input.userId}`;
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ];
    return { state, url: this.instagram.buildOAuthUrl({ state, scopes }) };
  }

  async callback(input: { code: string; state: string }, cookieState?: string) {
    if (!cookieState || cookieState !== input.state)
      throw forbidden('Invalid Instagram OAuth state');
    if (!this.instagram)
      throw badRequest('INSTAGRAM_PROVIDER_UNAVAILABLE', 'Instagram provider is not configured');
    const [role, platform, , userId] = input.state.split(':') as [
      UserRole,
      'web' | 'mobile',
      string,
      string,
    ];
    const token = await this.instagram.exchangeCode(input.code);
    const profile = await this.instagram.fetchProfile(token.accessToken);
    await this.store.upsert(
      'instagram_connections',
      {
        user_id: userId,
        role,
        ig_user_id: profile.ig_user_id,
        username: profile.username,
        biography: profile.biography,
        profile_picture_url: profile.profile_picture_url,
        followers_count: profile.followers_count,
        follows_count: profile.follows_count,
        media_count: profile.media_count,
        access_token: token.accessToken,
        token_expires_at: token.expiresAt,
        connected_at: nowIso(),
        last_synced_at: nowIso(),
        updated_at: nowIso(),
      },
      'user_id',
    );
    if (role === 'influencer') {
      const media = await this.instagram.fetchMedia(token.accessToken);
      await this.store.upsert(
        'influencer_profiles',
        {
          user_id: userId,
          instagram_username: profile.username,
          profile_photo_url: profile.profile_picture_url,
          instagram_profile_picture_url: profile.profile_picture_url,
          follower_count: profile.followers_count,
          ...instagramAverages(media),
          is_active: true,
          instagram_connected_at: nowIso(),
          updated_at: nowIso(),
        },
        'user_id',
      );
      await Promise.all(
        media.map((item) =>
          this.store.upsert(
            'instagram_media',
            { user_id: userId, ...item, synced_at: nowIso() },
            'user_id,ig_media_id',
          ),
        ),
      );
      return {
        redirectTo:
          platform === 'mobile'
            ? 'plugoh://instagram/callback?status=success&role=influencer&source=onboarding'
            : '/dashboard/influencer/profile?source=onboarding',
        userId,
        role,
      };
    }
    await this.store.upsert(
      'business_profiles',
      {
        user_id: userId,
        instagram_username: profile.username,
        instagram_profile_picture_url: profile.profile_picture_url,
        instagram_followers_count: profile.followers_count,
        instagram_connected_at: nowIso(),
        updated_at: nowIso(),
      },
      'user_id',
    );
    return {
      redirectTo:
        platform === 'mobile'
          ? 'plugoh://instagram/callback?status=success&role=business&source=onboarding'
          : '/dashboard/business/profile?source=onboarding',
      userId,
      role,
    };
  }

  async sync(user: AuthUser, role: UserRole) {
    if (!this.instagram)
      throw badRequest('INSTAGRAM_PROVIDER_UNAVAILABLE', 'Instagram provider is not configured');
    const table = role === 'business' ? 'business_profiles' : 'influencer_profiles';
    const connection = await this.store.findOne<Row>('instagram_connections', {
      eq: { user_id: user.id, role },
    });
    if (!connection?.access_token)
      throw badRequest('INSTAGRAM_NOT_CONNECTED', 'Instagram is not connected');
    if (role === 'business') {
      const latestProfile = await this.instagram.fetchProfile(String(connection.access_token));
      await this.store.upsert(
        'instagram_connections',
        {
          ...connection,
          username: latestProfile.username,
          biography: latestProfile.biography,
          profile_picture_url: latestProfile.profile_picture_url,
          followers_count: latestProfile.followers_count,
          follows_count: latestProfile.follows_count,
          media_count: latestProfile.media_count,
          last_synced_at: nowIso(),
          updated_at: nowIso(),
        },
        'user_id',
      );
      await this.store.update(
        table,
        { eq: { user_id: user.id } },
        {
          instagram_username: latestProfile.username,
          instagram_profile_picture_url: latestProfile.profile_picture_url,
          instagram_followers_count: latestProfile.followers_count,
          instagram_connected_at: nowIso(),
          updated_at: nowIso(),
        },
      );
      return { synced: 1 };
    }
    const media = await this.instagram.fetchMedia(String(connection.access_token));
    await Promise.all(
      media.map((item) =>
        this.store.upsert(
          'instagram_media',
          { user_id: user.id, ...item, synced_at: nowIso() },
          'user_id,ig_media_id',
        ),
      ),
    );
    await this.store.update(
      'influencer_profiles',
      { eq: { user_id: user.id } },
      {
        ...instagramAverages(media),
        instagram_connected_at: nowIso(),
        updated_at: nowIso(),
      },
    );
    await this.store.update(
      'instagram_connections',
      { eq: { user_id: user.id, role } },
      { last_synced_at: nowIso(), updated_at: nowIso() },
    );
    return { synced: media.length };
  }

  async disconnect(user: AuthUser, role: UserRole) {
    const table = role === 'business' ? 'business_profiles' : 'influencer_profiles';
    const [profile] = await this.store.update<Row>(
      table,
      { eq: { user_id: user.id } },
      {
        instagram_username: null,
        instagram_profile_picture_url: null,
        instagram_connected_at: null,
        ...(role === 'influencer' ? { is_active: false } : {}),
        updated_at: nowIso(),
      },
    );
    if (!profile) throw notFound(`${role === 'business' ? 'Business' : 'Influencer'} profile`);
    return { ok: true };
  }
}

function instagramAverages(media: Row[]) {
  const reels = media.filter((item) => ['VIDEO', 'REELS_VIDEO'].includes(String(item.media_type)));
  const sample = reels.length ? reels : media;
  const count = sample.length || 1;
  return {
    avg_likes_per_reel: sample.reduce((sum, item) => sum + Number(item.like_count ?? 0), 0) / count,
    avg_views_per_reel:
      sample.reduce((sum, item) => sum + Number(item.video_views ?? item.impressions ?? 0), 0) /
      count,
  };
}

export class AiProfileService {
  constructor(
    private readonly store: DataStore,
    private readonly ai?: AiProvider,
  ) {}

  async influencer(userId: string) {
    if (!this.ai) throw badRequest('AI_PROVIDER_UNAVAILABLE', 'AI provider is not configured');
    const profile = await this.store.findOne<Row>('influencer_profiles', {
      eq: { user_id: userId },
    });
    if (!profile) throw notFound('Influencer profile');
    const media = await this.store.list<Row>('instagram_media', {
      eq: { user_id: userId },
      order: { column: 'engagement', ascending: false },
      limit: 20,
    });
    const generated = await this.ai.generateInfluencerProfile({ profile, media });
    const patch = Object.fromEntries(
      Object.entries(generated).filter(([key]) => profile[key] == null),
    );
    if (Object.keys(patch).length)
      await this.store.update('influencer_profiles', { eq: { user_id: userId } }, patch);
    return { ok: true };
  }

  async business(userId: string) {
    if (!this.ai) throw badRequest('AI_PROVIDER_UNAVAILABLE', 'AI provider is not configured');
    const profile = await this.store.findOne<Row>('business_profiles', { eq: { user_id: userId } });
    if (!profile) throw notFound('Business profile');
    const generated = await this.ai.generateBusinessProfile({ profile });
    const patch = Object.fromEntries(
      Object.entries(generated).filter(([key]) => profile[key] == null),
    );
    if (Object.keys(patch).length)
      await this.store.update('business_profiles', { eq: { user_id: userId } }, patch);
    return { ok: true };
  }
}

export class EarningsService {
  constructor(private readonly store: DataStore) {}

  async summary(user: AuthUser) {
    const campaigns = await this.store.list<Row>('campaigns', { eq: { influencer_id: user.id } });
    const relevant = campaigns.filter((campaign) =>
      ['in_escrow', 'delivery_submitted', 'completed'].includes(campaign.status),
    );
    const completed = relevant.filter((campaign) => campaign.status === 'completed');
    const pending = relevant.filter((campaign) =>
      ['in_escrow', 'delivery_submitted'].includes(campaign.status),
    );
    const total = completed.reduce(
      (sum, campaign) => sum + Number(campaign.price_offered_paise ?? 0),
      0,
    );
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);
    const byMonth = new Map<string, number>();
    for (const campaign of completed) {
      const month = String(campaign.completed_at ?? campaign.created_at).slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + Number(campaign.price_offered_paise ?? 0));
    }
    const thisMonth = byMonth.get(currentMonth) ?? 0;
    const lastMonth = byMonth.get(lastMonthKey) ?? 0;
    return {
      total_earnings: total,
      pending_earnings: pending.reduce(
        (sum, campaign) => sum + Number(campaign.price_offered_paise ?? 0),
        0,
      ),
      this_month: thisMonth,
      last_month: lastMonth,
      month_over_month_change:
        lastMonth === 0 ? (thisMonth > 0 ? 1 : 0) : (thisMonth - lastMonth) / lastMonth,
      monthly_breakdown: [...byMonth.entries()].map(([month, amount]) => ({ month, amount })),
      transactions: completed.map((campaign) => ({
        campaignId: campaign.id,
        title: campaign.title,
        amount_paise: campaign.price_offered_paise,
        status: campaign.status,
        date: campaign.completed_at,
      })),
      tier:
        total >= 50_000_000
          ? 'macro'
          : total >= 10_000_000
            ? 'mid'
            : total >= 1_000_000
              ? 'micro'
              : 'nano',
      tier_progress:
        total >= 50_000_000
          ? 1
          : total >= 10_000_000
            ? total / 50_000_000
            : total >= 1_000_000
              ? total / 10_000_000
              : total / 1_000_000,
    };
  }
}

export class CronService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly payments: PaymentService,
    private readonly payment?: PaymentProvider,
  ) {}

  async autoRelease() {
    let autoReleased = 0;
    let expired = 0;
    const cutoff = new Date(Date.now() - 7 * DAY_MS).toISOString();
    const deliverySubmitted = await this.store.list<Row>('campaigns', {
      eq: { status: 'delivery_submitted' },
      lt: { delivery_submitted_at: cutoff },
    });
    for (const campaign of deliverySubmitted) {
      await this.payments.releaseEscrow(undefined, campaign.id, false);
      await this.notifications.createForMany(
        [campaign.business_id, campaign.influencer_id],
        'booking_completed',
        { campaignId: campaign.id },
      );
      autoReleased += 1;
    }
    for (const status of ['pre_authorized', 'capture_pending'] as const) {
      const rows = await this.store.list<Row>('campaigns', {
        eq: { status },
        lt: { expires_at: nowIso() },
      });
      for (const campaign of rows) {
        await this.store.rpc<Row>('expire_campaign_authorization', { p_campaign_id: campaign.id });
        const recipients = [campaign.business_id, campaign.influencer_id];
        await this.notifications.createForMany(recipients, 'booking_expired', {
          campaignId: campaign.id,
        });
        expired += 1;
      }
    }
    return { autoReleased, expired };
  }
}

async function issueRefund(
  store: DataStore,
  payment: PaymentProvider | undefined,
  campaign: Row,
  reason: 'declined' | 'expired',
) {
  const paymentOrder = await store.findOne<Row>('payment_orders', {
    eq: { campaign_id: campaign.id },
  });
  if (!paymentOrder?.provider_payment_id) return;
  const refund = await payment?.refundPayment(
    String(paymentOrder.provider_payment_id),
    moneyPaise(campaign.total_charged_paise),
  );
  await store.rpc<Row>('record_campaign_refund', {
    p_campaign_id: campaign.id,
    p_actor: null,
    p_provider_refund_id: refund?.id ?? null,
    p_amount_paise: moneyPaise(campaign.total_charged_paise),
    p_reason: reason,
  });
}

export { assertUser, requireCampaignRole };
