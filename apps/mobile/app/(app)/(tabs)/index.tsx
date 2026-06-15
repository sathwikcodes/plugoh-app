import contentDeliveryImage from '@/assets/images/content_delivery.png';
import crystalImage from '@/assets/images/crystal.png';
import pendingEarningsImage from '@/assets/images/pending_earnings.png';
import rocketImage from '@/assets/images/rocket.png';
import { TierAssetBadge } from '@/components/influencer/tier-asset-badge';
import { TierBadgeCarousel } from '@/components/influencer/tier-badge-carousel';
import { getTabScreenBottomPadding } from '@/components/navigation/native-tab-config';
import { HomeScreenWithStickyHeader, StickyHomeHeader } from '@/components/ui/sticky-home-header';
import { ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useCampaigns,
  useEarnings,
  useInfluencerProfile,
} from '@/hooks/use-marketplace';
import {
  formatPaiseAsINR,
  getTierBadgeCatalog,
  getTierDisplay,
  getTierUnlockCopy,
} from '@/lib/influencer/home-tier';
import { influencerProfileImageUri } from '@/lib/influencer/profile-image';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import type { CampaignListItem, CampaignStatus } from '@plugoh/contracts';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── helpers ──────────────────────────────────────────────────────────────────

const DELIVERY_ACTION_STATUSES = new Set<CampaignStatus>(['in_escrow', 'changes_requested']);
const PENDING_EARNING_STATUSES = new Set<CampaignStatus>(['in_escrow', 'delivery_submitted']);
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

function campaignDueTime(campaign: CampaignListItem) {
  if (!campaign.due_date) return Number.MAX_SAFE_INTEGER;
  return new Date(`${campaign.due_date}T00:00:00`).getTime();
}

function compareByDeliveryUrgency(a: CampaignListItem, b: CampaignListItem) {
  const aOverdue = isOverdue(a) ? 0 : 1;
  const bOverdue = isOverdue(b) ? 0 : 1;
  if (aOverdue !== bOverdue) return aOverdue - bOverdue;
  return campaignDueTime(a) - campaignDueTime(b);
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function formatPaiseAsCompactEarnings(value?: number | null) {
  const paise = value ?? 0;
  const rupees = Number.isFinite(paise) ? paise / 100 : 0;
  const absoluteRupees = Math.abs(rupees);

  if (absoluteRupees < 1000) {
    return {
      value: new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0,
      }).format(rupees),
      suffix: '',
    };
  }

  const thousands = rupees / 1000;
  const compactValue = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: absoluteRupees >= 100000 ? 0 : 1,
  }).format(thousands);

  return {
    value: compactValue,
    suffix: 'k',
  };
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

function LiquidInsightSurface({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle: StyleProp<ViewStyle>;
}) {
  const content = <View style={[insightStyles.glassContent, contentStyle]}>{children}</View>;

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        isInteractive
        glassEffectStyle="regular"
        colorScheme="dark"
        style={insightStyles.glassShell}
      >
        {content}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={80} style={insightStyles.glassShell}>
      {content}
    </BlurView>
  );
}

function PendingEscrowPill() {
  const content = (
    <View style={insightStyles.pendingEscrowPillContent}>
      <Text style={insightStyles.pendingEscrowText} numberOfLines={1}>
        In escrow
      </Text>
    </View>
  );

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="clear"
        colorScheme="dark"
        tintColor="rgba(255,203,82,0.2)"
        style={insightStyles.pendingEscrowPill}
      >
        {content}
      </GlassView>
    );
  }

  return (
    <BlurView tint="light" intensity={20} style={insightStyles.pendingEscrowPill}>
      {content}
    </BlurView>
  );
}

function DeliveryActionPill() {
  const content = (
    <View style={insightStyles.pendingEscrowPillContent}>
      <Text
        style={[insightStyles.pendingEscrowText, insightStyles.deliveryActionText]}
        numberOfLines={1}
      >
        Deliver
      </Text>
    </View>
  );

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="clear"
        colorScheme="dark"
        tintColor="rgba(73,220,137,0.22)"
        style={[insightStyles.pendingEscrowPill, insightStyles.deliveryActionPill]}
      >
        {content}
      </GlassView>
    );
  }

  return (
    <BlurView
      tint="light"
      intensity={20}
      style={[insightStyles.pendingEscrowPill, insightStyles.deliveryActionPill]}
    >
      {content}
    </BlurView>
  );
}

function TierProgressBadgePreview({
  item,
}: {
  item: ReturnType<typeof getTierBadgeCatalog>[number];
}) {
  return (
    <View style={insightStyles.tierBadgePreviewFrame}>
      <View style={insightStyles.tierBadgePreviewScale}>
        <TierAssetBadge item={item} active />
      </View>
    </View>
  );
}

function getDeliveryInsight(deliveryCampaigns: CampaignListItem[], loading: boolean) {
  if (loading) {
    return {
      value: '...',
      pillLabel: 'Checking',
      shortLabel: 'Checking',
      pillTone: 'muted' as const,
    };
  }

  const deliveryCount = deliveryCampaigns.length;
  const overdueCount = deliveryCampaigns.filter(isOverdue).length;
  const todayCount = deliveryCampaigns.filter(isDueToday).length;

  if (deliveryCount === 0) {
    return {
      value: '0',
      pillLabel: 'All clear',
      shortLabel: 'deliveries left',
      pillTone: 'success' as const,
    };
  }

  if (overdueCount > 0) {
    return {
      value: String(deliveryCount),
      pillLabel: `${overdueCount} overdue`,
      shortLabel: `${pluralize(deliveryCount, 'delivery')} left`,
      pillTone: 'warning' as const,
    };
  }

  if (todayCount > 0) {
    return {
      value: String(deliveryCount),
      pillLabel: `${todayCount} due today`,
      shortLabel: `${pluralize(deliveryCount, 'delivery')} left`,
      pillTone: 'warning' as const,
    };
  }

  return {
    value: String(deliveryCount),
    pillLabel: `${deliveryCount} ${pluralize(deliveryCount, 'delivery')} left`,
    shortLabel: `${pluralize(deliveryCount, 'delivery')} left`,
    pillTone: 'muted' as const,
  };
}

function routeToCampaignOrList(campaigns: CampaignListItem[]) {
  if (campaigns.length > 0) {
    const [campaign] = campaigns;
    router.push(`/(app)/campaigns/${campaign.id}`);
    return;
  }

  router.push('/(app)/(tabs)/campaigns');
}

function DeliveryFocusCard({
  deliveryCampaigns,
  loading,
}: {
  deliveryCampaigns: CampaignListItem[];
  loading: boolean;
}) {
  const sortedDeliveryCampaigns = [...deliveryCampaigns].sort(compareByDeliveryUrgency);
  const insight = getDeliveryInsight(deliveryCampaigns, loading);

  return (
    <Pressable
      onPress={() => {
        routeToCampaignOrList(sortedDeliveryCampaigns);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${insight.value} delivery campaigns. ${insight.pillLabel}`}
      style={({ pressed }) => [insightStyles.focusNode, pressed ? insightStyles.tilePressed : null]}
    >
      <LiquidInsightSurface contentStyle={insightStyles.focusNodeContent}>
        <View style={[insightStyles.focusNodeHeader, insightStyles.deliveryNodeHeader]}>
          <Image
            source={contentDeliveryImage}
            style={[insightStyles.focusNodeImage, insightStyles.focusNodeLargeImage]}
            contentFit="contain"
            accessible
            accessibilityLabel="Content delivery"
          />
          <View style={insightStyles.deliveryNodeTitleWrap}>
            <View style={insightStyles.deliveryNodeMetricRow}>
              <Text
                style={insightStyles.deliveryNodeValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {insight.value}
              </Text>
              <Text style={insightStyles.deliveryNodeSubtitle} numberOfLines={1}>
                {insight.shortLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={insightStyles.focusNodeSpacer} />

        <View style={insightStyles.pendingEscrowDock}>
          <DeliveryActionPill />
        </View>
      </LiquidInsightSurface>
    </Pressable>
  );
}

function PendingEarningsFocusCard({
  earnings,
  pendingCampaigns,
  loading,
}: {
  earnings: ReturnType<typeof useEarnings>['data'];
  pendingCampaigns: CampaignListItem[];
  loading: boolean;
}) {
  const earningsMetric = loading
    ? { value: '...', suffix: '' }
    : formatPaiseAsCompactEarnings(earnings?.pending_earnings);
  const earningsLabel = `${earningsMetric.value}${earningsMetric.suffix}`;

  return (
    <Pressable
      onPress={() => {
        routeToCampaignOrList(pendingCampaigns);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${earningsLabel} pending earnings in escrow`}
      style={({ pressed }) => [insightStyles.focusNode, pressed ? insightStyles.tilePressed : null]}
    >
      <LiquidInsightSurface contentStyle={insightStyles.focusNodeContent}>
        <View style={[insightStyles.focusNodeHeader, insightStyles.pendingNodeHeader]}>
          <Image
            source={pendingEarningsImage}
            style={[insightStyles.focusNodeImage, insightStyles.focusNodeLargeImage]}
            contentFit="contain"
            accessible
            accessibilityLabel="Pending earnings"
          />
          <View style={insightStyles.pendingNodeTitleWrap}>
            <View style={insightStyles.pendingNodeMetricRow}>
              <Text
                style={insightStyles.pendingNodeAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.64}
              >
                {earningsMetric.value}
              </Text>
              {earningsMetric.suffix ? (
                <Text style={insightStyles.pendingNodeSuffix} numberOfLines={1}>
                  {earningsMetric.suffix}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={insightStyles.focusNodeSpacer} />

        <View style={insightStyles.pendingEscrowDock}>
          <PendingEscrowPill />
        </View>
      </LiquidInsightSurface>
    </Pressable>
  );
}

function TierProgressFocusCard({
  earnings,
  loading,
}: {
  earnings: ReturnType<typeof useEarnings>['data'];
  loading: boolean;
}) {
  const tier = getTierDisplay(earnings?.tier, earnings?.tier_progress);
  const tierBadges = getTierBadgeCatalog(tier.key);
  const currentBadge = tierBadges.find((item) => item.current) ?? tierBadges[0];
  const progressPercent = loading ? 0 : tier.progressPercent;
  const progressLabel = loading ? '--' : `${progressPercent}%`;
  const unlockCopy = loading
    ? 'Checking next tier'
    : getTierUnlockCopy(tier.key, earnings?.total_earnings);

  return (
    <Pressable
      onPress={() => {
        router.push('/(app)/profile');
      }}
      accessibilityRole="button"
      accessibilityLabel={`View ${tier.label} tier progress, ${tier.progressPercent}% complete`}
      style={({ pressed }) => [
        insightStyles.tierProgressCard,
        pressed ? insightStyles.tilePressed : null,
      ]}
    >
      <LiquidInsightSurface contentStyle={insightStyles.tierProgressContent}>
        <View style={insightStyles.tierProgressHeader}>
          <Text
            style={insightStyles.tierProgressTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.76}
          >
            Progress
          </Text>
          <Image
            source={crystalImage}
            style={insightStyles.tierCrystalImage}
            contentFit="contain"
            accessible
            accessibilityLabel="Next tier crystal"
          />
        </View>

        <View style={insightStyles.tierProgressBody}>
          <TierProgressBadgePreview item={currentBadge} />
          <View style={insightStyles.tierProgressStats}>
            <Text style={insightStyles.tierCurrentLabel} numberOfLines={1}>
              {tier.label}
            </Text>
            <Text style={insightStyles.tierMaterialLabel} numberOfLines={1}>
              {currentBadge.visual.material}
            </Text>
          </View>
          <Text style={insightStyles.tierPercent} numberOfLines={1}>
            {progressLabel}
          </Text>
        </View>

        <View style={insightStyles.progressTrack}>
          <LinearGradient
            colors={['#E0A728', '#FFE7A3', '#C88718']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[insightStyles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>
        <Text style={insightStyles.tierUnlockText} numberOfLines={1}>
          {unlockCopy}
        </Text>
      </LiquidInsightSurface>
    </Pressable>
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
  const deliveryCampaigns = campaigns.filter((campaign) =>
    DELIVERY_ACTION_STATUSES.has(campaign.status),
  );
  const pendingEarningCampaigns = campaigns.filter((campaign) =>
    PENDING_EARNING_STATUSES.has(campaign.status),
  );

  return (
    <View style={insightStyles.section}>
      <View style={insightStyles.insightStack}>
        <View style={insightStyles.header}>
          <View style={insightStyles.headingCopy}>
            <Text style={insightStyles.title}>Daily Insights</Text>
            <Text style={insightStyles.subtitle}>{"Today's update on your focus"}</Text>
          </View>
          <Image
            source={rocketImage}
            style={insightStyles.rocketImage}
            contentFit="contain"
            accessible={false}
          />
        </View>
        <View style={insightStyles.focusPair}>
          <DeliveryFocusCard deliveryCampaigns={deliveryCampaigns} loading={loading} />
          <PendingEarningsFocusCard
            earnings={earnings}
            pendingCampaigns={pendingEarningCampaigns}
            loading={loading}
          />
        </View>
        <TierProgressFocusCard earnings={earnings} loading={loading} />
      </View>
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
  const profileImageUri = influencerProfileImageUri(profile.data);

  return (
    <HomeScreenWithStickyHeader
      insetTop={insets.top}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingBottom: getTabScreenBottomPadding(insets.bottom),
      }}
      header={
        <StickyHomeHeader
          insetTop={insets.top}
          title="Home"
          showLogoTitle
          showBackground={false}
          logoAccessibilityLabel="Plugoh home"
          profile={{
            imageUri: profileImageUri,
            onPress: () => {
              router.push('/(app)/profile');
            },
          }}
        />
      }
    >
      <HomeTierHero earnings={earnings.data} loading={heroLoading} />

      <DailyInsightsSection
        earnings={earnings.data}
        campaigns={campaigns.data?.items ?? []}
        loading={earningsLoading || campaignsLoading}
      />
    </HomeScreenWithStickyHeader>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const heroStyles = StyleSheet.create({
  section: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: -theme.spacing.xxl,
    minHeight: 385,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xxl,
  },
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    marginTop: -theme.spacing.md,
  },
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
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
  rocketImage: {
    width: 48,
    height: 48,
    marginLeft: theme.spacing.lg,
    marginRight: theme.spacing.xs,
  },
  insightStack: {
    gap: theme.spacing.md,
  },
  focusPair: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  glassShell: {
    flex: 1,
    borderRadius: 32,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  glassContent: {
    flex: 1,
  },
  focusNode: {
    flex: 1,
    minWidth: 0,
    minHeight: 198,
    borderRadius: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 5,
  },
  focusNodeContent: {
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  tilePressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  focusNodeHeader: {
    minHeight: 118,
    gap: theme.spacing.lg,
  },
  deliveryNodeHeader: {
    minHeight: 122,
  },
  pendingNodeHeader: {
    minHeight: 122,
  },
  focusNodeImage: {
    width: 36,
    height: 36,
    flexShrink: 0,
  },
  focusNodeLargeImage: {
    width: 46,
    height: 46,
  },
  deliveryNodeTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: theme.spacing.xs,
    justifyContent: 'flex-end',
  },
  deliveryNodeMetricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    paddingLeft: theme.spacing.sm,
  },
  deliveryNodeValue: {
    fontFamily: theme.typography.display.fontFamily,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.96)',
    includeFontPadding: false,
  },
  deliveryNodeSubtitle: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.74)',
    paddingBottom: 5,
    includeFontPadding: false,
  },
  pendingNodeTitleWrap: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  pendingNodeMetricRow: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingLeft: theme.spacing.sm,
  },
  pendingNodeAmount: {
    flexShrink: 1,
    fontFamily: theme.typography.display.fontFamily,
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.96)',
    includeFontPadding: false,
  },
  pendingNodeSuffix: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.62)',
    paddingBottom: 5,
    includeFontPadding: false,
  },
  pendingEscrowPill: {
    width: '100%',
    minHeight: 38,
    borderRadius: 19,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,216,112,0.42)',
    backgroundColor: 'rgba(255,198,66,0.18)',
  },
  deliveryActionPill: {
    borderColor: 'rgba(118,255,172,0.42)',
    backgroundColor: 'rgba(57,199,112,0.18)',
  },
  deliveryActionText: {
    color: '#BFFFD2',
  },
  pendingEscrowDock: {
    alignItems: 'stretch',
  },
  pendingEscrowPillContent: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  pendingEscrowText: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#FFE7A8',
    includeFontPadding: false,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  focusNodeSpacer: {
    flex: 1,
    minHeight: 6,
  },
  tierProgressCard: {
    minHeight: 190,
    borderRadius: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 5,
  },
  tierProgressContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  tierProgressHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
  },
  tierProgressTitle: {
    fontFamily: theme.typography.body.fontFamily,
    flex: 1,
    minWidth: 0,
    paddingLeft: theme.spacing.sm,
    paddingTop: 1,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.82)',
    includeFontPadding: false,
  },
  tierCrystalImage: {
    width: 40,
    height: 40,
    marginRight: theme.spacing.sm,
  },
  tierProgressBody: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tierBadgePreviewFrame: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginLeft: -theme.spacing.xs,
  },
  tierBadgePreviewScale: {
    width: 222,
    height: 222,
    transform: [{ scale: 0.3 }],
  },
  tierProgressStats: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  tierCurrentLabel: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.86)',
    includeFontPadding: false,
  },
  tierMaterialLabel: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.56)',
    includeFontPadding: false,
  },
  tierPercent: {
    minWidth: 78,
    fontFamily: theme.typography.display.fontFamily,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.96)',
    includeFontPadding: false,
    marginLeft: theme.spacing.sm,
    textAlign: 'right',
    transform: [{ translateY: 5 }],
  },
  progressTrack: {
    width: '92%',
    alignSelf: 'center',
    marginTop: theme.spacing.xs,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,221,142,0.24)',
    backgroundColor: 'rgba(8,15,20,0.28)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  tierUnlockText: {
    width: '92%',
    alignSelf: 'center',
    marginTop: 2,
    paddingLeft: theme.spacing.xs,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.48)',
    includeFontPadding: false,
  },
});
