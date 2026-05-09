export const theme = {
  colors: {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceWarm: "#FFF9F7",
    surfaceBlush: "#FFF7FA",
    foreground: "#352822",
    muted: "#7D6A63",
    border: "#F0E6DE",
    borderStrong: "#DEC9C3",
    rose: "#E76A92",
    pink: "#F28EAF",
    peach: "#F5C0A6",
    accentStrong: "#C74C72",
    accentSoft: "#FFF1F6",
    success: "#2FA46F",
    successSoft: "#EFFAF4",
    pending: "#D7A323",
    pendingSoft: "#FFF8E6",
    warning: "#D48B32",
    warningSoft: "#FFF4EA",
    danger: "#D35353",
    dangerSoft: "#FFF1F1",
    info: "#5C84D6",
    infoSoft: "#F2F6FF",
    white: "#FFFFFF",
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
      fontWeight: "700" as const,
      letterSpacing: 0,
    },
    title: {
      fontSize: 28,
      lineHeight: 30,
      fontWeight: "700" as const,
      letterSpacing: 0,
    },
    section: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "700" as const,
      letterSpacing: 0,
    },
    cardTitle: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "700" as const,
      letterSpacing: 0,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "400" as const,
      letterSpacing: 0,
    },
    label: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600" as const,
      letterSpacing: 0,
    },
    mono: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "600" as const,
      fontVariant: ["tabular-nums"] as any,
    },
  },
  shadow: {
    card: {
      shadowColor: "#B78687",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
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
  sans: "System",
  serif: "System",
  rounded: "System",
  mono: "Courier",
};

export function statusTone(status?: string) {
  switch (status) {
    case "completed":
    case "paid":
    case "success":
      return { bg: theme.colors.successSoft, fg: theme.colors.success };
    case "delivery_submitted":
    case "in_escrow":
    case "pending":
    case "payment_pending":
    case "pre_authorized":
      return { bg: theme.colors.pendingSoft, fg: theme.colors.pending };
    case "disputed":
    case "declined":
    case "expired":
    case "cancelled":
    case "refunded":
    case "failed":
      return { bg: theme.colors.dangerSoft, fg: theme.colors.danger };
    default:
      return { bg: theme.colors.accentSoft, fg: theme.colors.accentStrong };
  }
}
