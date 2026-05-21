import { GlassCard } from '@/components/ui/glass-card';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useBusinessProfile } from '@/hooks/use-marketplace';
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SETTINGS_GROUP_RADIUS = 28;
const SIGN_OUT_GLASS_TINT = 'rgba(211, 83, 83, 0.28)';

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
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BrandProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useBusinessProfile();
  const profileLoading = shouldShowInitialLoader(profile);

  const igConnected = Boolean(profile.data?.instagram_connected);
  const brandName = profile.data?.brand_name;

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
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <View style={[styles.pageHeaderRow, { paddingTop: insets.top + theme.spacing.md }]}>
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
        <Text style={styles.pageTitle}>Brand Profile</Text>
      </View>

      {/* ── Profile hero row ── */}
      <Pressable
        onPress={() => {
          router.push('/(app)/profile/edit');
        }}
        style={({ pressed }) => [styles.profileRow, pressed && styles.rowPressed]}
      >
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

        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
      </Pressable>

      <View style={styles.sectionDivider} />

      {/* ── Account settings group ── */}
      <Text style={styles.sectionHeader}>Account</Text>
      <GlassCard
        style={styles.settingsShell}
        contentStyle={{ borderRadius: SETTINGS_GROUP_RADIUS, overflow: 'hidden' }}
      >
        <SettingRow
          first
          iconName="person-outline"
          iconBg={theme.colors.info}
          title="Edit Profile"
          subtitle={brandName ?? 'Brand Profile'}
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/edit');
          }}
        />
        <SettingRow
          iconName="logo-instagram"
          iconBg="#C13584"
          title="Instagram"
          subtitle={igConnected ? 'Connected' : 'Not connected'}
          subtitleLoading={profileLoading}
          onPress={() => {
            router.push('/(app)/profile/instagram');
          }}
        />
        <SettingRow
          iconName="settings-outline"
          iconBg={theme.colors.muted}
          title="Settings"
          onPress={() => {
            router.push('/(app)/profile/settings');
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
        style={StyleSheet.flatten([styles.settingsShell, styles.signOutShell])}
        contentStyle={{ borderRadius: SETTINGS_GROUP_RADIUS, overflow: 'hidden' }}
        tintOverlayColor={SIGN_OUT_GLASS_TINT}
      >
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutRow, pressed && styles.rowPressed]}
        >
          <View style={[styles.iconBox, { backgroundColor: theme.colors.danger }]}>
            <SymbolView
              name="rectangle.portrait.and.arrow.right"
              size={17}
              tintColor="#fff"
              type="monochrome"
              fallback={<Ionicons name="log-out-outline" size={17} color="#fff" />}
            />
          </View>
          <Text style={styles.signOutText}>Sign Out</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  pageTitle: {
    ...theme.typography.display,
    color: theme.colors.foreground,
  },

  // Profile row
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: { flex: 1, gap: 2 },
  profileName: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  profileSub: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.55)',
  },
  profileLocation: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.38)',
    fontSize: 12,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: theme.spacing.xs,
  },

  sectionHeader: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingLeft: 4,
    marginTop: theme.spacing.xs,
  },

  // Settings groups
  settingsShell: { borderRadius: SETTINGS_GROUP_RADIUS },
  signOutShell: { marginTop: theme.spacing.xs },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 13,
    gap: theme.spacing.md,
    minHeight: 54,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    fontSize: 12,
    marginTop: 1,
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 66,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 13,
    gap: theme.spacing.md,
    minHeight: 54,
  },
  signOutText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    fontWeight: '600',
  },
});
