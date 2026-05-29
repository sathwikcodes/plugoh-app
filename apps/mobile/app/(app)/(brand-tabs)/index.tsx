import { GlassCard } from '@/components/ui/glass-card';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { ErrorState, PrimaryButton, Screen, StatusChip } from '@/components/ui/primitives';
import { AsyncText, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useBusinessProfile,
  useCampaigns,
  useNotifications,
} from '@/hooks/use-marketplace';
import { deriveBrandDashboard, formatBrandAmount } from '@/lib/brand/dashboard';
import { businessProfileImageUri } from '@/lib/brand/profile-image';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated2, { FadeInDown } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

type SpendPoint = { month: string; amount: number };

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function buildLinePath(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function StatTile({
  icon,
  label,
  value,
  loading,
}: {
  icon: string;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <GlassCard style={styles.statCard} contentStyle={styles.statInner}>
      <View style={styles.statIcon}>
        <Ionicons name={icon as never} size={16} color={theme.colors.pink} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <AsyncText
        loading={loading}
        value={value}
        style={styles.statValue}
        shimmerWidth="64%"
        shimmerHeight={24}
        numberOfLines={1}
      />
    </GlassCard>
  );
}

function SpendPulseChart({ data, loading }: { data: SpendPoint[]; loading: boolean }) {
  if (loading) {
    return (
      <GlassCard style={styles.panelCard} contentStyle={styles.panelInner}>
        <View style={styles.panelHeader}>
          <ShimmerText width="42%" height={16} />
          <ShimmerText width={54} height={18} />
        </View>
        <ShimmerText width="100%" height={108} />
      </GlassCard>
    );
  }

  if (data.length < 2) {
    return (
      <GlassCard style={styles.panelCard} contentStyle={styles.emptyChartInner}>
        <SymbolView
          name="chart.line.uptrend.xyaxis"
          size={34}
          tintColor="rgba(255,255,255,0.18)"
          type="monochrome"
          fallback={<Ionicons name="analytics-outline" size={34} color="rgba(255,255,255,0.18)" />}
        />
        <Text style={styles.emptyChartTitle}>Spend pulse starts soon</Text>
        <Text style={styles.emptyChartBody}>
          Launch campaigns across months to see your brand spend trend here.
        </Text>
      </GlassCard>
    );
  }

  const chartW = 320;
  const chartH = 118;
  const maxAmount = Math.max(...data.map((point) => point.amount), 1);
  const stepX = chartW / (data.length - 1);
  const points = data.map((point, index) => ({
    x: index * stepX,
    y: chartH - (point.amount / maxAmount) * (chartH - 18),
  }));
  const linePath = buildLinePath(points);
  const areaPath = `${linePath} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  return (
    <GlassCard style={styles.panelCard} contentStyle={styles.panelInner}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelEyebrow}>Spend pulse</Text>
          <Text style={styles.panelTitle}>Monthly campaign spend</Text>
        </View>
        <StatusChip label={`${data.length} months`} status="pending" />
      </View>
      <Svg width="100%" height={148} viewBox={`0 0 ${chartW} 148`}>
        <Defs>
          <SvgLinearGradient id="brandSpendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.pink} stopOpacity={0.28} />
            <Stop offset="1" stopColor={theme.colors.accentSoft} stopOpacity={0.02} />
          </SvgLinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#brandSpendFill)" />
        <Path d={linePath} stroke={theme.colors.pink} strokeWidth={3} fill="none" />
        {points.map((point) => (
          <Circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r={4} fill="#FFFFFF" />
        ))}
      </Svg>
      <View style={styles.monthLabels}>
        {data.map((point) => (
          <View key={point.month} style={styles.monthLabelWrap}>
            <Text style={styles.monthLabel}>{point.month}</Text>
            <Text style={styles.monthValue}>{formatBrandAmount(point.amount)}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

function ReadinessPanel({
  items,
  percent,
  loading,
}: {
  items: ReturnType<typeof deriveBrandDashboard>['readinessItems'];
  percent: number;
  loading: boolean;
}) {
  return (
    <GlassCard style={styles.panelCard} contentStyle={styles.panelInner}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelEyebrow}>Brand readiness</Text>
          <Text style={styles.panelTitle}>Make the workspace launch-ready</Text>
        </View>
        {loading ? (
          <ShimmerText width={48} height={18} />
        ) : (
          <Text style={styles.readinessPercent}>{percent}%</Text>
        )}
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${loading ? 18 : percent}%` }]} />
      </View>
      <View style={styles.readinessList}>
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={styles.readinessRow}>
                <View style={[styles.readinessDot, styles.readinessDotPending]} />
                <ShimmerText width="68%" height={14} />
              </View>
            ))
          : items.map((item) => (
              <View key={item.id} style={styles.readinessRow}>
                <View
                  style={[
                    styles.readinessDot,
                    item.complete ? styles.readinessDotDone : styles.readinessDotPending,
                  ]}
                >
                  {item.complete ? <Ionicons name="checkmark" size={11} color="#FFFFFF" /> : null}
                </View>
                <Text
                  style={[styles.readinessLabel, item.complete && styles.readinessLabelDone]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            ))}
      </View>
    </GlassCard>
  );
}

function NextActionCard({
  label,
  route,
  loading,
}: {
  label: string;
  route: ReturnType<typeof deriveBrandDashboard>['nextAction']['route'];
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!loading) router.push(route);
      }}
      style={({ pressed }) => [styles.actionShell, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading }}
    >
      <LinearGradient
        colors={['#EC4899', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actionGradient}
      >
        <View style={styles.actionCopy}>
          <Text style={styles.actionEyebrow}>Next best move</Text>
          {loading ? (
            <ShimmerText width="64%" height={22} />
          ) : (
            <Text style={styles.actionTitle}>{label}</Text>
          )}
        </View>
        <View style={styles.actionIcon}>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function BrandHomeScreen() {
  const bootstrap = useBootstrap();
  const profile = useBusinessProfile();
  const campaigns = useCampaigns({ sort: 'created_desc' });
  const notifications = useNotifications();
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const profileLoading = bootstrapLoading || shouldShowInitialLoader(profile);
  const campaignsLoading = bootstrapLoading || shouldShowInitialLoader(campaigns);
  const notificationsLoading = bootstrapLoading || shouldShowInitialLoader(notifications);
  const dashboard = useMemo(
    () => deriveBrandDashboard(profile.data, campaigns.data?.items ?? []),
    [campaigns.data?.items, profile.data],
  );
  const latestNotification = notifications.data?.[0];
  const displayName =
    profile.data?.brand_name?.trim() || bootstrap.data?.user.email?.split('@')[0] || 'brand owner';
  const dashboardLoading = profileLoading || campaignsLoading;
  const profileImageUri = businessProfileImageUri(profile.data);

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <Animated2.View entering={FadeInDown.duration(320)} style={styles.header}>
        <View style={styles.heroCopy}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <AsyncText
            loading={profileLoading}
            value={displayName}
            style={styles.heroTitle}
            shimmerWidth="66%"
            shimmerHeight={34}
            numberOfLines={1}
          />
          <Text style={styles.heroSubtitle}>
            Track creator spend, campaign motion, and launch readiness from one place.
          </Text>
        </View>
        <NativeIconButton
          symbol="person.circle"
          fallbackIcon="person-circle-outline"
          variant="glass"
          haptic="light"
          size={44}
          symbolSize={20}
          imageUri={profileImageUri}
          onPress={() => {
            router.push('/(app)/brand-profile');
          }}
        />
      </Animated2.View>

      {campaigns.isError ? (
        <ErrorState
          title="Campaign health is unavailable"
          subtitle="Spend and campaign metrics could not load. Try again before making decisions."
          onRetry={() => {
            void campaigns.refetch();
          }}
        />
      ) : (
        <>
          <Animated2.View entering={FadeInDown.delay(40).duration(320)} style={styles.statGrid}>
            <StatTile
              icon="pulse-outline"
              label="Active"
              value={dashboard.activeCampaigns.length}
              loading={campaignsLoading}
            />
            <StatTile
              icon="briefcase-outline"
              label="Campaigns"
              value={campaigns.data?.total ?? dashboard.totalCampaigns}
              loading={campaignsLoading}
            />
            <StatTile
              icon="wallet-outline"
              label="Total spend"
              value={formatBrandAmount(dashboard.totalSpend)}
              loading={campaignsLoading}
            />
            <StatTile
              icon="sparkles-outline"
              label="Ready"
              value={`${dashboard.readinessPercent}%`}
              loading={dashboardLoading}
            />
          </Animated2.View>

          <Animated2.View entering={FadeInDown.delay(80).duration(320)}>
            <NextActionCard
              label={dashboard.nextAction.label}
              route={dashboard.nextAction.route}
              loading={dashboardLoading}
            />
          </Animated2.View>

          <Animated2.View entering={FadeInDown.delay(120).duration(320)}>
            <SpendPulseChart data={dashboard.monthlySpend} loading={campaignsLoading} />
          </Animated2.View>

          <Animated2.View entering={FadeInDown.delay(160).duration(320)}>
            <ReadinessPanel
              items={dashboard.readinessItems}
              percent={dashboard.readinessPercent}
              loading={dashboardLoading}
            />
          </Animated2.View>
        </>
      )}

      <Animated2.View entering={FadeInDown.delay(200).duration(320)}>
        <GlassCard style={styles.panelCard} contentStyle={styles.panelInner}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>Latest signal</Text>
              <Text style={styles.panelTitle}>Notifications</Text>
            </View>
            <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.55)" />
          </View>
          {notificationsLoading ? (
            <ShimmerText width="76%" height={18} />
          ) : latestNotification ? (
            <Pressable
              onPress={() => {
                router.push('/(app)/notifications');
              }}
              style={({ pressed }) => [styles.notificationRow, pressed && styles.cardPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open latest notification"
            >
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {latestNotification.type.replaceAll('_', ' ')}
              </Text>
              <StatusChip
                label={latestNotification.read ? 'Read' : 'Unread'}
                status={latestNotification.read ? 'completed' : 'pending'}
              />
            </Pressable>
          ) : (
            <View style={styles.emptySignal}>
              <Text style={styles.emptySignalTitle}>No notifications yet</Text>
              <Text style={styles.emptySignalBody}>
                Booking, payment, and delivery updates will land here.
              </Text>
            </View>
          )}
        </GlassCard>
      </Animated2.View>

      <PrimaryButton
        label="Discover creators"
        onPress={() => {
          router.push('/(app)/(brand-tabs)/discover');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.xs,
  },
  greeting: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.62)',
  },
  heroTitle: {
    ...theme.typography.display,
    color: theme.colors.foreground,
    marginTop: -2,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.58)',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statCard: {
    width: '48.5%',
    minHeight: 112,
    borderRadius: 22,
  },
  statInner: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236,72,153,0.14)',
  },
  statLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.45)',
  },
  statValue: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  actionShell: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  actionGradient: {
    minHeight: 92,
    borderRadius: 24,
    padding: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  actionCopy: {
    flex: 1,
    gap: 5,
  },
  actionEyebrow: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  actionTitle: {
    ...theme.typography.section,
    color: '#FFFFFF',
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  cardPressed: {
    opacity: 0.86,
  },
  panelCard: {
    borderRadius: 24,
  },
  panelInner: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  panelEyebrow: {
    ...theme.typography.label,
    color: theme.colors.pink,
    textTransform: 'uppercase',
  },
  panelTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    marginTop: 2,
  },
  emptyChartInner: {
    minHeight: 172,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  emptyChartTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  emptyChartBody: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.42)',
    textAlign: 'center',
  },
  monthLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  monthLabelWrap: {
    alignItems: 'center',
    gap: 2,
  },
  monthLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.42)',
    fontSize: 10,
  },
  monthValue: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  readinessPercent: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.pink,
  },
  readinessList: {
    gap: theme.spacing.sm,
  },
  readinessRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  readinessDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessDotDone: {
    backgroundColor: theme.colors.success,
  },
  readinessDotPending: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  readinessLabel: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.58)',
    flex: 1,
  },
  readinessLabelDone: {
    color: theme.colors.foreground,
  },
  notificationRow: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  notificationTitle: {
    ...theme.typography.body,
    color: theme.colors.foreground,
    flex: 1,
    textTransform: 'capitalize',
  },
  emptySignal: {
    gap: 2,
  },
  emptySignalTitle: {
    ...theme.typography.body,
    color: theme.colors.foreground,
  },
  emptySignalBody: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.42)',
  },
});
