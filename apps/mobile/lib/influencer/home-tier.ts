import type { EarningsSummary, InfluencerProfileResponse } from '@plugoh/contracts';

export type InfluencerTier = EarningsSummary['tier'];

export type HomeBadgeKey = 'instagram' | 'pricing' | 'active' | 'milestone';
export type TierBadgeEmblem = 'spark' | 'leaf' | 'star' | 'crown';

export type TierBadgeVisual = {
  rim: string;
  face: string;
  accent: string;
  glow: string;
  shadow: string;
  emblem: TierBadgeEmblem;
  material: string;
};

export type TierBadgeCatalogItem = {
  key: InfluencerTier;
  label: string;
  eyebrow: string;
  lockedLabel: string;
  rank: number;
  current: boolean;
  unlocked: boolean;
  visual: TierBadgeVisual;
};

type TierMeta = {
  label: string;
  nextLabel: string;
  eyebrow: string;
  thresholdPaise: number;
  nextThresholdPaise: number | null;
  colors: readonly [string, string, string];
  badge: TierBadgeVisual;
};

export const TIER_ORDER = [
  'nano',
  'micro',
  'mid',
  'macro',
] as const satisfies readonly InfluencerTier[];

const TIER_META: Record<InfluencerTier, TierMeta> = {
  nano: {
    label: 'Nano',
    nextLabel: 'Micro',
    eyebrow: 'Building signal',
    thresholdPaise: 0,
    nextThresholdPaise: 1_000_000,
    colors: ['#9AF4E4', '#87BFFF', '#F6E7B7'],
    badge: {
      rim: '#C7F8FF',
      face: '#67D9F0',
      accent: '#F6E7B7',
      glow: '#7DD3FC',
      shadow: '#1B7FA3',
      emblem: 'spark',
      material: 'Aqua silver',
    },
  },
  micro: {
    label: 'Micro',
    nextLabel: 'Mid',
    eyebrow: 'Trusted creator',
    thresholdPaise: 1_000_000,
    nextThresholdPaise: 10_000_000,
    colors: ['#B6FFCF', '#9AF4E4', '#F4C2FF'],
    badge: {
      rim: '#D6FFE6',
      face: '#65E6B2',
      accent: '#9AF4E4',
      glow: '#7CF6C5',
      shadow: '#137A60',
      emblem: 'leaf',
      material: 'Emerald chrome',
    },
  },
  mid: {
    label: 'Mid',
    nextLabel: 'Macro',
    eyebrow: 'Brand favorite',
    thresholdPaise: 10_000_000,
    nextThresholdPaise: 50_000_000,
    colors: ['#FFD36E', '#FF8EC3', '#A78BFA'],
    badge: {
      rim: '#FFE7A3',
      face: '#F5A74B',
      accent: '#FF8EC3',
      glow: '#FFD36E',
      shadow: '#A25B18',
      emblem: 'star',
      material: 'Rose gold',
    },
  },
  macro: {
    label: 'Macro',
    nextLabel: 'Maxed',
    eyebrow: 'Top tier',
    thresholdPaise: 50_000_000,
    nextThresholdPaise: null,
    colors: ['#FFFFFF', '#FFD36E', '#7DD3FC'],
    badge: {
      rim: '#FFFFFF',
      face: '#E9EDF8',
      accent: '#FFD36E',
      glow: '#F8F7FF',
      shadow: '#8592BC',
      emblem: 'crown',
      material: 'Platinum gold',
    },
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

export function getTierUnlockCopy(
  tier?: InfluencerTier | null,
  totalEarningsPaise?: number | null,
) {
  const resolvedTier = tier ?? DEFAULT_TIER;
  const meta = TIER_META[resolvedTier];

  if (!meta.nextThresholdPaise) {
    return 'Top tier reached';
  }

  const earnedPaise = Number.isFinite(totalEarningsPaise ?? 0) ? (totalEarningsPaise ?? 0) : 0;
  const remainingPaise = Math.max(meta.nextThresholdPaise - earnedPaise, 0);

  return `Earn ${formatPaiseAsINR(remainingPaise)} more to unlock ${meta.nextLabel}`;
}

export function getTierRank(tier?: InfluencerTier | null) {
  const resolvedTier = tier ?? DEFAULT_TIER;
  const rank = TIER_ORDER.indexOf(resolvedTier);
  return rank >= 0 ? rank : 0;
}

export function getTierBadgeCatalog(currentTier?: InfluencerTier | null): TierBadgeCatalogItem[] {
  const currentRank = getTierRank(currentTier);

  return TIER_ORDER.map((tier, rank) => {
    const meta = TIER_META[tier];
    return {
      key: tier,
      label: meta.label,
      eyebrow: meta.eyebrow,
      lockedLabel: rank > currentRank ? `Reach ${meta.label}` : 'Unlocked',
      rank,
      current: rank === currentRank,
      unlocked: rank <= currentRank,
      visual: meta.badge,
    };
  });
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
