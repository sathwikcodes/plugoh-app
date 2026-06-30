import { GlassCard } from '@/components/ui/glass-card';
import { BackHeader } from '@/components/ui/app-header';
import { Screen } from '@/components/ui/primitives';
import { AsyncText, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useBootstrap, useInfluencerProfile, usePayout } from '@/hooks/use-marketplace';
import { unregisterPush } from '@/lib/api/endpoints';
import { logout } from '@/lib/auth/logout';
import { influencerProfileImageUri } from '@/lib/influencer/profile-image';
import {
  getPushNotificationsPreference,
  setPushNotificationsPreference,
} from '@/lib/notifications/preference';
import {
  isPushRegistrationSupported,
  registerForPushNotificationsAsync,
} from '@/lib/notifications/register';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import bellImage from '@/assets/images/bell.png';
import cardImage from '@/assets/images/card.png';
import coinImage from '@/assets/images/coin.png';
import ghostImage from '@/assets/images/ghost.png';
import instagramImage from '@/assets/images/instagram.png';
import { Ionicons } from '@expo/vector-icons';
import type { PayoutUpsert } from '@plugoh/contracts';
import * as Notifications from 'expo-notifications';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type ImageSourcePropType,
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
  if (!data) return 'Add payout destination';
  if (data.upi_id) return `UPI · ${data.upi_id}`;
  if (data.bank_account_no) return `Bank · ····${data.bank_account_no.slice(-4)}`;
  return 'Add payout destination';
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

function profileLocationLine(data?: { city?: string | null }) {
  const city = data?.city?.trim();
  if (!city) return '';
  return /india$/i.test(city) ? city : `${city}, India`;
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

function SettingRow({
  iconSource,
  title,
  subtitle,
  subtitleLoading,
  onPress,
  first,
}: {
  iconSource: ImageSourcePropType;
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
        <View style={styles.assetIconSlot}>
          <Image
            source={iconSource}
            style={styles.assetIcon}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
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
      <View style={styles.assetIconSlot}>
        <Image
          source={bellImage}
          style={styles.assetIcon}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
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
  const email = bootstrap.data?.user.email?.trim();
  const profileImageUri = influencerProfileImageUri(data);

  const starterPrice = data?.price_per_story ?? data?.price_per_post ?? data?.price_per_reel;
  const pricingSet = starterPrice != null && starterPrice > 0;
  const pricingSubtitle = pricingSet ? `Starts at ${fmtINR(starterPrice)}` : 'Add your rates';
  const profileLocation = profileLocationLine(data);

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
      <BackHeader
        title="Profile"
        onBack={() => {
          router.back();
        }}
        style={styles.pageHeaderRow}
      />

      {/* ── profile row ── */}
      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          {profileImageUri ? (
            <Image source={{ uri: profileImageUri }} style={styles.avatar} />
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
          {email ? (
            <Text style={styles.profileEmail} numberOfLines={1} selectable>
              {email}
            </Text>
          ) : bootstrapLoading ? (
            <ShimmerText width="58%" height={14} />
          ) : null}
          {profileLocation ? (
            <Text style={styles.profileSub} numberOfLines={1}>
              {profileLocation}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionDivider} />

      {/* ── Account section ── */}
      <Text style={styles.sectionHeader}>Account</Text>
      <GlassCard style={styles.glassSettingsShell} contentStyle={styles.settingsGroupInner}>
        <SettingRow
          iconSource={ghostImage}
          title="Personal Information"
          subtitle={data?.display_name || 'Add your name'}
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/edit');
          }}
          first
        />
        <SettingRow
          iconSource={coinImage}
          title="Pricing"
          subtitle={pricingSubtitle}
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/pricing');
          }}
        />
        <SettingRow
          iconSource={instagramImage}
          title="Instagram"
          subtitle={
            data?.instagram_connected && data.ig_username
              ? `Connected as @${data.ig_username}`
              : 'Connect to unlock discovery'
          }
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/instagram');
          }}
        />
        <SettingRow
          iconSource={cardImage}
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
    marginBottom: theme.spacing.xs,
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
    ...theme.typography.headline,
    fontWeight: '700',
    color: theme.colors.rose,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  profileSub: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.5)',
  },
  profileEmail: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.62)',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  // ── settings group ──
  sectionHeader: {
    ...theme.typography.callout,
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
  assetIconSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assetIcon: {
    width: 34,
    height: 34,
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
    marginHorizontal: theme.spacing.xxl,
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
