import { describe, expect, it } from 'vitest';
import {
  formatCompactMetric,
  formatPaiseAsINR,
  getTierBadgeCatalog,
  getTierDisplay,
  resolveHomeBadges,
  TIER_ORDER,
} from '@/lib/influencer/home-tier';

describe('influencer home tier helpers', () => {
  it('formats paise-backed earnings as INR', () => {
    expect(formatPaiseAsINR(1234567)).toBe('₹12,346');
    expect(formatPaiseAsINR(null)).toBe('₹0');
    expect(formatPaiseAsINR(Number.NaN)).toBe('₹0');
  });

  it('formats compact social metrics', () => {
    expect(formatCompactMetric(25000)).toBe('25K');
    expect(formatCompactMetric(1200000)).toBe('1.2M');
    expect(formatCompactMetric(undefined)).toBe('0');
  });

  it('clamps tier progress and falls back to nano', () => {
    expect(getTierDisplay('micro', 1.3)).toMatchObject({
      label: 'Micro',
      nextLabel: 'Mid',
      progress: 1,
      progressPercent: 100,
    });
    expect(getTierDisplay(null, -1)).toMatchObject({
      key: 'nano',
      label: 'Nano',
      progress: 0,
      progressPercent: 0,
    });
  });

  it('resolves badge placeholders from existing profile and earnings fields', () => {
    expect(
      resolveHomeBadges(
        { instagram_connected: true, price_per_reel_paise: 150000, is_active: true },
        { tier_progress: 1 },
      ),
    ).toEqual([
      { key: 'instagram', label: 'IG Linked', unlocked: true },
      { key: 'pricing', label: 'Rate Set', unlocked: true },
      { key: 'active', label: 'Active', unlocked: true },
      { key: 'milestone', label: 'Milestone', unlocked: true },
    ]);
  });

  it('keeps missing fields in safe locked/default states', () => {
    expect(resolveHomeBadges(null, null)).toEqual([
      { key: 'instagram', label: 'IG Linked', unlocked: false },
      { key: 'pricing', label: 'Rate Set', unlocked: false },
      { key: 'active', label: 'Active', unlocked: true },
      { key: 'milestone', label: 'Milestone', unlocked: false },
    ]);
  });

  it('keeps tier badge catalog ordered for the carousel', () => {
    expect(getTierBadgeCatalog('nano').map((item) => item.key)).toEqual([...TIER_ORDER]);
  });

  it('marks current and future tier badges for locked carousel states', () => {
    expect(
      getTierBadgeCatalog('mid').map(({ key, current, unlocked, lockedLabel }) => ({
        key,
        current,
        unlocked,
        lockedLabel,
      })),
    ).toEqual([
      { key: 'nano', current: false, unlocked: true, lockedLabel: 'Unlocked' },
      { key: 'micro', current: false, unlocked: true, lockedLabel: 'Unlocked' },
      { key: 'mid', current: true, unlocked: true, lockedLabel: 'Unlocked' },
      { key: 'macro', current: false, unlocked: false, lockedLabel: 'Reach Macro' },
    ]);
  });
});
