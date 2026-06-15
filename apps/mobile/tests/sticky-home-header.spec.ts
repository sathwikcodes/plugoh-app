import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  StyleSheet: {
    create: <T>(styles: T) => styles,
    absoluteFill: {},
    absoluteFillObject: {},
    hairlineWidth: 1,
  },
  View: 'View',
}));

vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
vi.mock('expo-glass-effect', () => ({
  GlassView: 'GlassView',
  isLiquidGlassAvailable: () => false,
}));
vi.mock('@/components/ui/tab-screen-canvas', () => ({
  TabScreenCanvas: 'TabScreenCanvas',
  useTabScreenCanvas: () => false,
}));
vi.mock('react-native-reanimated', () => ({
  default: { ScrollView: 'AnimatedScrollView', View: 'AnimatedView' },
  Extrapolation: { CLAMP: 'clamp' },
  interpolate: () => 0,
  useAnimatedScrollHandler: () => () => {},
  useAnimatedStyle: () => ({}),
  useSharedValue: (initial: number) => ({ value: initial }),
}));
vi.mock('@/components/ui/app-header', () => ({
  APP_HEADER_HEIGHT: 40,
  AppHeader: 'AppHeader',
  getAppHeaderTopPadding: (insetTop: number) => insetTop + 20,
}));
vi.mock('@/constants/theme', () => ({
  theme: {
    colors: { backgroundClear: 'transparent', backgroundDeep: '#120D17' },
    spacing: { sm: 8, lg: 16, xxl: 24 },
  },
}));

import {
  STICKY_HOME_HEADER_BLUR_DISTANCE,
  getStickyHomeHeaderContentPadding,
  getStickyHomeHeaderOverlayHeight,
} from '@/components/ui/sticky-home-header';

describe('sticky home header layout', () => {
  // header zone: insetTop + 20 (getAppHeaderTopPadding) + 40 (APP_HEADER_HEIGHT)
  it('computes overlay height (safe-area + header row)', () => {
    expect(getStickyHomeHeaderOverlayHeight(0)).toBe(60);
    expect(getStickyHomeHeaderOverlayHeight(59)).toBe(119);
  });

  // content padding = overlayHeight + spacing.sm(8)
  it('positions content just below the header with a small gap', () => {
    expect(getStickyHomeHeaderContentPadding(0)).toBe(68); // 60 + 8
    expect(getStickyHomeHeaderContentPadding(59)).toBe(127); // 119 + 8
  });

  it('dissolves the mask over a short scroll distance', () => {
    expect(STICKY_HOME_HEADER_BLUR_DISTANCE).toBe(44);
  });
});
