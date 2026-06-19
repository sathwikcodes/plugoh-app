import type { DataStore } from '../../repositories/data-store.js';
import type { AuthUser } from '../../types.js';
import { withBusinessProfileImage, type Row } from '../../services/shared.js';

export class EarningsService {
  constructor(private readonly store: DataStore) {}

  async summary(user: AuthUser) {
    const campaigns = await this.store.list<Row>('campaigns', { eq: { influencer_id: user.id } });
    const businessIds = [
      ...new Set(campaigns.map((campaign) => campaign.business_id).filter(Boolean)),
    ];
    const [businessProfiles, businessAccounts] = await Promise.all([
      businessIds.length
        ? this.store.list<Row>('business_profiles', { in: { user_id: businessIds } })
        : [],
      businessIds.length ? this.store.list<Row>('profiles', { in: { id: businessIds } }) : [],
    ]);
    const businessByUserId = new Map(businessProfiles.map((profile) => [profile.user_id, profile]));
    const accountByUserId = new Map(businessAccounts.map((account) => [account.id, account]));
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
      transactions: completed.map((campaign) => {
        const businessProfile = withBusinessProfileImage(
          businessByUserId.get(campaign.business_id),
          accountByUserId.get(campaign.business_id),
        );
        const businessAccount = accountByUserId.get(campaign.business_id);
        const accountAvatar =
          typeof businessAccount?.avatar_url === 'string' ? businessAccount.avatar_url.trim() : '';

        return {
          campaignId: campaign.id,
          title: campaign.title,
          amount_paise: campaign.price_offered_paise,
          status: campaign.status,
          date: campaign.completed_at,
          brand_profile_image_url: businessProfile?.profile_photo_url || accountAvatar || undefined,
        };
      }),
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
