import type { TextStyle } from 'react-native';

const tabularNums: NonNullable<TextStyle['fontVariant']> = ['tabular-nums'];

export const theme = {
  colors: {
    background: '#000000',
    surface: '#111111',
    surfaceWarm: '#131110',
    surfaceBlush: '#120F12',
    foreground: '#F2EDE8',
    muted: '#9A8A83',
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
      fontSize: 34,
      lineHeight: 36,
      fontWeight: '700' as const,
      letterSpacing: 0,
    },
    title: {
      fontSize: 28,
      lineHeight: 30,
      fontWeight: '700' as const,
      letterSpacing: 0,
    },
    section: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '700' as const,
      letterSpacing: 0,
    },
    cardTitle: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '700' as const,
      letterSpacing: 0,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    label: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    mono: {
      fontSize: 15,
      lineHeight: 20,
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

export const Fonts = {
  sans: 'System',
  serif: 'System',
  rounded: 'System',
  mono: 'Courier',
};

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
