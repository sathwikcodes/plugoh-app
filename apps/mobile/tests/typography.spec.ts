import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: {
    select: <T>(options: { default?: T; ios?: T; android?: T }) =>
      options.default ?? options.ios ?? options.android,
  },
  Text: {},
  TextInput: {},
}));

import {
  appFontFamilyNames,
  fontBody,
  fontBodyBold,
  fontBodyMedium,
  fontBodyStrong,
  fontDisplay,
  fontDisplayStrong,
  fontMono,
} from '@/constants/app-fonts';
import { theme } from '@/constants/theme';

describe('mobile typography tokens', () => {
  it('keeps default body copy comfortably readable', () => {
    expect(theme.typography.body.fontSize).toBeGreaterThanOrEqual(16);
    expect(theme.typography.body.lineHeight).toBeGreaterThan(theme.typography.body.fontSize);
    expect(
      theme.typography.body.lineHeight / theme.typography.body.fontSize,
    ).toBeGreaterThanOrEqual(1.5);
  });

  it('keeps the smallest text token explicit for micro UI only', () => {
    expect(theme.typography.labelSmall.fontSize).toBe(11);
    expect(theme.typography.label.fontSize).toBeGreaterThan(theme.typography.labelSmall.fontSize);
    expect(theme.typography.caption.fontSize).toBeGreaterThan(theme.typography.label.fontSize);
  });

  it('uses explicit line heights across the semantic scale', () => {
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
    }
  });

  it('loads every exported app font family', async () => {
    const { appFontAssets } = await import('@/constants/app-font-assets');

    expect(Object.keys(appFontAssets).sort()).toEqual([...appFontFamilyNames].sort());
  });

  it('uses the premium Clash Display and Archivo role pairing', () => {
    expect(theme.typography.display.fontFamily).toBe(fontDisplay);
    expect(theme.typography.title.fontFamily).toBe(fontDisplay);
    expect(theme.typography.headline.fontFamily).toBe(fontDisplay);
    expect(theme.typography.section.fontFamily).toBe(fontDisplay);
    expect(theme.typography.metric.fontFamily).toBe(fontDisplayStrong);

    expect(theme.typography.body.fontFamily).toBe(fontBody);
    expect(theme.typography.callout.fontFamily).toBe(fontBodyMedium);
    expect(theme.typography.caption.fontFamily).toBe(fontBodyMedium);
    expect(theme.typography.cardTitle.fontFamily).toBe(fontBodyStrong);
    expect(theme.typography.bodyStrong.fontFamily).toBe(fontBodyStrong);
    expect(theme.typography.label.fontFamily).toBe(fontBodyStrong);
    expect(theme.typography.labelSmall.fontFamily).toBe(fontBodyStrong);
    expect(theme.typography.metricSmall.fontFamily).toBe(fontBodyBold);
    expect(theme.typography.mono.fontFamily).toBe(fontMono);
  });

  it('uses the approved premium type scale', () => {
    expect(theme.typography.display).toMatchObject({ fontSize: 34, lineHeight: 40 });
    expect(theme.typography.title).toMatchObject({ fontSize: 28, lineHeight: 34 });
    expect(theme.typography.headline).toMatchObject({ fontSize: 23, lineHeight: 29 });
    expect(theme.typography.section).toMatchObject({ fontSize: 20, lineHeight: 26 });
    expect(theme.typography.metric).toMatchObject({ fontSize: 34, lineHeight: 39 });
    expect(theme.typography.metricSmall).toMatchObject({ fontSize: 22, lineHeight: 28 });
  });

  it('uses tabular figures for numeric typography roles', () => {
    expect(theme.typography.metric.fontVariant).toContain('tabular-nums');
    expect(theme.typography.metricSmall.fontVariant).toContain('tabular-nums');
    expect(theme.typography.mono.fontVariant).toContain('tabular-nums');
  });
});
