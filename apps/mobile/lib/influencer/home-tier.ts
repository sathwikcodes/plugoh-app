import type { EarningsSummary, InfluencerProfileResponse } from '@plugoh/contracts';

export type InfluencerTier = EarningsSummary['tier'];

export type HomeBadgeKey = 'instagram' | 'pricing' | 'active' | 'milestone';

type TierMeta = {
  label: string;
  nextLabel: string;
  eyebrow: string;
  colors: readonly [string, string, string];
};

const TIER_META: Record<InfluencerTier, TierMeta> = {
  nano: {
    label: 'Nano',
    nextLabel: 'Micro',
    eyebrow: 'Building signal',
    colors: ['#9AF4E4', '#87BFFF', '#F6E7B7'],
  },
  micro: {
    label: 'Micro',
    nextLabel: 'Mid',
    eyebrow: 'Trusted creator',
    colors: ['#B6FFCF', '#9AF4E4', '#F4C2FF'],
  },
  mid: {
    label: 'Mid',
    nextLabel: 'Macro',
    eyebrow: 'Brand favorite',
    colors: ['#FFD36E', '#FF8EC3', '#A78BFA'],
  },
  macro: {
    label: 'Macro',
    nextLabel: 'Maxed',
    eyebrow: 'Top tier',
    colors: ['#FFFFFF', '#FFD36E', '#7DD3FC'],
  },
};

const DEFAULT_TIER: InfluencerTier = 'nano';

export function formatPaiseAsINR(value?: number | null) {
  const paise = value ?? 0;
  const rupees = Number.isFinite(paise) ? paise / 100 : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatCompactMetric(value?: number | null) {
  const number = value ?? 0;
  if (!Number.isFinite(number) || number <= 0) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: number >= 10000 ? 1 : 0,
  }).format(number);
}

export function getTierDisplay(tier?: InfluencerTier | null, rawProgress?: number | null) {
  const resolvedTier = tier ?? DEFAULT_TIER;
  const progress = Math.min(Math.max(rawProgress ?? 0, 0), 1);
  const meta = TIER_META[resolvedTier];

  return {
    key: resolvedTier,
    label: meta.label,
    nextLabel: meta.nextLabel,
    eyebrow: meta.eyebrow,
    colors: meta.colors,
    progress,
    progressPercent: Math.round(progress * 100),
    progressLabel:
      resolvedTier === 'macro'
        ? 'Top tier reached'
        : `${Math.round(progress * 100)}% to ${meta.nextLabel}`,
  };
}

export function resolveHomeBadges(
  profile?: Pick<
    InfluencerProfileResponse,
    'instagram_connected' | 'price_per_reel_paise' | 'is_active'
  > | null,
  earnings?: Pick<EarningsSummary, 'tier_progress'> | null,
) {
  const hasPricing = (profile?.price_per_reel_paise ?? 0) > 0;
  const progress = Math.min(Math.max(earnings?.tier_progress ?? 0, 0), 1);

  return [
    {
      key: 'instagram' as const,
      label: 'IG Linked',
      unlocked: Boolean(profile?.instagram_connected),
    },
    {
      key: 'pricing' as const,
      label: 'Rate Set',
      unlocked: hasPricing,
    },
    {
      key: 'active' as const,
      label: 'Active',
      unlocked: profile?.is_active !== false,
    },
    {
      key: 'milestone' as const,
      label: 'Milestone',
      unlocked: progress >= 1,
    },
  ];
}
