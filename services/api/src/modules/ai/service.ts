import type { AiProvider } from '../../clients/providers.js';
import { badRequest, notFound } from '../../core/errors.js';
import type { DataStore } from '../../repositories/data-store.js';
import { type Row } from '../../services/shared.js';

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
