import type { TextStyle } from 'react-native';
import {
  fontBody,
  fontBodyBold,
  fontBodyMedium,
  fontBodyStrong,
  fontDisplay,
  fontDisplayStrong,
  fontMono,
} from './app-fonts';

const tabularNums: NonNullable<TextStyle['fontVariant']> = ['tabular-nums'];

export const theme = {
  colors: {
    background: '#050509',
    surface: '#111111',
    surfaceWarm: '#131110',
    surfaceBlush: '#120F12',
    foreground: '#FFFFFF',
    muted: '#FFFFFF',
    border: '#1E1C1A',
    borderStrong: '#2E2A27',
    rose: '#E76A92',
    pink: '#F28EAF',
    peach: '#F5C0A6',
    accentStrong: '#D4587F',
    accentSoft: '#280F1A',
    success: '#2FA46F',
    successSoft: '#0B1E14',
    pending: '#D7A323',
    pendingSoft: '#1E1608',
    warning: '#D48B32',
    warningSoft: '#1E1408',
    danger: '#D35353',
    dangerSoft: '#1F0F0F',
    info: '#5C84D6',
    infoSoft: '#0F1626',
    white: '#FFFFFF',
    buttonPrimary: '#FFFFFF',
    buttonPrimaryText: '#0D0D0D',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    section: 32,
    hero: 40,
    jumbo: 56,
  },
  radius: {
    chip: 12,
    card: 8,
    sheet: 16,
    pill: 999,
  },
  typography: {
    display: {
      fontFamily: fontDisplay,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    title: {
      fontFamily: fontDisplay,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    headline: {
      fontFamily: fontDisplay,
      fontSize: 23,
      lineHeight: 29,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    section: {
      fontFamily: fontDisplay,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    cardTitle: {
      fontFamily: fontBodyStrong,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    body: {
      fontFamily: fontBody,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    bodyStrong: {
      fontFamily: fontBodyStrong,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    callout: {
      fontFamily: fontBodyMedium,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    caption: {
      fontFamily: fontBodyMedium,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    label: {
      fontFamily: fontBodyStrong,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    labelSmall: {
      fontFamily: fontBodyStrong,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    metric: {
      fontFamily: fontDisplayStrong,
      fontSize: 34,
      lineHeight: 39,
      fontWeight: '700' as const,
      letterSpacing: 0,
      fontVariant: tabularNums,
    },
    metricSmall: {
      fontFamily: fontBodyBold,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as const,
      letterSpacing: 0,
      fontVariant: tabularNums,
    },
    mono: {
      fontFamily: fontMono,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600' as const,
      fontVariant: tabularNums,
    },
  },
  shadow: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

export type Theme = typeof theme;

export const Colors = {
  light: {
    text: theme.colors.foreground,
    background: theme.colors.background,
    tint: theme.colors.accentStrong,
    icon: theme.colors.muted,
    tabIconDefault: theme.colors.muted,
    tabIconSelected: theme.colors.accentStrong,
  },
  dark: {
    text: theme.colors.foreground,
    background: theme.colors.background,
    tint: theme.colors.accentStrong,
    icon: theme.colors.muted,
    tabIconDefault: theme.colors.muted,
    tabIconSelected: theme.colors.accentStrong,
  },
};

/** Mirrors `app-fonts` for ad-hoc `Text` styles; prefer spreading `theme.typography.*`. */
export const Fonts = {
  display: fontDisplay,
  displayStrong: fontDisplayStrong,
  body: fontBody,
  bodyMedium: fontBodyMedium,
  bodyStrong: fontBodyStrong,
  bodyBold: fontBodyBold,
  mono: fontMono,
};

export {
  fontBody,
  fontBodyBold,
  fontBodyMedium,
  fontBodyStrong,
  fontDisplay,
  fontDisplayStrong,
  fontMono,
} from './app-fonts';

export function statusTone(status?: string) {
  switch (status) {
    case 'completed':
    case 'paid':
    case 'success':
      return { bg: theme.colors.successSoft, fg: theme.colors.success };
    case 'delivery_submitted':
    case 'in_escrow':
    case 'pending':
    case 'payment_pending':
    case 'pre_authorized':
      return { bg: theme.colors.pendingSoft, fg: theme.colors.pending };
    case 'disputed':
    case 'declined':
    case 'expired':
    case 'cancelled':
    case 'refunded':
    case 'failed':
      return { bg: theme.colors.dangerSoft, fg: theme.colors.danger };
    default:
      return { bg: theme.colors.accentSoft, fg: theme.colors.accentStrong };
  }
}
