import { notFound } from '../../core/errors.js';
import type { DataStore } from '../../repositories/data-store.js';
import { paginateRows, type Row } from '../../services/shared.js';

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
