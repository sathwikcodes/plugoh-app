import type { OnboardingStage, UserRole } from '@plugoh/contracts';
import type { GeocodingProvider, PlacesProvider } from '../../clients/providers.js';
import { badRequest, forbidden, notFound } from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import type { DataStore } from '../../repositories/data-store.js';
import type { AuthUser } from '../../types.js';
import {
  explicitCoordinateValues,
  geocodeValues,
  hasInstagramConnection,
  nowIso,
  withBusinessProfileImage,
  withInfluencerProfileImage,
  type Row,
} from '../../services/shared.js';

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

function normalizeBusinessProfilePatch(input: Row) {
  const patch = { ...input };
  if (patch.brand_category == null && patch.brand_type != null) {
    patch.brand_category = patch.brand_type;
  }
  delete patch.brand_type;
  return patch;
}

function hasGeneratedInfluencerFields(profile?: Row | null) {
  return Boolean(profile?.category && profile.price_per_reel_paise != null);
}

export class ProfileService {
  constructor(
    private readonly store: DataStore,
    private readonly geocoding?: GeocodingProvider,
    private readonly places?: PlacesProvider,
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
    const coordinateValues =
      explicitCoordinateValues(input, 'brand') ??
      (await geocodeValues(this.geocoding, brandLocation, 'brand'));
    const values = {
      user_id: user.id,
      brand_name: input.brand_name,
      brand_category: input.brand_category,
      brand_location: brandLocation,
      ...coordinateValues,
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
    const patch = normalizeBusinessProfilePatch(input);
    const existing = await this.store.findOne<Row>('business_profiles', {
      eq: { user_id: user.id },
    });
    const explicitCoordinates = explicitCoordinateValues(patch, 'brand');
    const locationChanged =
      Object.prototype.hasOwnProperty.call(patch, 'brand_location') &&
      String(patch.brand_location ?? '').trim() !== String(existing?.brand_location ?? '').trim();
    const coordinateValues = explicitCoordinates
      ? explicitCoordinates
      : locationChanged || Object.prototype.hasOwnProperty.call(patch, 'location')
        ? await geocodeValues(this.geocoding, patch.brand_location ?? patch.location, 'brand')
        : {};
    const [profile] = await this.store.update<Row>(
      'business_profiles',
      { eq: { user_id: user.id } },
      { ...patch, ...coordinateValues, updated_at: nowIso() },
    );
    if (!profile) throw notFound('Business profile');
    const account = await this.store.findOne<Row>('profiles', { eq: { id: user.id } });
    return withBusinessProfileImage(profile, account);
  }

  async reverseGeocode(input: { latitude: number; longitude: number }) {
    const fallback = { label: 'Selected location' };
    if (!this.geocoding?.reverseGeocode) return fallback;
    try {
      return (await this.geocoding.reverseGeocode(input)) ?? fallback;
    } catch (error) {
      logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Reverse geocoding failed',
      );
      return fallback;
    }
  }

  async geocode(input: { query: string }) {
    const query = input.query.trim();
    if (!this.geocoding) {
      throw badRequest('GEOCODING_PROVIDER_UNAVAILABLE', 'Location search is not configured');
    }
    const result = await this.geocoding.geocode(query);
    if (!result) {
      throw badRequest('LOCATION_NOT_FOUND', 'No matching location found');
    }
    return {
      label: result.label?.trim() || query,
      latitude: result.latitude,
      longitude: result.longitude,
    };
  }

  async autocomplete(input: { query: string }) {
    if (!this.places) {
      throw badRequest('PLACES_PROVIDER_UNAVAILABLE', 'Location search is not configured');
    }
    return { predictions: await this.places.autocomplete(input.query.trim()) };
  }

  async placeDetails(input: { place_id: string }) {
    if (!this.places) {
      throw badRequest('PLACES_PROVIDER_UNAVAILABLE', 'Location search is not configured');
    }
    const result = await this.places.placeDetails(input.place_id);
    if (!result) {
      throw badRequest('LOCATION_NOT_FOUND', 'No matching location found');
    }
    return result;
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
