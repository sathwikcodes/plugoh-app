import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type ScrollViewProps, type TextInputProps, type ViewProps } from "react-native";
import { theme, statusTone } from "@/constants/theme";

export function Screen({ children, contentContainerStyle, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      {...props}
      style={[styles.screen, props.style]}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function ScreenShell({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.shell}>
      <View style={styles.shellHeader}>
        <View style={styles.shellTitleWrap}>
          <Text style={styles.shellTitle}>{title}</Text>
          {subtitle ? <Text style={styles.shellSubtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View {...props} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function AccentHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <LinearGradient
      colors={[theme.colors.rose, theme.colors.pink, theme.colors.peach]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

export function PrimaryButton({ label, style, ...props }: PressableProps & { label: string }) {
  return (
    <Pressable {...props} style={[styles.button, typeof style === "function" ? undefined : style]}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, style, ...props }: PressableProps & { label: string }) {
  return (
    <Pressable {...props} style={[styles.secondaryButton, typeof style === "function" ? undefined : style]}>
      <Text style={styles.secondaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function LabeledField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...props} style={[styles.field, props.style]} placeholderTextColor={theme.colors.muted} />
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.listRow, pressed ? styles.listRowPressed : null]}
      >
        <View style={styles.listRowBody}>
          <Text style={styles.listRowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.listRowSubtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </Pressable>
    );
  }
  return (
    <View style={styles.listRow}>
      <View style={styles.listRowBody}>
        <Text style={styles.listRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Card>
  );
}

export function StatusChip({ label, status }: { label: string; status?: string }) {
  const tone = statusTone(status);
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.chipLabel, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <Card style={styles.centerCard}>
      <ActivityIndicator color={theme.colors.accentStrong} />
      <Text style={styles.stateText}>{label}</Text>
    </Card>
  );
}

export function ErrorState({
  title,
  subtitle,
  onRetry,
}: {
  title: string;
  subtitle?: string;
  onRetry?: () => void;
}) {
  return (
    <Card style={styles.centerCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {onRetry ? <PrimaryButton label="Retry" onPress={onRetry} /> : null}
    </Card>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenContent: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  shell: {
    gap: theme.spacing.lg,
  },
  shellHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  shellTitleWrap: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  shellTitle: {
    ...theme.typography.title,
    color: theme.colors.foreground,
  },
  shellSubtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  card: {
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    ...theme.shadow.card,
  },
  sectionHeader: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    ...theme.typography.label,
    color: theme.colors.accentStrong,
    textTransform: "uppercase",
  },
  sectionTitle: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  hero: {
    borderRadius: theme.radius.sheet,
    padding: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  heroTitle: {
    ...theme.typography.display,
    color: theme.colors.white,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.white,
  },
  button: {
    minHeight: 50,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.foreground,
    paddingHorizontal: theme.spacing.xxl,
  },
  buttonLabel: {
    color: theme.colors.white,
    ...theme.typography.cardTitle,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xxl,
  },
  secondaryButtonLabel: {
    color: theme.colors.foreground,
    ...theme.typography.cardTitle,
  },
  fieldWrap: {
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    ...theme.typography.label,
    color: theme.colors.foreground,
  },
  field: {
    minHeight: 48,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: theme.spacing.lg,
    color: theme.colors.foreground,
    ...theme.typography.body,
  },
  listRow: {
    minHeight: 58,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  listRowPressed: {
    backgroundColor: theme.colors.surfaceWarm,
  },
  listRowBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  listRowTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  listRowSubtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  statTile: {
    minWidth: 120,
  },
  statLabel: {
    ...theme.typography.label,
    color: theme.colors.muted,
  },
  statValue: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  chip: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  chipLabel: {
    ...theme.typography.label,
  },
  centerCard: {
    alignItems: "center",
  },
  stateText: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  emptyCard: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.surfaceBlush,
  },
  emptyTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
});
