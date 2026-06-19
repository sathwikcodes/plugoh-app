import type { UserRole } from '@plugoh/contracts';
import type { InstagramProvider } from '../../clients/providers.js';
import { badRequest, forbidden, notFound } from '../../core/errors.js';
import type { DataStore } from '../../repositories/data-store.js';
import type { AuthUser } from '../../types.js';
import { nowIso, type Row } from '../../services/shared.js';

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
