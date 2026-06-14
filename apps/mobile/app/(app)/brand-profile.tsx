import { GlassCard } from '@/components/ui/glass-card';
import { BackHeader } from '@/components/ui/app-header';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useBootstrap, useBusinessProfile } from '@/hooks/use-marketplace';
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
import bellImage from '@/assets/images/bell.png';
import ghostImage from '@/assets/images/ghost.png';
import instagramImage from '@/assets/images/instagram.png';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SETTINGS_GROUP_RADIUS = 28;
const SIGN_OUT_GLASS_TINT = 'rgba(211, 83, 83, 0.28)';
const SIGN_OUT_GLASS_BORDER = 'rgba(211, 83, 83, 0.58)';

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name?: string | null): string {
  if (!name) return 'B';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
            <ShimmerText width="58%" height={13} />
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

// ─── NotificationToggleRow ────────────────────────────────────────────────────

function NotificationToggleRow({ first }: { first?: boolean }) {
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
        await refreshPermission();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!first && <View style={styles.insetDivider} />}
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
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BrandProfileScreen() {
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const profile = useBusinessProfile();
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const profileLoading = bootstrapLoading || shouldShowInitialLoader(profile);

  const igConnected = Boolean(profile.data?.instagram_connected);
  const brandName = profile.data?.brand_name;
  const email = bootstrap.data?.user.email?.trim();

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
    <ScrollView
      style={[styles.root, { backgroundColor: theme.colors.backgroundClear }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <BackHeader
        title="Profile"
        onBack={() => {
          router.back();
        }}
        style={[styles.pageHeaderRow, { paddingTop: insets.top + theme.spacing.md }]}
      />

      {/* ── Profile hero row ── */}
      <View style={styles.profileRow}>
        {profileLoading ? (
          <ShimmerCircle size={72} />
        ) : (
          <LinearGradient
            colors={['#EC4899', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarWrap}
          >
            <Text style={styles.avatarInitials}>{initials(brandName ?? 'Brand Profile')}</Text>
          </LinearGradient>
        )}

        <View style={styles.profileInfo}>
          <AsyncText
            loading={profileLoading}
            value={brandName}
            fallback="Brand Profile"
            style={styles.profileName}
            numberOfLines={1}
            shimmerWidth="62%"
            shimmerHeight={24}
          />
          {email ? (
            <Text style={styles.profileEmail} numberOfLines={1} selectable>
              {email}
            </Text>
          ) : bootstrapLoading ? (
            <ShimmerText width="58%" height={14} />
          ) : null}
          {profile.data?.brand_type ? (
            <Text style={styles.profileSub} numberOfLines={1}>
              {profile.data.brand_type}
            </Text>
          ) : profileLoading ? (
            <ShimmerText width="42%" height={16} />
          ) : null}
          {profile.data?.brand_location ? (
            <Text style={styles.profileLocation} numberOfLines={1}>
              {profile.data.brand_location}
            </Text>
          ) : profileLoading ? (
            <ShimmerText width="34%" height={13} />
          ) : null}
        </View>
      </View>

      <View style={styles.sectionDivider} />

      {/* ── Account settings group ── */}
      <Text style={styles.sectionHeader}>Account</Text>
      <GlassCard
        style={styles.settingsShell}
        contentStyle={{ borderRadius: SETTINGS_GROUP_RADIUS, overflow: 'hidden' }}
      >
        <SettingRow
          first
          iconSource={ghostImage}
          title="Edit Profile"
          subtitle={brandName ?? 'Brand Profile'}
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/edit');
          }}
        />
        <SettingRow
          iconSource={instagramImage}
          title="Instagram"
          subtitle={igConnected ? 'Connected' : 'Not connected'}
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/instagram');
          }}
        />
      </GlassCard>

      {/* ── Preferences group ── */}
      <Text style={styles.sectionHeader}>Preferences</Text>
      <GlassCard
        style={styles.settingsShell}
        contentStyle={{ borderRadius: SETTINGS_GROUP_RADIUS, overflow: 'hidden' }}
      >
        <NotificationToggleRow first />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },

  // Page header
  pageHeaderRow: {
    marginBottom: theme.spacing.sm,
  },

  // Profile row
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  rowPressed: { opacity: 0.75 },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    ...theme.typography.headline,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: { flex: 1, gap: 2 },
  profileName: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  profileEmail: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.62)',
  },
  profileSub: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.55)',
  },
  profileLocation: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.38)',
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: theme.spacing.xs,
  },

  sectionHeader: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingLeft: 4,
    marginTop: theme.spacing.xs,
  },

  // Settings groups
  settingsShell: { borderRadius: SETTINGS_GROUP_RADIUS },
  signOutGlassCard: {
    borderRadius: SETTINGS_GROUP_RADIUS,
    marginTop: theme.spacing.xs,
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 13,
    gap: theme.spacing.md,
    minHeight: 54,
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
  settingBody: { flex: 1 },
  settingTitle: {
    ...theme.typography.body,
    color: theme.colors.foreground,
    fontWeight: '500',
  },
  settingSubtitle: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: theme.spacing.xxl,
  },
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
