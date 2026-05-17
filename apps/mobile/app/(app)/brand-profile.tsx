import { GlassCard } from '@/components/ui/glass-card';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { theme } from '@/constants/theme';
import { useBootstrap, useBusinessProfile, useCampaigns } from '@/hooks/use-marketplace';
import { logout } from '@/lib/auth/logout';
import {
  getPushNotificationsPreference,
  setPushNotificationsPreference,
} from '@/lib/notifications/preference';
import {
  isPushRegistrationSupported,
  registerForPushNotificationsAsync,
} from '@/lib/notifications/register';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

const SETTINGS_GROUP_RADIUS = 28;
const SIGN_OUT_GLASS_TINT = 'rgba(211, 83, 83, 0.28)';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatAmount(n?: number) {
  if (!n) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${String(Math.round(n))}`;
}

function initials(name?: string | null): string {
  if (!name) return 'B';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function groupMonthlySpend(items: Array<{ created_at?: string; price_offered?: number }>) {
  const grouped = new Map<string, number>();
  items.forEach((item) => {
    const date = item.created_at ? new Date(item.created_at) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const monthKey = date.toLocaleString('en-US', { month: 'short' });
    grouped.set(monthKey, (grouped.get(monthKey) ?? 0) + (item.price_offered ?? 0));
  });
  return Array.from(grouped.entries()).map(([month, amount]) => ({ month, amount }));
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

// ─── SpendChart ───────────────────────────────────────────────────────────────

function SpendChart({ data }: { data: Array<{ month: string; amount: number }> }) {
  if (data.length < 2) {
    return (
      <View style={styles.emptyChart}>
        <SymbolView
          name="chart.line.uptrend.xyaxis"
          size={28}
          tintColor="rgba(255,255,255,0.18)"
          type="monochrome"
          fallback={<Ionicons name="analytics-outline" size={28} color="rgba(255,255,255,0.18)" />}
        />
        <Text style={styles.emptyChartText}>Trend appears after campaigns launch.</Text>
      </View>
    );
  }
  const chartW = 320;
  const chartH = 102;
  const maxVal = Math.max(...data.map((d) => d.amount), 1);
  const stepX = chartW / (data.length - 1);
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartH - (d.amount / maxVal) * (chartH - 12),
  }));
  const linePath = buildPath(points);
  const areaPath = `${linePath} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  return (
    <View>
      <Svg width="100%" height={140} viewBox={`0 0 ${chartW} 140`}>
        <Defs>
          <SvgLinearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.accentSoft} stopOpacity={0.9} />
            <Stop offset="1" stopColor={theme.colors.accentSoft} stopOpacity={0.08} />
          </SvgLinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#spendFill)" />
        <Path d={linePath} stroke={theme.colors.accentStrong} strokeWidth={3} fill="none" />
        {points.map((p) => (
          <Circle key={p.x} cx={p.x} cy={p.y} r={4} fill={theme.colors.accentStrong} />
        ))}
      </Svg>
      <View style={styles.monthLabels}>
        {data.map((d) => (
          <Text key={d.month} style={styles.monthLabel}>
            {d.month}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

function SettingRow({
  iconName,
  iconBg,
  title,
  subtitle,
  onPress,
  first,
}: {
  iconName: string;
  iconBg: string;
  title: string;
  subtitle?: string;
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
          {subtitle ? (
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

// ─── Badges ───────────────────────────────────────────────────────────────────

const BRAND_BADGES = [
  {
    id: 'first_campaign',
    name: 'First Campaign',
    icon: 'flag-outline',
    unlocked: (c: number) => c >= 1,
  },
  {
    id: 'five_campaigns',
    name: '5 Campaigns',
    icon: 'briefcase-outline',
    unlocked: (c: number) => c >= 5,
  },
  {
    id: 'connected',
    name: 'Connected',
    icon: 'logo-instagram',
    unlocked: (_c: number, ig: boolean) => ig,
  },
  {
    id: 'profile_complete',
    name: 'Profile Complete',
    icon: 'shield-checkmark-outline',
    unlocked: (_c: number, _ig: boolean, complete: boolean) => complete,
  },
] as const;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BrandProfileScreen() {
  const insets = useSafeAreaInsets();
  useBootstrap();
  const profile = useBusinessProfile();
  const campaigns = useCampaigns();

  const launchedCampaigns = campaigns.data?.items.length ?? 0;
  const totalSpent = useMemo(
    () => (campaigns.data?.items ?? []).reduce((sum, item) => sum + (item.price_offered ?? 0), 0),
    [campaigns.data?.items],
  );
  const monthlySpend = useMemo(
    () => groupMonthlySpend(campaigns.data?.items ?? []),
    [campaigns.data?.items],
  );
  const profileComplete = Boolean(
    profile.data?.brand_name && profile.data.brand_type && profile.data.brand_summary,
  );

  const igConnected = Boolean(profile.data?.instagram_connected);
  const brandName = profile.data?.brand_name ?? 'Brand Profile';

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
        <LinearGradient
          colors={['#EC4899', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarWrap}
        >
          <Text style={styles.avatarInitials}>{initials(brandName)}</Text>
        </LinearGradient>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {brandName}
          </Text>
          {profile.data?.brand_type ? (
            <Text style={styles.profileSub} numberOfLines={1}>
              {profile.data.brand_type}
            </Text>
          ) : null}
          {profile.data?.brand_location ? (
            <Text style={styles.profileLocation} numberOfLines={1}>
              {profile.data.brand_location}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
      </Pressable>

      <View style={styles.sectionDivider} />

      {/* ── Instagram card ── */}
      {igConnected ? (
        <GlassCard style={styles.igConnectedCard} contentStyle={styles.igConnectedInner}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.success }]}>
            <Ionicons name="logo-instagram" size={17} color="#fff" />
          </View>
          <View style={styles.settingBody}>
            <Text style={styles.settingTitle}>Instagram Connected</Text>
            <Text style={styles.settingSubtitle}>Your account is linked</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
        </GlassCard>
      ) : (
        <Pressable
          onPress={() => {
            router.push('/(app)/profile/instagram');
          }}
          style={({ pressed }) => [styles.igCtaCard, pressed && { opacity: 0.88 }]}
        >
          <LinearGradient
            colors={['#EC4899', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.igCtaGradient}
          >
            <View style={styles.igCtaLeft}>
              <Text style={styles.igCtaTitle}>Connect Instagram</Text>
              <Text style={styles.igCtaBody}>
                Link your account to{'\n'}unlock full campaign features.
              </Text>
              <View style={styles.igCtaBtn}>
                <Text style={styles.igCtaBtnText}>Connect now →</Text>
              </View>
            </View>
            <Ionicons
              name="logo-instagram"
              size={72}
              color="rgba(255,255,255,0.12)"
              style={styles.igCtaDecor}
            />
          </LinearGradient>
        </Pressable>
      )}

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <GlassCard style={styles.statCard} contentStyle={styles.statInner}>
          <Text style={styles.statValue}>{launchedCampaigns}</Text>
          <Text style={styles.statLabel}>Campaigns Launched</Text>
        </GlassCard>
        <GlassCard style={styles.statCard} contentStyle={styles.statInner}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatAmount(totalSpent)}
          </Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </GlassCard>
      </View>

      {/* ── Badges ── */}
      <Text style={styles.sectionHeader}>Achievements</Text>
      <View style={styles.badgeRow}>
        {BRAND_BADGES.map((badge) => {
          const unlocked = badge.unlocked(launchedCampaigns, igConnected, profileComplete);
          return (
            <View
              key={badge.id}
              style={[styles.badgeCard, unlocked ? styles.badgeUnlocked : styles.badgeLocked]}
            >
              <Ionicons
                name={badge.icon}
                size={22}
                color={unlocked ? theme.colors.accentStrong : 'rgba(255,255,255,0.2)'}
              />
              <Text
                style={[
                  styles.badgeName,
                  { color: unlocked ? theme.colors.accentStrong : 'rgba(255,255,255,0.2)' },
                ]}
                numberOfLines={2}
              >
                {badge.name}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Monthly Spend chart ── */}
      <Text style={styles.sectionHeader}>Monthly Spend</Text>
      <GlassCard style={styles.chartCard} contentStyle={styles.chartInner}>
        <SpendChart data={monthlySpend} />
      </GlassCard>

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
          subtitle={brandName}
          onPress={() => {
            router.push('/(app)/profile/edit');
          }}
        />
        <SettingRow
          iconName="logo-instagram"
          iconBg="#C13584"
          title="Instagram"
          subtitle={igConnected ? 'Connected' : 'Not connected'}
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

  // Instagram card
  igConnectedCard: {},
  igConnectedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
  },
  igCtaCard: { borderRadius: 24, overflow: 'hidden' },
  igCtaGradient: {
    borderRadius: 24,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  igCtaLeft: { flex: 1, gap: 8 },
  igCtaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  igCtaBody: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.72)',
  },
  igCtaBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 4,
  },
  igCtaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  igCtaDecor: {
    position: 'absolute',
    right: -8,
    bottom: -8,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statCard: { flex: 1 },
  statInner: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  statValue: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    fontSize: 11,
  },

  // Badges
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
  badgeRow: { flexDirection: 'row', gap: 10 },
  badgeCard: {
    flex: 1,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  badgeUnlocked: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1.5,
    borderColor: theme.colors.pink,
  },
  badgeLocked: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeName: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Chart
  chartCard: {},
  chartInner: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  emptyChart: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyChartText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  monthLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
    paddingHorizontal: 2,
  },
  monthLabel: {
    fontSize: 10,
    lineHeight: 12,
    color: 'rgba(255,255,255,0.28)',
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
