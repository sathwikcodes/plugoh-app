import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  StyleSheet: {
    create: <T>(styles: T) => styles,
  },
  Text: 'Text',
  View: 'View',
}));

vi.mock('@/components/ui/glass-circle-button', () => ({
  GlassCircleButton: 'GlassCircleButton',
}));

vi.mock('@/components/ui/native-icon-button', () => ({
  NativeIconButton: 'NativeIconButton',
}));

vi.mock('@/constants/theme', () => ({
  theme: {
    colors: {
      foreground: '#FFFFFF',
    },
    spacing: {
      md: 12,
      lg: 16,
    },
    typography: {
      display: {
        fontFamily: 'system',
        fontSize: 32,
        lineHeight: 39,
        fontWeight: '800',
        letterSpacing: 0,
      },
    },
  },
}));

import {
  APP_HEADER_ACTION_SIZE,
  APP_HEADER_ACTION_SYMBOL_SIZE,
  APP_HEADER_HEIGHT,
  APP_HEADER_HORIZONTAL_PADDING,
  APP_HEADER_PROFILE_GLASS_RENDERING,
  APP_HEADER_SCREEN_TOP_PADDING,
} from '@/components/ui/app-header';

describe('app header tokens', () => {
  it('keeps header controls on the compact shared visual size', () => {
    expect(APP_HEADER_HEIGHT).toBe(40);
    expect(APP_HEADER_ACTION_SIZE).toBe(40);
    expect(APP_HEADER_ACTION_SYMBOL_SIZE).toBe(18);
    expect(APP_HEADER_HEIGHT).toBeGreaterThanOrEqual(APP_HEADER_ACTION_SIZE);
  });

  it('keeps title rows edge-aligned with the screen gutter', () => {
    expect(APP_HEADER_HORIZONTAL_PADDING).toBe(2);
  });

  it('keeps top-level headers on one safe-area offset', () => {
    expect(APP_HEADER_SCREEN_TOP_PADDING).toBe(0);
  });

  it('keeps profile buttons on the shared Expo blur rendering', () => {
    expect(APP_HEADER_PROFILE_GLASS_RENDERING).toBe('blur');
  });
});
