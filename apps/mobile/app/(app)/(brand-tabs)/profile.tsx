import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { useBootstrap, useBusinessProfile, useCampaigns } from '@/hooks/use-marketplace';
import { logout } from '@/lib/auth/logout';

function formatAmount(n?: number) {
  if (!n) return '0';
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
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
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function SpendChart({ data }: { data: Array<{ month: string; amount: number }> }) {
  if (data.length < 2) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>Spend trend appears after campaigns are launched.</Text>
      </View>
    );
  }
  const chartW = 320;
  const chartH = 102;
  const maxVal = Math.max(...data.map((item) => item.amount), 1);
  const stepX = chartW / (data.length - 1);
  const points = data.map((item, index) => ({
    x: index * stepX,
    y: chartH - (item.amount / maxVal) * (chartH - 12),
  }));
  const linePath = buildPath(points);
  const areaPath = `${linePath} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  return (
    <View style={styles.chartArea}>
      <Svg width="100%" height={140} viewBox={`0 0 ${chartW} 140`}>
        <Defs>
          <LinearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.accentSoft} stopOpacity={0.9} />
            <Stop offset="1" stopColor={theme.colors.accentSoft} stopOpacity={0.08} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#spendFill)" />
        <Path d={linePath} stroke={theme.colors.accentStrong} strokeWidth={3} fill="none" />
        {points.map((point) => (
          <Circle key={point.x} cx={point.x} cy={point.y} r={4} fill={theme.colors.accentStrong} />
        ))}
      </Svg>
      <View style={styles.monthLabels}>
        {data.map((item) => (
          <Text key={item.month} style={styles.monthLabel}>
            {item.month}
          </Text>
        ))}
      </View>
    </View>
  );
}

const BRAND_BADGES = [
  {
    id: 'first_campaign',
    name: 'First Campaign',
    icon: 'flag-outline',
    unlocked: (campaigns: number) => campaigns >= 1,
  },
  {
    id: 'five_campaigns',
    name: '5 Campaigns',
    icon: 'briefcase-outline',
    unlocked: (campaigns: number) => campaigns >= 5,
  },
  {
    id: 'connected',
    name: 'Connected',
    icon: 'logo-instagram',
    unlocked: (_campaigns: number, connected: boolean) => connected,
  },
  {
    id: 'profile_complete',
    name: 'Profile Complete',
    icon: 'shield-checkmark-outline',
    unlocked: (_campaigns: number, _connected: boolean, complete: boolean) => complete,
  },
] as const;

const actions = [
  { label: 'Edit Brand', icon: 'create-outline', href: '/(app)/profile/edit' },
  { label: 'Instagram', icon: 'logo-instagram', href: '/(app)/profile/instagram' },
  { label: 'Settings', icon: 'settings-outline', href: '/(app)/profile/settings' },
] as const;

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{profile.data?.brand_name ?? 'Brand Profile'}</Text>
          <Text style={styles.headerSub}>
            {profile.data?.brand_summary ?? 'Track campaigns, spend and team readiness.'}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Brand Achievements</Text>
        <View style={styles.badgeRow}>
          {BRAND_BADGES.map((badge) => {
            const unlocked = badge.unlocked(
              launchedCampaigns,
              Boolean(profile.data?.instagram_connected),
              profileComplete,
            );
            return (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked,
                ]}
              >
                <Ionicons
                  name={badge.icon}
                  size={24}
                  color={unlocked ? theme.colors.accentStrong : '#C9BAB5'}
                />
                <Text
                  style={[
                    styles.badgeName,
                    { color: unlocked ? theme.colors.accentStrong : theme.colors.muted },
                  ]}
                  numberOfLines={2}
                >
                  {badge.name}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Ionicons name="briefcase-outline" size={28} color={theme.colors.accentStrong} />
              <Text style={styles.statValue}>{launchedCampaigns}</Text>
              <Text style={styles.statLabel}>CAMPAIGNS LAUNCHED</Text>
            </View>
            <View style={styles.vertDivider} />
            <View style={styles.statBlock}>
              <Ionicons name="wallet-outline" size={28} color={theme.colors.success} />
              <Text style={[styles.statValue, { color: theme.colors.success }]}>
                ₹{formatAmount(totalSpent)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.success }]}>TOTAL SPENT</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly Spend Trend</Text>
          <SpendChart data={monthlySpend} />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{profile.data?.brand_type ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoDivider]}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{profile.data?.brand_location ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <Pressable
              key={action.href}
              style={styles.actionTile}
              onPress={() => {
                router.push(action.href);
              }}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name={action.icon} size={20} color={theme.colors.accentStrong} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingTop: 10,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: theme.colors.foreground,
  },
  headerSub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.muted,
  },
  sectionLabel: {
    paddingHorizontal: 24,
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  badgeCard: {
    flex: 1,
    height: 84,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  badgeCardUnlocked: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1.5,
    borderColor: theme.colors.pink,
  },
  badgeCardLocked: {
    backgroundColor: '#F4EFED',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeName: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    minHeight: 150,
  },
  statBlock: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 8,
  },
  vertDivider: {
    width: 1,
    backgroundColor: theme.colors.borderStrong,
    marginVertical: 16,
  },
  statValue: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: theme.colors.accentStrong,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1,
    color: theme.colors.accentStrong,
  },
  chartCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  chartArea: {
    height: 142,
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
    color: theme.colors.muted,
  },
  emptyChart: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFFAA',
  },
  emptyChartText: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  infoCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoDivider: {
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.muted,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  actionGrid: {
    marginHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  actionTile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  logoutButton: {
    marginHorizontal: 24,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
