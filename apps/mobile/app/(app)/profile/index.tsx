import { NativeIconButton } from '@/components/ui/native-icon-button';
import { Card, Screen } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useInfluencerProfile, usePayout } from '@/hooks/use-marketplace';
import { logout } from '@/lib/auth/logout';
import { Ionicons } from '@expo/vector-icons';
import type { EarningsSummary, PayoutUpsert } from '@plugoh/contracts';
import { router } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

// ─── tier config ──────────────────────────────────────────────────────────────

type Tier = EarningsSummary['tier'];

const TIER = {
  nano: { label: 'Nano', color: theme.colors.info, bg: theme.colors.infoSoft },
  micro: { label: 'Micro', color: theme.colors.success, bg: theme.colors.successSoft },
  mid: { label: 'Mid', color: theme.colors.pending, bg: theme.colors.pendingSoft },
  macro: { label: 'Macro', color: theme.colors.rose, bg: theme.colors.accentSoft },
} satisfies Record<Tier, { label: string; color: string; bg: string }>;

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name?: string) {
  if (!name) return 'C';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function payoutSubtitle(data?: PayoutUpsert | null): string {
  if (!data) return 'Not set up';
  if (data.upi_id) return `UPI · ${data.upi_id}`;
  if (data.bank_account_no) return `Bank · ····${data.bank_account_no.slice(-4)}`;
  return 'Not set up';
}

// ─── MenuRow ──────────────────────────────────────────────────────────────────

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  first,
  last,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <>
      {!first && <View style={styles.divider} />}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.menuRow,
          first && styles.menuRowFirst,
          last && styles.menuRowLast,
          pressed && styles.menuRowPressed,
        ]}
      >
        <View style={styles.menuLeft}>
          <Ionicons name={icon as never} size={20} color={theme.colors.muted} />
          <Text style={styles.menuTitle}>{title}</Text>
        </View>
        <View style={styles.menuRight}>
          {subtitle ? (
            <Text style={styles.menuSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
        </View>
      </Pressable>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const profile = useInfluencerProfile();
  const payout = usePayout();
  const data = profile.data;

  const tier: Tier = (data as { tier?: Tier } | undefined)?.tier ?? 'nano';
  const tierCfg = TIER[tier];

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await logout();
            router.replace('/(auth)/login');
          })();
        },
      },
    ]);
  };

  return (
    <Screen>
      {/* ── header ── */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <NativeIconButton
          symbol="gearshape"
          fallbackIcon="settings-outline"
          variant="glass"
          haptic="light"
          size={44}
          symbolSize={20}
          onPress={() => {
            router.push('/(app)/profile/settings');
          }}
        />
      </View>

      {/* ── avatar hero ── */}
      <View style={styles.heroSection}>
        <Pressable
          onPress={() => {
            router.push('/(app)/profile/edit');
          }}
          style={styles.avatarWrap}
        >
          {data?.profile_photo_url ? (
            <Image
              source={{ uri: data.profile_photo_url }}
              style={[styles.avatar, { borderColor: tierCfg.color }]}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { borderColor: tierCfg.color }]}>
              <Text style={styles.avatarInitials}>{initials(data?.display_name)}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color={theme.colors.muted} />
          </View>
        </Pressable>

        <Text style={styles.displayName}>{data?.display_name ?? 'Your Name'}</Text>

        {data?.ig_username ? (
          <Text style={styles.igHandle}>@{data.ig_username}</Text>
        ) : (
          <Pressable
            onPress={() => {
              router.push('/(app)/profile/instagram');
            }}
          >
            <Text style={styles.igConnect}>Connect Instagram</Text>
          </Pressable>
        )}

        <View style={[styles.tierBadge, { backgroundColor: tierCfg.bg }]}>
          <Text style={[styles.tierLabel, { color: tierCfg.color }]}>{tierCfg.label}</Text>
        </View>
      </View>

      {/* ── Profile group ── */}
      <Text style={styles.groupLabel}>Profile</Text>
      <Card style={styles.group}>
        <MenuRow
          icon="person-outline"
          title="Edit Profile"
          subtitle={data?.display_name ?? 'Add your name'}
          onPress={() => {
            router.push('/(app)/profile/edit');
          }}
          first
        />
        <MenuRow
          icon="logo-instagram"
          title="Instagram"
          subtitle={
            data?.instagram_connected && data.ig_username ? `@${data.ig_username}` : 'Not connected'
          }
          onPress={() => {
            router.push('/(app)/profile/instagram');
          }}
        />
        <MenuRow
          icon="pricetag-outline"
          title="Pricing"
          subtitle={data?.price_per_reel ? `$${data.price_per_reel} / reel` : 'Set your rates'}
          onPress={() => {
            router.push('/(app)/profile/pricing');
          }}
          last
        />
      </Card>

      {/* ── Payments group ── */}
      <Text style={styles.groupLabel}>Payments</Text>
      <Card style={styles.group}>
        <MenuRow
          icon="card-outline"
          title="Payout"
          subtitle={payoutSubtitle(payout.data)}
          onPress={() => {
            router.push('/(app)/profile/payout');
          }}
          first
          last
        />
      </Card>

      {/* ── Settings group ── */}
      <Text style={styles.groupLabel}>Settings</Text>
      <Card style={styles.group}>
        <MenuRow
          icon="notifications-outline"
          title="Notifications"
          onPress={() => {
            router.push('/(app)/profile/settings');
          }}
          first
          last
        />
      </Card>

      {/* ── Sign out ── */}
      <Pressable
        onPress={handleSignOut}
        style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 44,
  },
  heroSection: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: theme.spacing.xs,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
  },
  avatarFallback: {
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.rose,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    ...theme.typography.title,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  igHandle: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  igConnect: {
    ...theme.typography.body,
    color: theme.colors.rose,
  },
  tierBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  tierLabel: {
    ...theme.typography.label,
    fontWeight: '700',
  },
  groupLabel: {
    ...theme.typography.label,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -theme.spacing.xs,
  },
  group: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 54,
  },
  menuRowFirst: {
    borderTopLeftRadius: theme.radius.card,
    borderTopRightRadius: theme.radius.card,
  },
  menuRowLast: {
    borderBottomLeftRadius: theme.radius.card,
    borderBottomRightRadius: theme.radius.card,
  },
  menuRowPressed: {
    backgroundColor: theme.colors.surfaceWarm,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  menuTitle: {
    ...theme.typography.body,
    color: theme.colors.foreground,
    fontWeight: '500',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    maxWidth: 140,
  },
  menuSubtitle: {
    ...theme.typography.label,
    color: theme.colors.muted,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.lg + 20 + theme.spacing.md,
  },
  signOut: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  signOutText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    fontWeight: '600',
  },
});
