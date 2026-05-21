import type { CampaignListItem, CampaignStatus } from '@plugoh/contracts';

export type BrandDashboardProfile = {
  brand_name?: string | null;
  brand_type?: string | null;
  brand_location?: string | null;
  brand_summary?: string | null;
  instagram_connected?: boolean | null;
};

export type BrandReadinessItem = {
  id: 'profile' | 'instagram' | 'first_campaign' | 'five_campaigns';
  label: string;
  complete: boolean;
};

export type BrandDashboard = {
  activeCampaigns: CampaignListItem[];
  totalCampaigns: number;
  totalSpend: number;
  monthlySpend: Array<{ month: string; amount: number }>;
  readinessItems: BrandReadinessItem[];
  readinessPercent: number;
  nextAction: {
    label: string;
    route: '/(app)/profile/edit' | '/(app)/profile/instagram' | '/(app)/(brand-tabs)/discover';
  };
};

const ACTIVE_CAMPAIGN_STATUSES = new Set<CampaignStatus>([
  'requested',
  'payment_pending',
  'pre_authorized',
  'in_escrow',
  'delivery_submitted',
  'disputed',
]);

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function monthKeyFromDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleString('en-US', { month: 'short' }),
  };
}

export function formatBrandAmount(value?: number) {
  if (!value) return '₹0';
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
}

export function deriveBrandDashboard(
  profile: BrandDashboardProfile | null | undefined,
  campaigns: CampaignListItem[],
): BrandDashboard {
  const activeCampaigns = campaigns.filter((campaign) =>
    ACTIVE_CAMPAIGN_STATUSES.has(campaign.status),
  );
  const totalSpend = campaigns.reduce((sum, campaign) => sum + (campaign.price_offered ?? 0), 0);
  const groupedSpend = new Map<string, { month: string; amount: number }>();

  campaigns.forEach((campaign) => {
    const month = monthKeyFromDate(campaign.created_at);
    if (!month) return;
    const existing = groupedSpend.get(month.key);
    groupedSpend.set(month.key, {
      month: month.label,
      amount: (existing?.amount ?? 0) + (campaign.price_offered ?? 0),
    });
  });

  const profileComplete =
    hasText(profile?.brand_name) && hasText(profile?.brand_type) && hasText(profile?.brand_summary);
  const instagramConnected = Boolean(profile?.instagram_connected);
  const hasFirstCampaign = campaigns.length >= 1;
  const hasFiveCampaigns = campaigns.length >= 5;

  const readinessItems: BrandReadinessItem[] = [
    { id: 'profile', label: 'Profile complete', complete: profileComplete },
    { id: 'instagram', label: 'Instagram connected', complete: instagramConnected },
    { id: 'first_campaign', label: 'First campaign launched', complete: hasFirstCampaign },
    { id: 'five_campaigns', label: '5 campaigns shipped', complete: hasFiveCampaigns },
  ];
  const completeCount = readinessItems.filter((item) => item.complete).length;

  let nextAction: BrandDashboard['nextAction'] = {
    label: 'Discover creators',
    route: '/(app)/(brand-tabs)/discover',
  };
  if (!profileComplete) {
    nextAction = { label: 'Finish brand profile', route: '/(app)/profile/edit' };
  } else if (!instagramConnected) {
    nextAction = { label: 'Connect Instagram', route: '/(app)/profile/instagram' };
  } else if (!hasFirstCampaign) {
    nextAction = { label: 'Find your first creator', route: '/(app)/(brand-tabs)/discover' };
  }

  return {
    activeCampaigns,
    totalCampaigns: campaigns.length,
    totalSpend,
    monthlySpend: Array.from(groupedSpend.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value),
    readinessItems,
    readinessPercent: Math.round((completeCount / readinessItems.length) * 100),
    nextAction,
  };
}
