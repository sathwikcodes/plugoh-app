import type { CampaignStatus } from '@plugoh/contracts';
import type { GeocodingProvider } from '../clients/providers.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../core/errors.js';
import { logger } from '../core/logger.js';
import type { DataStore } from '../repositories/data-store.js';
import type { AuthUser } from '../types.js';

export type Row = Record<string, any>;

export const PLATFORM_FEE_RATE = 0.12;
export const HOUR_MS = 60 * 60 * 1000;

export function nowIso() {
  return new Date().toISOString();
}

export function futureIso(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

export function blankCoordinates(prefix: 'brand' | 'place') {
  return {
    [`${prefix}_latitude`]: null,
    [`${prefix}_longitude`]: null,
  };
}

export async function geocodeValues(
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

export function explicitCoordinateValues(input: Row, prefix: 'brand' | 'place') {
  const latitude = Number(input[`${prefix}_latitude`]);
  const longitude = Number(input[`${prefix}_longitude`]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    [`${prefix}_latitude`]: latitude,
    [`${prefix}_longitude`]: longitude,
  };
}

export function moneyPaise(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

export function platformFeePaise(pricePaise: number) {
  return Math.round(pricePaise * PLATFORM_FEE_RATE);
}

const PACKAGE_PRICE_COLUMN: Record<string, string> = {
  instagram_reel: 'price_per_reel_paise',
  instagram_post: 'price_per_post_paise',
  instagram_story: 'price_per_story_paise',
};

export function packagePricePaise(profile: Row, packageType: string) {
  const priceColumn = PACKAGE_PRICE_COLUMN[packageType];
  if (!priceColumn) {
    throw badRequest(
      'PACKAGE_UNAVAILABLE',
      `${packageType} pricing is not available for this creator`,
    );
  }
  const pricePaise = Number(profile[priceColumn] ?? Number.NaN);
  if (!Number.isFinite(pricePaise) || pricePaise <= 0) {
    throw badRequest(
      'PACKAGE_UNAVAILABLE',
      `${packageType} pricing is not available for this creator`,
    );
  }
  return Math.round(pricePaise);
}

export function paginateRows<T>(rows: T[], query: Row) {
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);
  const offset = Math.max(Number(query.offset ?? 0), 0);
  const items = rows.slice(offset, offset + limit);
  const nextOffset = offset + limit < rows.length ? offset + limit : null;
  return { items, nextOffset, total: rows.length };
}

export function hasInstagramConnection(profile?: Row | null) {
  return Boolean(profile?.instagram_username || profile?.instagram_connected_at);
}

export function withBusinessProfileImage(profile?: Row | null, account?: Row | null) {
  if (!profile) return null;
  const instagramPhoto =
    typeof profile.instagram_profile_picture_url === 'string'
      ? profile.instagram_profile_picture_url.trim()
      : '';
  const accountAvatar = typeof account?.avatar_url === 'string' ? account.avatar_url.trim() : '';
  const profilePhoto = instagramPhoto || accountAvatar || undefined;

  return {
    ...profile,
    brand_type: profile.brand_type ?? profile.brand_category,
    email: typeof account?.email === 'string' ? account.email : undefined,
    profile_photo_url: profilePhoto,
    avatar_url: accountAvatar || undefined,
    instagram_connected: hasInstagramConnection(profile),
  };
}

export function withInfluencerProfileImage(profile?: Row | null, account?: Row | null) {
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

export function assertUser(user?: AuthUser): AuthUser {
  if (!user) throw unauthorized();
  return user;
}

export async function campaignForParticipant(store: DataStore, campaignId: string, userId: string) {
  const campaign = await store.getById<Row>('campaigns', campaignId);
  if (!campaign) throw notFound('Campaign');
  if (campaign.business_id !== userId && campaign.influencer_id !== userId)
    throw forbidden('Campaign participant required');
  return campaign;
}

export async function requireCampaignRole(
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

export function requireStatus(campaign: Row, statuses: CampaignStatus[]) {
  if (!statuses.includes(campaign.status)) {
    throw conflict('INVALID_CAMPAIGN_STATUS', `Campaign must be in status: ${statuses.join(', ')}`);
  }
}
