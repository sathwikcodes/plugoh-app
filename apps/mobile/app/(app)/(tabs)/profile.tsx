import type {
  CampaignListItem,
  EarningsSummary,
  InfluencerProfileResponse,
} from '@plugoh/contracts';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useCampaigns,
  useEarnings,
  useInfluencerProfile,
} from '@/hooks/use-marketplace';
import { logout } from '@/lib/auth/logout';

function getInitials(name?: string): string {
  if (!name) return 'C';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatAmount(n?: number): string {
  if (!n) return '0';
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatCount(n?: number): string {
  if (!n) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

type TierKey = EarningsSummary['tier'];

const TIER_CONFIG: Record<
  TierKey,
  {
    label: string;
    color: string;
    soft: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }
> = {
  nano: {
    label: 'Nano Creator',
    color: theme.colors.pending,
    soft: theme.colors.pendingSoft,
    icon: 'medal-outline',
  },
  micro: {
    label: 'Micro Creator',
    color: theme.colors.info,
    soft: theme.colors.infoSoft,
    icon: 'ribbon-outline',
  },
  mid: {
    label: 'Rising Creator',
    color: theme.colors.accentStrong,
    soft: theme.colors.accentSoft,
    icon: 'star-outline',
  },
  macro: {
    label: 'Top Creator',
    color: theme.colors.success,
    soft: theme.colors.successSoft,
    icon: 'trophy-outline',
  },
};

const ACHIEVEMENTS = [
  {
    id: 'first_deal',
    name: 'First Deal',
    icon: 'hand-left-outline',
    check: (d: DerivedData) => d.completedCount >= 1,
  },
  {
    id: 'connected',
    name: 'Connected',
    icon: 'logo-instagram',
    check: (d: DerivedData) => Boolean(d.profile?.instagram_connected),
  },
  {
    id: 'profile_pro',
    name: 'Profile Pro',
    icon: 'person-circle-outline',
    check: (d: DerivedData) =>
      Boolean(d.profile?.bio && d.profile.category && d.profile.price_per_reel),
  },
  {
    id: 'five_campaigns',
    name: '5 Campaigns',
    icon: 'briefcase-outline',
    check: (d: DerivedData) => d.completedCount >= 5,
  },
  {
    id: 'earner',
    name: 'Earner',
    icon: 'wallet-outline',
    check: (d: DerivedData) => (d.earnings?.total_earnings ?? 0) >= 1000,
  },
  {
    id: 'ten_campaigns',
    name: '10 Campaigns',
    icon: 'rocket-outline',
    check: (d: DerivedData) => d.completedCount >= 10,
  },
  {
    id: 'big_earner',
    name: 'Big Earner',
    icon: 'diamond-outline',
    check: (d: DerivedData) => (d.earnings?.total_earnings ?? 0) >= 10000,
  },
  {
    id: 'top_creator',
    name: 'Top Creator',
    icon: 'trophy-outline',
    check: (d: DerivedData) => d.earnings?.tier === 'macro',
  },
] as const;

type DerivedData = {
  profile?: InfluencerProfileResponse;
  earnings?: EarningsSummary;
  completedCount: number;
};

const actionTiles = [
  { label: 'Edit Profile', icon: 'create-outline', href: '/(app)/profile/edit' },
  { label: 'Instagram', icon: 'logo-instagram', href: '/(app)/profile/instagram' },
  { label: 'Payout', icon: 'card-outline', href: '/(app)/profile/payout' },
  { label: 'Pricing', icon: 'pricetag-outline', href: '/(app)/profile/pricing' },
] as const;

function abbreviateMonth(month: string) {
  if (!month) return '';
  return month.slice(0, 3);
}

function clamp(num: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, num));
}

function TierAvatar({
  initials,
  tierColor,
  size,
}: {
  initials: string;
  tierColor: string;
  size: number;
}) {
  const ringSize = size + 6;
  return (
    <View
      style={[
        styles.tierAvatar,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor: tierColor,
          shadowColor: tierColor,
        },
      ]}
    >
      <Text style={[styles.tierAvatarText, { color: tierColor, fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}

function TierBadge({ tier }: { tier: TierKey }) {
  const config = TIER_CONFIG[tier];
  return (
    <View style={[styles.tierBadge, { backgroundColor: config.soft }]}>
      <Ionicons name={config.icon} size={12} color={config.color} />
      <Text style={[styles.tierBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function VerifiedBadge() {
  return (
    <View style={styles.verifiedBadge}>
      <Ionicons name="logo-instagram" size={10} color={theme.colors.info} />
      <Text style={styles.verifiedBadgeText}>Connected</Text>
    </View>
  );
}

function AchievementBadge({
  unlocked,
  icon,
  name,
}: {
  unlocked: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  name: string;
}) {
  return (
    <View
      style={[
        styles.achievementCard,
        unlocked ? styles.achievementCardUnlocked : styles.achievementCardLocked,
        unlocked && styles.achievementGlow,
      ]}
    >
      <Ionicons name={icon} size={26} color={unlocked ? theme.colors.accentStrong : '#C9BAB5'} />
      <Text
        style={[
          styles.achievementName,
          { color: unlocked ? theme.colors.accentStrong : theme.colors.muted },
        ]}
        numberOfLines={3}
      >
        {name}
      </Text>
    </View>
  );
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { backgroundColor: color, width: `${clamp(progress) * 100}%` },
        ]}
      />
    </View>
  );
}

function StatHalf({
  icon,
  iconColor,
  value,
  label,
  labelColor,
  sub,
  progress,
  progressColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  value: string;
  label: string;
  labelColor: string;
  sub: string;
  progress: number;
  progressColor: string;
}) {
  return (
    <View style={styles.statHalf}>
      <Ionicons name={icon} size={30} color={iconColor} />
      <Text style={[styles.statValue, { color: labelColor }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
      <ProgressBar progress={progress} color={progressColor} />
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function SegmentToggle({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segmentWrap}>
      {options.map((option) => {
        const active = selected === option;
        return (
          <Pressable
            key={option}
            onPress={() => {
              onChange(option);
            }}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: active ? theme.colors.foreground : theme.colors.muted,
                  fontWeight: active ? '700' : '500',
                },
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function EarningsLineChart({ data }: { data: Array<{ month: string; amount: number }> }) {
  if (data.length < 2) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>Earnings will appear after your first campaign.</Text>
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
          <LinearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.accentSoft} stopOpacity={0.95} />
            <Stop offset="1" stopColor={theme.colors.accentSoft} stopOpacity={0.08} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#earningsFill)" />
        <Path d={linePath} stroke={theme.colors.accentStrong} strokeWidth={3} fill="none" />
        {points.map((point) => (
          <Circle key={point.x} cx={point.x} cy={point.y} r={4} fill={theme.colors.accentStrong} />
        ))}
      </Svg>
      <View style={styles.monthLabels}>
        {data.map((item) => (
          <Text key={item.month} style={styles.monthLabel}>
            {abbreviateMonth(item.month)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ProfileInfoRow({
  label,
  value,
  icon,
  last,
}: {
  label: string;
  value?: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoDivider]}>
      <Ionicons name={icon} size={18} color={theme.colors.muted} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const profile = useInfluencerProfile();
  const earnings = useEarnings();
  const campaigns = useCampaigns();
  const [activeRange, setActiveRange] = useState<'Month' | 'All Time'>('Month');

  const completedCount = useMemo(
    () =>
      (campaigns.data?.items ?? []).filter(
        (campaign: CampaignListItem) => campaign.status === 'completed',
      ).length,
    [campaigns.data?.items],
  );

  const tier: TierKey = earnings.data?.tier ?? 'nano';
  const tierConfig = TIER_CONFIG[tier];
  const tierProgress = clamp(earnings.data?.tier_progress ?? 0);
  const campaignProgress = clamp(completedCount / 10);
  const pendingRatio = clamp(
    (earnings.data?.pending_earnings ?? 0) / Math.max(earnings.data?.total_earnings ?? 0, 1),
  );

  const chartData = useMemo(() => {
    const source = earnings.data?.monthly_breakdown ?? [];
    if (activeRange === 'Month') return source.slice(-6);
    return source;
  }, [activeRange, earnings.data?.monthly_breakdown]);

  const activeMetric =
    activeRange === 'Month'
      ? (earnings.data?.this_month ?? 0)
      : (earnings.data?.total_earnings ?? 0);
  const activeLabel = activeRange === 'Month' ? 'This month earnings' : 'All time earnings';

  const derivedData: DerivedData = {
    profile: profile.data,
    earnings: earnings.data,
    completedCount,
  };

  const shareProfile = async () => {
    const name = profile.data?.display_name || 'Plugoh Creator';
    const userId = bootstrap.data?.user.id;
    await Share.share({
      message: `${name} on Plugoh${userId ? ` • id: ${userId}` : ''}`,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBar}>
          <Text style={styles.appLabel}>PLUGOH</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerIconButton} onPress={shareProfile}>
              <Ionicons name="share-social-outline" size={18} color={theme.colors.foreground} />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => {
                router.push('/(app)/profile/settings');
              }}
            >
              <Ionicons name="settings-outline" size={18} color={theme.colors.foreground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroRow}>
          <TierAvatar
            initials={getInitials(profile.data?.display_name)}
            tierColor={tierConfig.color}
            size={72}
          />
          <View style={styles.heroMeta}>
            <Text style={styles.displayName}>{profile.data?.display_name || 'Creator'}</Text>
            <Text style={styles.igHandle}>
              @{profile.data?.ig_username || profile.data?.instagram_handle || 'plugoh.creator'}
            </Text>
            <View style={styles.badgeRow}>
              <TierBadge tier={tier} />
              {profile.data?.instagram_connected ? <VerifiedBadge /> : null}
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Achievements</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementRow}
        >
          {ACHIEVEMENTS.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              icon={achievement.icon}
              name={achievement.name}
              unlocked={achievement.check(derivedData)}
            />
          ))}
        </ScrollView>

        <View style={styles.dualCard}>
          <View style={styles.dualTopRow}>
            <StatHalf
              icon="briefcase-outline"
              iconColor={theme.colors.accentStrong}
              value={`${completedCount}`}
              label="CAMPAIGNS"
              labelColor={theme.colors.accentStrong}
              sub={`${completedCount}/10 to next tier`}
              progress={campaignProgress}
              progressColor={theme.colors.accentStrong}
            />
            <View style={styles.verticalDivider} />
            <StatHalf
              icon="wallet-outline"
              iconColor={theme.colors.success}
              value={`₹${formatAmount(earnings.data?.total_earnings)}`}
              label="EARNED"
              labelColor={theme.colors.success}
              sub={`₹${formatAmount(earnings.data?.this_month)} this month`}
              progress={tierProgress}
              progressColor={theme.colors.success}
            />
          </View>
          <View style={styles.dashedDivider} />
          <View style={styles.dualBottomRow}>
            <View style={styles.progressLabelHalf}>
              <Text style={styles.progressLabelTitle}>{tierConfig.label}</Text>
              <Text style={styles.progressLabelSub}>
                {Math.round(tierProgress * 100)}% to next tier
              </Text>
              <ProgressBar progress={tierProgress} color={theme.colors.accentStrong} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.progressLabelHalf}>
              <Text style={styles.progressLabelTitle}>
                ₹{formatAmount(earnings.data?.pending_earnings)} pending
              </Text>
              <Text style={styles.progressLabelSub}>awaiting release</Text>
              <ProgressBar progress={pendingRatio} color={theme.colors.pending} />
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.bigStat}>₹{formatAmount(activeMetric)}</Text>
              <Text style={styles.statSubLabel}>{activeLabel}</Text>
            </View>
            <SegmentToggle
              options={['Month', 'All Time']}
              selected={activeRange}
              onChange={(value) => {
                setActiveRange(value as 'Month' | 'All Time');
              }}
            />
          </View>
          <EarningsLineChart data={chartData} />
          <View style={styles.chartFooter}>
            <Text style={styles.chartFooterText}>
              MoM: {(earnings.data?.month_over_month_change ?? 0) > 0 ? '+' : ''}
              {earnings.data?.month_over_month_change ?? 0}%
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <ProfileInfoRow label="Category" value={profile.data?.category} icon="grid-outline" />
          <ProfileInfoRow label="City" value={profile.data?.city} icon="location-outline" />
          <ProfileInfoRow
            label="Followers"
            value={formatCount(profile.data?.follower_count)}
            icon="people-outline"
          />
          <ProfileInfoRow
            label="Avg Likes/Reel"
            value={formatCount(profile.data?.avg_likes_per_reel)}
            icon="heart-outline"
          />
          <ProfileInfoRow
            label="Reel Price"
            value={profile.data?.price_per_reel ? `₹${profile.data.price_per_reel}` : '—'}
            icon="videocam-outline"
          />
          <ProfileInfoRow
            label="Post Price"
            value={profile.data?.price_per_post ? `₹${profile.data.price_per_post}` : '—'}
            icon="image-outline"
          />
          <ProfileInfoRow
            label="Story Price"
            value={profile.data?.price_per_story ? `₹${profile.data.price_per_story}` : '—'}
            icon="layers-outline"
            last
          />
        </View>

        <View style={styles.actionGrid}>
          {actionTiles.map((tile) => (
            <Pressable
              key={tile.href}
              style={styles.actionTile}
              onPress={() => {
                router.push(tile.href);
              }}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name={tile.icon} size={20} color={theme.colors.accentStrong} />
              </View>
              <Text style={styles.actionLabel}>{tile.label}</Text>
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
    paddingTop: 8,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  appLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  tierAvatar: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  tierAvatarText: {
    fontWeight: '700',
  },
  heroMeta: {
    flex: 1,
    gap: 4,
    paddingTop: 4,
  },
  displayName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: theme.colors.foreground,
  },
  igHandle: {
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.colors.infoSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    color: theme.colors.info,
  },
  sectionLabel: {
    paddingHorizontal: 24,
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  achievementRow: {
    paddingLeft: 24,
    paddingRight: 24,
    gap: 10,
    marginBottom: 20,
  },
  achievementCard: {
    width: 72,
    height: 88,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 7,
  },
  achievementCardUnlocked: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1.5,
    borderColor: theme.colors.pink,
  },
  achievementCardLocked: {
    backgroundColor: '#F4EFED',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  achievementGlow: {
    shadowColor: theme.colors.rose,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  achievementName: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  dualCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  dualTopRow: {
    flexDirection: 'row',
    minHeight: 182,
  },
  statHalf: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  statValue: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statSub: {
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.muted,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: theme.colors.borderStrong,
    marginVertical: 14,
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  dualBottomRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  progressLabelHalf: {
    flex: 1,
    gap: 7,
  },
  progressLabelTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  progressLabelSub: {
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.muted,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bigStat: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: theme.colors.foreground,
  },
  statSubLabel: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: theme.colors.muted,
  },
  segmentWrap: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 20,
    padding: 3,
  },
  segmentItem: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 18,
  },
  segmentItemActive: {
    backgroundColor: theme.colors.background,
  },
  segmentText: {
    fontSize: 12,
    lineHeight: 16,
  },
  chartArea: {
    height: 142,
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
  chartFooter: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  chartFooterText: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.muted,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoLabel: {
    flex: 1,
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
    color: theme.colors.white,
  },
});
