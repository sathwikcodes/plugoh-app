import campaignInsightIcon from '@/assets/images/campaign.png';
import coinInsightIcon from '@/assets/images/coin.png';
import medalInsightIcon from '@/assets/images/medal.png';
import { TierBadgeCarousel } from '@/components/influencer/tier-badge-carousel';
import { AppHeader, getAppHeaderScreenTopPadding } from '@/components/ui/app-header';
import { Screen } from '@/components/ui/primitives';
import { ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useCampaigns,
  useEarnings,
  useInfluencerProfile,
} from '@/hooks/use-marketplace';
import { formatPaiseAsINR, getTierBadgeCatalog, getTierDisplay } from '@/lib/influencer/home-tier';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import type { CampaignListItem, CampaignStatus } from '@plugoh/contracts';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Line,
  Polygon,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

// ─── helpers ──────────────────────────────────────────────────────────────────

const DELIVERY_ACTION_STATUSES = new Set<CampaignStatus>(['in_escrow', 'changes_requested']);
const PENDING_EARNING_STATUSES = new Set<CampaignStatus>(['in_escrow', 'delivery_submitted']);
const HEALTH_TRACKED_STATUSES = new Set<CampaignStatus>([
  'in_escrow',
  'delivery_submitted',
  'completed',
  'changes_requested',
]);

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDueToday(campaign: CampaignListItem) {
  return campaign.due_date === localDateKey();
}

function isOverdue(campaign: CampaignListItem) {
  return campaign.due_date ? campaign.due_date < localDateKey() : false;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function averagePercent(values: readonly number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

// ─── HomeTierHero ─────────────────────────────────────────────────────────────

function HeroMetric({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <View style={heroStyles.metric}>
      <Text style={heroStyles.metricLabel}>{label}</Text>
      {loading ? (
        <ShimmerText width="62%" height={22} />
      ) : (
        <Text style={heroStyles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}
    </View>
  );
}

function HomeTierHero({
  earnings,
  loading,
}: {
  earnings: ReturnType<typeof useEarnings>['data'];
  loading: boolean;
}) {
  const tier = getTierDisplay(earnings?.tier, earnings?.tier_progress);
  const [selectedTier, setSelectedTier] = useState(tier.key);
  const badgeCatalog = useMemo(() => getTierBadgeCatalog(tier.key), [tier.key]);
  const currentBadge = badgeCatalog.find((item) => item.current) ?? badgeCatalog[0];
  const selectedBadge = badgeCatalog.find((item) => item.key === selectedTier) ?? currentBadge;
  const selectedProgressPercent =
    selectedBadge.rank < currentBadge.rank ? 100 : selectedBadge.current ? tier.progressPercent : 0;

  useEffect(() => {
    setSelectedTier(tier.key);
  }, [tier.key]);

  return (
    <View style={heroStyles.section}>
      <TierBadgeCarousel currentTier={tier.key} onActiveTierChange={setSelectedTier} />

      <View style={heroStyles.metricStrip}>
        <HeroMetric label="Tier" value={selectedBadge.label} loading={loading} />
        <HeroMetric
          label="Earned"
          value={formatPaiseAsINR(earnings?.total_earnings)}
          loading={loading}
        />
        <HeroMetric label="Progress" value={`${selectedProgressPercent}%`} loading={loading} />
      </View>
    </View>
  );
}

type RadarMetric = {
  label: string;
  value: number;
};

function radarPoint({
  index,
  count,
  radius,
  centerX,
  centerY,
}: {
  index: number;
  count: number;
  radius: number;
  centerX: number;
  centerY: number;
}) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function pointsToString(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

function RadarChart({
  metrics,
  accentColor,
}: {
  metrics: readonly RadarMetric[];
  accentColor: string;
}) {
  const centerX = 110;
  const centerY = 76;
  const radius = 48;
  const labelRadius = 70;
  const ringLevels = [0.2, 0.4, 0.6, 0.8, 1];
  const count = metrics.length;
  const dataPoints = metrics.map((metric, index) =>
    radarPoint({
      index,
      count,
      radius: radius * (clampPercent(metric.value) / 100),
      centerX,
      centerY,
    }),
  );
  const fullPoints = metrics.map((_, index) =>
    radarPoint({ index, count, radius, centerX, centerY }),
  );
  const accessibilitySummary = metrics
    .map((metric) => `${metric.label} ${Math.round(clampPercent(metric.value))} percent`)
    .join(', ');

  return (
    <View
      style={insightStyles.radarWrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Campaign health radar chart: ${accessibilitySummary}`}
    >
      <View style={[insightStyles.radarGlow, { backgroundColor: accentColor }]} />
      <Svg width={220} height={164} viewBox="0 0 220 164">
        <Defs>
          <SvgLinearGradient id="campaignHealthRadarFill" x1="54" y1="18" x2="166" y2="130">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.34} />
            <Stop offset="0.45" stopColor={accentColor} stopOpacity={0.3} />
            <Stop offset="1" stopColor={accentColor} stopOpacity={0.1} />
          </SvgLinearGradient>
        </Defs>

        {ringLevels.map((level) => (
          <Polygon
            key={level}
            points={pointsToString(
              metrics.map((_, index) =>
                radarPoint({ index, count, radius: radius * level, centerX, centerY }),
              ),
            )}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={level === 1 ? 1.15 : 0.8}
          />
        ))}

        {fullPoints.map((point) => (
          <Line
            key={`${point.x}-${point.y}`}
            x1={centerX}
            y1={centerY}
            x2={point.x}
            y2={point.y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={0.8}
          />
        ))}

        <Polygon
          points={pointsToString(dataPoints)}
          fill="url(#campaignHealthRadarFill)"
          stroke={accentColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Polygon
          points={pointsToString(dataPoints)}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.36}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        {dataPoints.map((point) => (
          <Circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r={2.6} fill="#FFFFFF" />
        ))}

        {metrics.map((metric, index) => {
          const point = radarPoint({ index, count, radius: labelRadius, centerX, centerY });
          const anchor = point.x < centerX - 8 ? 'end' : point.x > centerX + 8 ? 'start' : 'middle';
          return (
            <SvgText
              key={metric.label}
              x={point.x}
              y={point.y + 3}
              fill="rgba(255,255,255,0.62)"
              fontSize={8.4}
              fontWeight="500"
              textAnchor={anchor}
            >
              {metric.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function InsightCard({
  imageSource,
  title,
  value,
  subtitle,
  accentColor,
  width,
  radarMetrics,
}: {
  imageSource?: ImageSourcePropType;
  title: string;
  value: string;
  subtitle: string;
  accentColor: string;
  width: number;
  radarMetrics?: readonly RadarMetric[];
}) {
  return (
    <View style={[insightStyles.card, radarMetrics && insightStyles.radarCard, { width }]}>
      {radarMetrics ? (
        <RadarChart metrics={radarMetrics} accentColor={accentColor} />
      ) : imageSource ? (
        <View style={insightStyles.assetStage}>
          <View style={[insightStyles.assetGlow, { backgroundColor: accentColor }]} />
          <Image
            source={imageSource}
            style={insightStyles.assetImage}
            contentFit="contain"
            accessible
            accessibilityLabel={`${title} insight`}
          />
        </View>
      ) : null}
      <View style={insightStyles.cardCopy}>
        <Text style={insightStyles.cardTitle} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <Text style={insightStyles.cardValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={insightStyles.cardSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function DailyInsightsSection({
  earnings,
  campaigns,
  loading,
}: {
  earnings: ReturnType<typeof useEarnings>['data'];
  campaigns: CampaignListItem[];
  loading: boolean;
}) {
  const window = useWindowDimensions();
  const cardWidth = Math.min(Math.max(window.width * 0.72, 248), 304);
  const sidePeekPadding = Math.max(0, (window.width - cardWidth) / 2);
  const tier = getTierDisplay(earnings?.tier, earnings?.tier_progress);
  const deliveryCampaigns = campaigns.filter((campaign) =>
    DELIVERY_ACTION_STATUSES.has(campaign.status),
  );
  const dueTodayCount = deliveryCampaigns.filter(isDueToday).length;
  const pendingEarningCampaigns = campaigns.filter((campaign) =>
    PENDING_EARNING_STATUSES.has(campaign.status),
  );
  const overdueCount = deliveryCampaigns.filter(isOverdue).length;
  const submittedCount = campaigns.filter(
    (campaign) => campaign.status === 'delivery_submitted',
  ).length;
  const completedCount = campaigns.filter((campaign) => campaign.status === 'completed').length;
  const trackedHealthCount = campaigns.filter((campaign) =>
    HEALTH_TRACKED_STATUSES.has(campaign.status),
  ).length;
  const deliveryScore = trackedHealthCount
    ? clampPercent(Math.round(((submittedCount + completedCount) / trackedHealthCount) * 100))
    : 78;
  const approvalScore =
    submittedCount + completedCount > 0
      ? clampPercent(Math.round((completedCount / (submittedCount + completedCount)) * 82) + 18)
      : 72;
  const earningsScore =
    pendingEarningCampaigns.length > 0
      ? clampPercent(
          Math.round((pendingEarningCampaigns.length / Math.max(trackedHealthCount, 1)) * 100),
        )
      : earnings?.total_earnings
        ? 82
        : 58;
  const reliabilityScore =
    deliveryCampaigns.length > 0 ? clampPercent(100 - overdueCount * 28 - dueTodayCount * 8) : 92;
  const healthRadarMetrics = [
    { label: 'Delivery', value: deliveryScore },
    { label: 'Approval', value: approvalScore },
    { label: 'Earnings', value: earningsScore },
    { label: 'Tier', value: tier.progressPercent },
    { label: 'Reliable', value: reliabilityScore },
  ];
  const healthScore = averagePercent(healthRadarMetrics.map((metric) => metric.value));
  const cards = [
    {
      imageSource: campaignInsightIcon,
      title: 'Delivery Due',
      value: loading
        ? '--'
        : dueTodayCount > 0
          ? `${dueTodayCount} today`
          : `${deliveryCampaigns.length} open`,
      subtitle:
        dueTodayCount > 0
          ? `Ship ${pluralize(dueTodayCount, 'campaign')} before the day ends`
          : deliveryCampaigns.length > 0
            ? 'Accepted campaigns waiting for content'
            : 'No delivery tasks due today',
      accentColor: '#F6C967',
    },
    {
      imageSource: coinInsightIcon,
      title: 'Pending Earnings',
      value: loading ? '--' : formatPaiseAsINR(earnings?.pending_earnings),
      subtitle:
        pendingEarningCampaigns.length > 0
          ? `${pendingEarningCampaigns.length} ${pluralize(
              pendingEarningCampaigns.length,
              'campaign',
            )} tied to delivery or approval`
          : 'No secured earnings waiting right now',
      accentColor: '#F4B860',
    },
    {
      imageSource: medalInsightIcon,
      title: 'Tier Progress',
      value: loading ? '--' : `${tier.progressPercent}%`,
      subtitle: tier.progressLabel,
      accentColor: '#FFE0A4',
    },
    {
      title: 'Campaign Health',
      value: loading ? '--' : `${healthScore}%`,
      subtitle:
        trackedHealthCount > 0
          ? 'Radar across your active creator cycle'
          : 'Radar across 5 creator signals',
      accentColor: '#9AF4E4',
      radarMetrics: healthRadarMetrics,
    },
  ];

  return (
    <View style={insightStyles.section}>
      <View style={insightStyles.header}>
        <Text style={insightStyles.title}>Daily Insights</Text>
        <Text style={insightStyles.subtitle}>{"Today's update on your focus"}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + theme.spacing.md}
        style={insightStyles.scrollerFrame}
        contentContainerStyle={[insightStyles.scroller, { paddingHorizontal: sidePeekPadding }]}
      >
        {cards.map((card) => (
          <InsightCard key={card.title} {...card} width={cardWidth} />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const profile = useInfluencerProfile();
  const bootstrap = useBootstrap();
  const earnings = useEarnings();
  const campaigns = useCampaigns({ sort: 'created_desc' });

  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const profileLoading = bootstrapLoading || shouldShowInitialLoader(profile);
  const earningsLoading = bootstrapLoading || shouldShowInitialLoader(earnings);
  const campaignsLoading = bootstrapLoading || shouldShowInitialLoader(campaigns);
  const heroLoading = profileLoading || earningsLoading;

  return (
    <Screen
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingTop: getAppHeaderScreenTopPadding(insets.top),
      }}
    >
      <AppHeader
        title="Home"
        showLogoTitle
        logoAccessibilityLabel="Plugoh home"
        profile={{
          imageUri: profile.data?.profile_photo_url,
          onPress: () => {
            router.push('/(app)/profile');
          },
        }}
      />

      <HomeTierHero earnings={earnings.data} loading={heroLoading} />

      <DailyInsightsSection
        earnings={earnings.data}
        campaigns={campaigns.data?.items ?? []}
        loading={earningsLoading || campaignsLoading}
      />
    </Screen>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const heroStyles = StyleSheet.create({
  section: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: -theme.spacing.xxl,
    minHeight: 410,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xxl,
  },
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 82,
    paddingVertical: theme.spacing.sm,
    zIndex: 1,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  metricLabel: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.54)',
    textAlign: 'center',
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  metricValue: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.94)',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

const insightStyles = StyleSheet.create({
  section: {
    gap: theme.spacing.lg,
    marginTop: -theme.spacing.xs,
  },
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  subtitle: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.58)',
  },
  scrollerFrame: {
    marginHorizontal: -theme.spacing.xxl,
  },
  scroller: {
    gap: theme.spacing.md,
  },
  card: {
    minHeight: 284,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radarCard: {
    paddingTop: theme.spacing.md,
  },
  assetStage: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  assetGlow: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    opacity: 0.2,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  assetImage: {
    width: 74,
    height: 74,
  },
  radarWrap: {
    width: 220,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  radarGlow: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    opacity: 0.12,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  cardCopy: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
    includeFontPadding: false,
  },
  cardValue: {
    fontFamily: theme.typography.display.fontFamily,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.96)',
    textAlign: 'center',
    includeFontPadding: false,
  },
  cardSubtitle: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.48)',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
