import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: {
    select: <T>(options: { default?: T; ios?: T; android?: T }) =>
      options.default ?? options.ios ?? options.android,
  },
}));

import { theme } from '@/constants/theme';

describe('mobile typography tokens', () => {
  it('keeps default body copy comfortably readable', () => {
    expect(theme.typography.body.fontSize).toBeGreaterThanOrEqual(16);
    expect(theme.typography.body.lineHeight).toBeGreaterThan(theme.typography.body.fontSize);
  });

  it('keeps the smallest text token explicit for micro UI only', () => {
    expect(theme.typography.labelSmall.fontSize).toBe(11);
    expect(theme.typography.label.fontSize).toBeGreaterThan(theme.typography.labelSmall.fontSize);
    expect(theme.typography.caption.fontSize).toBeGreaterThan(theme.typography.label.fontSize);
  });

  it('uses readable line-height ratios across the semantic scale', () => {
    const scalableTokens = [
      theme.typography.display,
      theme.typography.title,
      theme.typography.headline,
      theme.typography.section,
      theme.typography.cardTitle,
      theme.typography.body,
      theme.typography.bodyStrong,
      theme.typography.callout,
      theme.typography.caption,
      theme.typography.label,
      theme.typography.labelSmall,
    ];

    for (const token of scalableTokens) {
      expect(token.lineHeight).toBeGreaterThan(token.fontSize);
      expect(token.lineHeight / token.fontSize).toBeGreaterThanOrEqual(1.2);
    }
  });

  it('uses tabular figures for numeric typography roles', () => {
    expect(theme.typography.metric.fontVariant).toContain('tabular-nums');
    expect(theme.typography.metricSmall.fontVariant).toContain('tabular-nums');
    expect(theme.typography.mono.fontVariant).toContain('tabular-nums');
  });
});
