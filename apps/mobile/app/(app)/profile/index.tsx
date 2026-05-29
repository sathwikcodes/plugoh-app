import { GlassCard } from '@/components/ui/glass-card';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { Screen } from '@/components/ui/primitives';
import { AsyncText, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useBootstrap, useInfluencerProfile, usePayout } from '@/hooks/use-marketplace';
import { unregisterPush } from '@/lib/api/endpoints';
import { logout } from '@/lib/auth/logout';
import {
  getPushNotificationsPreference,
  setPushNotificationsPreference,
} from '@/lib/notifications/preference';
import {
  isPushRegistrationSupported,
  registerForPushNotificationsAsync,
} from '@/lib/notifications/register';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { Ionicons } from '@expo/vector-icons';
import type { PayoutUpsert } from '@plugoh/contracts';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  type AppStateStatus,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

/** Grouped settings under Account / Preferences — matches shell corner radius. */
const SETTINGS_GROUP_RADIUS = 28;

/** Danger-tinted wash on sign-out glass (theme `danger` hue). */
const SIGN_OUT_GLASS_TINT = 'rgba(211, 83, 83, 0.28)';
const SIGN_OUT_GLASS_BORDER = 'rgba(211, 83, 83, 0.58)';

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

const fmtINR = (n?: number) =>
  n != null
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n)
    : '—';

// ─── SettingRow ───────────────────────────────────────────────────────────────

function SettingRow({
  iconName,
  iconBg,
  title,
  subtitle,
  subtitleLoading,
  onPress,
  first,
}: {
  iconName: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  subtitleLoading?: boolean;
  onPress: () => void;
  first?: boolean;
}) {
  return (
    <>
      {!first && <View style={styles.insetDivider} />}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.settingRow, pressed && styles.rowPressed]}
      >
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName as never} size={17} color="#fff" />
        </View>
        <View style={styles.settingBody}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitleLoading ? (
            <ShimmerText width="56%" height={13} />
          ) : subtitle ? (
            <Text style={styles.settingSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
      </Pressable>
    </>
  );
}

// ─── NotificationToggleRow ───────────────────────────────────────────────────

function NotificationToggleRow() {
  const supported = isPushRegistrationSupported();
  const [preference, setPreferenceState] = useState(() => getPushNotificationsPreference());
  const [permGranted, setPermGranted] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshPermission = useCallback(async () => {
    try {
      const res = await Notifications.getPermissionsAsync();
      setPermGranted(Boolean((res as { granted?: boolean }).granted));
    } catch {
      setPermGranted(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setPreferenceState(getPushNotificationsPreference());
      void refreshPermission();
    }, [refreshPermission]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void refreshPermission();
    });
    return () => {
      sub.remove();
    };
  }, [refreshPermission]);

  const switchOn = preference && permGranted;

  const handleToggle = async (next: boolean) => {
    if (!supported || busy) return;
    setBusy(true);
    try {
      if (next) {
        setPushNotificationsPreference(true);
        setPreferenceState(true);
        await registerForPushNotificationsAsync();
        await refreshPermission();
      } else {
        setPushNotificationsPreference(false);
        setPreferenceState(false);
        try {
          await unregisterPush();
        } catch {
          // Local opt-out still applies if network fails.
        }
        await refreshPermission();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.settingRow}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.pending }]}>
        <Ionicons name="notifications-outline" size={17} color="#fff" />
      </View>
      <View style={styles.settingBody}>
        <Text style={styles.settingTitle}>Notifications</Text>
        {supported ? (
          <Text style={styles.settingSubtitle} numberOfLines={1}>
            Campaign updates and messages
          </Text>
        ) : null}
      </View>
      <Switch
        value={switchOn}
        onValueChange={handleToggle}
        disabled={!supported || busy}
        trackColor={{
          false: 'rgba(255,255,255,0.14)',
          true: 'rgba(231, 106, 146, 0.55)',
        }}
        thumbColor={
          Platform.OS === 'android' ? (switchOn ? theme.colors.rose : '#f4f3f4') : undefined
        }
        ios_backgroundColor="rgba(255,255,255,0.12)"
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const profile = useInfluencerProfile();
  const bootstrap = useBootstrap();
  const payout = usePayout();
  const data = profile.data;
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const profileLoading = bootstrapLoading || shouldShowInitialLoader(profile);
  const payoutLoading = bootstrapLoading || shouldShowInitialLoader(payout);

  const pricingSet = !!(data?.price_per_reel || data?.price_per_post || data?.price_per_story);
  const pricingSubtitle = pricingSet
    ? `From ${fmtINR(data.price_per_story ?? data.price_per_post ?? data.price_per_reel)}`
    : 'Set your rates';

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
      {/* ── page heading: liquid-glass back + title ── */}
      <View style={styles.pageHeaderRow}>
        <View style={styles.pageBackShadow}>
          <GlassCircleButton
            symbol="chevron.left"
            fallbackIcon="chevron-back"
            tintColor="#FFFFFF"
            size={38}
            symbolSize={17}
            accessibilityLabel="Go back"
            onPress={() => {
              router.back();
            }}
          />
        </View>
        <Text style={styles.pageTitle}>Profile</Text>
      </View>

      {/* ── profile row ── */}
      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          {data?.profile_photo_url ? (
            <Image source={{ uri: data.profile_photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials(data?.display_name)}</Text>
            </View>
          )}
        </View>

        <View style={styles.profileInfo}>
          <AsyncText
            loading={profileLoading}
            value={data?.display_name}
            fallback="Your Name"
            style={styles.profileName}
            shimmerWidth="62%"
            shimmerHeight={22}
          />
          {data?.ig_username ? (
            <Text style={styles.profileSub} numberOfLines={1}>
              @{data.ig_username}
            </Text>
          ) : profileLoading ? (
            <ShimmerText width="38%" height={14} />
          ) : null}
        </View>
      </View>

      <View style={styles.sectionDivider} />

      {/* ── Account section ── */}
      <Text style={styles.sectionHeader}>Account</Text>
      <GlassCard style={styles.glassSettingsShell} contentStyle={styles.settingsGroupInner}>
        <SettingRow
          iconName="person-outline"
          iconBg={theme.colors.info}
          title="Edit Profile"
          subtitle={data?.display_name ?? 'Add your name'}
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/edit');
          }}
          first
        />
        <SettingRow
          iconName="pricetag-outline"
          iconBg={theme.colors.accentStrong}
          title="Pricing"
          subtitle={pricingSubtitle}
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/pricing');
          }}
        />
        <SettingRow
          iconName="logo-instagram"
          iconBg="#C13584"
          title="Instagram"
          subtitle={
            data?.instagram_connected && data.ig_username ? `@${data.ig_username}` : 'Not connected'
          }
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/instagram');
          }}
        />
        <SettingRow
          iconName="card-outline"
          iconBg={theme.colors.success}
          title="Payout"
          subtitle={payoutSubtitle(payout.data)}
          subtitleLoading={payoutLoading}
          onPress={() => {
            router.push('/(app)/profile/payout');
          }}
        />
      </GlassCard>

      {/* ── Preferences section ── */}
      <Text style={styles.sectionHeader}>Preferences</Text>
      <GlassCard style={styles.glassSettingsShell} contentStyle={styles.settingsGroupInner}>
        <NotificationToggleRow />
      </GlassCard>

      {/* ── Sign out ── */}
      <GlassCard
        style={styles.signOutGlassCard}
        contentStyle={styles.settingsGroupInner}
        tintOverlayColor={SIGN_OUT_GLASS_TINT}
      >
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutRow, pressed && styles.rowPressed]}
        >
          <View style={styles.signOutLabelRow}>
            <Ionicons name="log-out-outline" size={16} color={theme.colors.danger} />
            <Text style={styles.signOutTitle}>Sign out</Text>
          </View>
        </Pressable>
      </GlassCard>
    </Screen>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.xs,
  },
  pageBackShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      default: {
        elevation: 8,
      },
    }),
  },
  pageTitle: {
    ...theme.typography.display,
    flex: 1,
    color: theme.colors.foreground,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  rowPressed: {
    opacity: 0.75,
  },
  avatarWrap: {
    flexShrink: 0,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.rose,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    ...theme.typography.cardTitle,
    fontSize: 18,
    color: theme.colors.foreground,
  },
  profileSub: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.5)',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  // ── settings group ──
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginTop: theme.spacing.xs,
    marginBottom: -theme.spacing.xs,
  },
  glassSettingsShell: {
    borderRadius: SETTINGS_GROUP_RADIUS,
    overflow: 'hidden',
  },
  signOutGlassCard: {
    borderRadius: SETTINGS_GROUP_RADIUS,
    marginTop: theme.spacing.sm,
    borderColor: SIGN_OUT_GLASS_BORDER,
    overflow: 'hidden',
  },
  settingsGroupInner: {
    padding: 0,
    gap: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    minHeight: 62,
    gap: theme.spacing.lg,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  settingTitle: {
    ...theme.typography.body,
    color: theme.colors.foreground,
    fontWeight: '500',
  },
  settingSubtitle: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.5)',
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginLeft: theme.spacing.xl + 36 + theme.spacing.lg,
  },
  // ── sign out (glass tab, danger tint) ──
  signOutRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 62,
  },
  signOutLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  signOutTitle: {
    ...theme.typography.body,
    color: theme.colors.danger,
    fontWeight: '600',
  },
});
