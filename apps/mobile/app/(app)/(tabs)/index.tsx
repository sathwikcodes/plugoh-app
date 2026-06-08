import contentDeliveryImage from '@/assets/images/content_delivery.png';
import crystalImage from '@/assets/images/crystal.png';
import pendingEarningsImage from '@/assets/images/pending_earnings.png';
import { BrandAvatar } from '@/components/inbox/brand-avatar';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CampaignListItem, CampaignStatus } from '@plugoh/contracts';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function isDueTomorrow(campaign: CampaignListItem) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return campaign.due_date === localDateKey(tomorrow);
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

function formatDueLabel(campaign?: CampaignListItem | null) {
  if (!campaign?.due_date) return 'No due date set';
  if (isOverdue(campaign)) return 'Overdue';
  if (isDueToday(campaign)) return 'Due today';
  if (isDueTomorrow(campaign)) return 'Due tomorrow';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${campaign.due_date}T00:00:00`));
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function displayCampaignTitle(campaign: CampaignListItem) {
  return campaign.ai_title?.trim() || campaign.title.trim() || 'Campaign delivery';
}

function formatPackageType(pkg?: string) {
  if (!pkg) return 'Booked campaign';
  return pkg
    .replaceAll('_', ' ')
    .replaceAll('+', ' + ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function brandName(campaign: CampaignListItem) {
  return campaign.business_profile?.brand_name?.trim() || 'Plugoh brand';
}

function brandImageUri(campaign: CampaignListItem) {
  return (
    campaign.business_profile?.profile_photo_url?.trim() ||
    campaign.business_profile?.ig_profile_picture_url?.trim() ||
    campaign.business_profile?.avatar_url?.trim() ||
    null
  );
}

function campaignEarningLabel(campaign?: CampaignListItem | null) {
  if (!campaign) return 'Awaiting approval';
  const paise =
    campaign.price_offered_paise ??
    (typeof campaign.price_offered === 'number' ? campaign.price_offered * 100 : null);
  return paise == null ? 'Awaiting approval' : formatPaiseAsINR(paise);
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

function DeliveryFocusCard({
  campaigns,
  deliveryCampaigns,
  loading,
  width,
}: {
  campaigns: CampaignListItem[];
  deliveryCampaigns: CampaignListItem[];
  loading: boolean;
  width: number;
}) {
  const activeCampaigns = campaigns.filter((campaign) =>
    HEALTH_TRACKED_STATUSES.has(campaign.status),
  );
  const displayCampaigns = activeCampaigns.length > 0 ? activeCampaigns : campaigns;
  const sortedDeliveryCampaigns = [...deliveryCampaigns].sort(compareByDeliveryUrgency);
  const featuredCampaign =
    sortedDeliveryCampaigns.length > 0
      ? sortedDeliveryCampaigns[0]
      : displayCampaigns.length > 0
        ? displayCampaigns[0]
        : null;
  const visibleCampaigns = displayCampaigns.slice(0, 5);
  const overflowCampaignCount = Math.max(displayCampaigns.length - visibleCampaigns.length, 0);
  const deliveryCount = deliveryCampaigns.length;
  const deliveryLabel = loading
    ? 'Checking deliveries'
    : `${deliveryCount} ${pluralize(deliveryCount, 'delivery', 'deliveries')} left`;

  return (
    <View style={[insightStyles.deliveryCard, { width }]}>
      <View style={insightStyles.deliveryHeader}>
        <View style={insightStyles.deliveryHeaderCopy}>
          <Text
            style={insightStyles.deliveryTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            Delivery
          </Text>
          <Text style={insightStyles.deliverySummary} numberOfLines={1}>
            {deliveryLabel}
          </Text>
        </View>
        <Image
          source={contentDeliveryImage}
          style={insightStyles.deliveryHeroImage}
          contentFit="contain"
          accessible
          accessibilityLabel="Content delivery setup"
        />
      </View>

      {featuredCampaign ? (
        <Pressable
          onPress={() => {
            router.push(`/(app)/campaigns/${featuredCampaign.id}`);
          }}
          accessibilityRole="button"
          accessibilityLabel={`View ${displayCampaignTitle(featuredCampaign)} from ${brandName(
            featuredCampaign,
          )}`}
          style={({ pressed }) => [
            insightStyles.featuredCampaign,
            pressed ? insightStyles.featuredCampaignPressed : null,
          ]}
        >
          <BrandAvatar
            imageUri={brandImageUri(featuredCampaign)}
            name={brandName(featuredCampaign)}
            size={46}
            textSize={16}
          />
          <View style={insightStyles.featuredCopy}>
            <Text style={insightStyles.featuredTitle} numberOfLines={1}>
              {brandName(featuredCampaign)}
            </Text>
            <Text style={insightStyles.featuredBrand} numberOfLines={1}>
              {formatPackageType(featuredCampaign.package_type)}
            </Text>
            <Text style={insightStyles.featuredDue} numberOfLines={1}>
              {formatDueLabel(featuredCampaign)}
            </Text>
          </View>
          <View style={insightStyles.chevronBubble} pointerEvents="none">
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.72)" />
          </View>
        </Pressable>
      ) : (
        <View style={insightStyles.deliveryEmpty}>
          <Text style={insightStyles.deliveryEmptyTitle}>All clear</Text>
          <Text style={insightStyles.deliveryEmptySubtitle}>
            New brand campaigns will appear here when they need attention.
          </Text>
        </View>
      )}

      <View style={insightStyles.deliveryMeta}>
        <View style={insightStyles.metaBlock}>
          <Text style={insightStyles.metaLabel}>Active brand campaigns</Text>
          <View style={insightStyles.activeAvatarRow}>
            {visibleCampaigns.length > 0 ? (
              <>
                {visibleCampaigns.map((campaign, index) => (
                  <View
                    key={`active-${campaign.id}`}
                    style={[
                      insightStyles.activeAvatarItem,
                      index > 0 ? { marginLeft: -theme.spacing.xs } : null,
                    ]}
                  >
                    <BrandAvatar
                      imageUri={brandImageUri(campaign)}
                      name={brandName(campaign)}
                      size={38}
                      textSize={13}
                    />
                  </View>
                ))}
                {overflowCampaignCount > 0 ? (
                  <View style={[insightStyles.activeAvatarMore, { marginLeft: -theme.spacing.xs }]}>
                    <Text style={insightStyles.activeAvatarMoreText}>+{overflowCampaignCount}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={insightStyles.metaMuted}>No active brands</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function PendingEarningsFocusCard({
  earnings,
  campaigns,
  pendingCampaigns,
  loading,
  width,
}: {
  earnings: ReturnType<typeof useEarnings>['data'];
  campaigns: CampaignListItem[];
  pendingCampaigns: CampaignListItem[];
  loading: boolean;
  width: number;
}) {
  const activeCampaigns = campaigns.filter((campaign) =>
    HEALTH_TRACKED_STATUSES.has(campaign.status),
  );
  const displayCampaigns =
    pendingCampaigns.length > 0
      ? pendingCampaigns
      : activeCampaigns.length > 0
        ? activeCampaigns
        : campaigns;
  const featuredCampaign =
    pendingCampaigns.length > 0
      ? pendingCampaigns[0]
      : displayCampaigns.length > 0
        ? displayCampaigns[0]
        : null;
  const visibleCampaigns = displayCampaigns.slice(0, 5);
  const overflowCampaignCount = Math.max(displayCampaigns.length - visibleCampaigns.length, 0);
  const earningsLabel = loading
    ? 'Checking earnings'
    : formatPaiseAsINR(earnings?.pending_earnings);

  return (
    <View style={[insightStyles.deliveryCard, { width }]}>
      <View style={insightStyles.deliveryHeader}>
        <View style={insightStyles.deliveryHeaderCopy}>
          <Text
            style={insightStyles.deliveryTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            Pending Earnings
          </Text>
          <Text style={insightStyles.deliverySummary} numberOfLines={1}>
            {earningsLabel}
          </Text>
        </View>
        <Image
          source={pendingEarningsImage}
          style={insightStyles.deliveryHeroImage}
          contentFit="contain"
          accessible
          accessibilityLabel="Pending earnings"
        />
      </View>

      {featuredCampaign ? (
        <Pressable
          onPress={() => {
            router.push(`/(app)/campaigns/${featuredCampaign.id}`);
          }}
          accessibilityRole="button"
          accessibilityLabel={`View pending earnings for ${brandName(featuredCampaign)}`}
          style={({ pressed }) => [
            insightStyles.featuredCampaign,
            pressed ? insightStyles.featuredCampaignPressed : null,
          ]}
        >
          <BrandAvatar
            imageUri={brandImageUri(featuredCampaign)}
            name={brandName(featuredCampaign)}
            size={46}
            textSize={16}
          />
          <View style={insightStyles.featuredCopy}>
            <Text style={insightStyles.featuredTitle} numberOfLines={1}>
              {brandName(featuredCampaign)}
            </Text>
            <Text style={insightStyles.featuredBrand} numberOfLines={1}>
              {formatPackageType(featuredCampaign.package_type)}
            </Text>
            <Text style={insightStyles.featuredDue} numberOfLines={1}>
              {campaignEarningLabel(featuredCampaign)}
            </Text>
          </View>
          <View style={insightStyles.chevronBubble} pointerEvents="none">
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.72)" />
          </View>
        </Pressable>
      ) : (
        <View style={insightStyles.deliveryEmpty}>
          <Text style={insightStyles.deliveryEmptyTitle}>Nothing pending</Text>
          <Text style={insightStyles.deliveryEmptySubtitle}>
            Campaign earnings will appear here after delivery or approval.
          </Text>
        </View>
      )}

      <View style={insightStyles.deliveryMeta}>
        <View style={insightStyles.metaBlock}>
          <Text style={insightStyles.metaLabel}>Pending campaigns</Text>
          <View style={insightStyles.activeAvatarRow}>
            {visibleCampaigns.length > 0 ? (
              <>
                {visibleCampaigns.map((campaign, index) => (
                  <View
                    key={`earning-${campaign.id}`}
                    style={[
                      insightStyles.activeAvatarItem,
                      index > 0 ? { marginLeft: -theme.spacing.xs } : null,
                    ]}
                  >
                    <BrandAvatar
                      imageUri={brandImageUri(campaign)}
                      name={brandName(campaign)}
                      size={38}
                      textSize={13}
                    />
                  </View>
                ))}
                {overflowCampaignCount > 0 ? (
                  <View style={[insightStyles.activeAvatarMore, { marginLeft: -theme.spacing.xs }]}>
                    <Text style={insightStyles.activeAvatarMoreText}>+{overflowCampaignCount}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={insightStyles.metaMuted}>No pending campaigns</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function TierProgressFocusCard({
  earnings,
  loading,
  width,
}: {
  earnings: ReturnType<typeof useEarnings>['data'];
  loading: boolean;
  width: number;
}) {
  const tier = getTierDisplay(earnings?.tier, earnings?.tier_progress);
  const badgeCatalog = getTierBadgeCatalog(tier.key);
  const currentBadge = badgeCatalog.find((item) => item.current) ?? badgeCatalog[0];

  return (
    <View style={[insightStyles.deliveryCard, { width }]}>
      <View style={insightStyles.deliveryHeader}>
        <View style={insightStyles.deliveryHeaderCopy}>
          <Text
            style={insightStyles.deliveryTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            Tier Progress
          </Text>
          <Text style={insightStyles.deliverySummary} numberOfLines={1}>
            {loading ? 'Checking tier' : `${tier.progressPercent}% complete`}
          </Text>
        </View>
        <Image
          source={crystalImage}
          style={insightStyles.deliveryHeroImage}
          contentFit="contain"
          accessible
          accessibilityLabel="Tier progress crystal"
        />
      </View>

      <Pressable
        onPress={() => {
          router.push('/(app)/profile');
        }}
        accessibilityRole="button"
        accessibilityLabel={`View ${tier.label} tier progress`}
        style={({ pressed }) => [
          insightStyles.featuredCampaign,
          pressed ? insightStyles.featuredCampaignPressed : null,
        ]}
      >
        <View
          style={[
            insightStyles.tierBadge,
            {
              backgroundColor: currentBadge.visual.face,
              borderColor: currentBadge.visual.rim,
            },
          ]}
        >
          <Text style={insightStyles.tierBadgeText}>{currentBadge.label.charAt(0)}</Text>
        </View>
        <View style={insightStyles.featuredCopy}>
          <Text style={insightStyles.featuredTitle} numberOfLines={1}>
            {tier.label} tier
          </Text>
          <Text style={insightStyles.featuredBrand} numberOfLines={1}>
            {tier.progressLabel}
          </Text>
          <Text style={insightStyles.featuredDue} numberOfLines={1}>
            {currentBadge.visual.material}
          </Text>
        </View>
        <View style={insightStyles.chevronBubble} pointerEvents="none">
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.72)" />
        </View>
      </Pressable>

      <View style={insightStyles.deliveryMeta}>
        <View style={insightStyles.metaBlock}>
          <Text style={insightStyles.metaLabel}>Tier milestones</Text>
          <View style={insightStyles.tierMilestoneRow}>
            {badgeCatalog.map((badge, index) => (
              <View
                key={badge.key}
                style={[
                  insightStyles.tierMilestoneItem,
                  {
                    backgroundColor: badge.unlocked ? badge.visual.face : 'rgba(255,255,255,0.08)',
                    borderColor: badge.current ? badge.visual.rim : 'rgba(255,255,255,0.14)',
                    opacity: badge.unlocked ? 1 : 0.48,
                  },
                  index > 0 ? { marginLeft: -theme.spacing.xs } : null,
                ]}
              >
                <Text style={insightStyles.tierMilestoneText}>{badge.label.charAt(0)}</Text>
              </View>
            ))}
          </View>
        </View>
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
  const cardWidth = Math.min(Math.max(window.width * 0.82, 300), 348);
  const sidePeekPadding = Math.max(0, (window.width - cardWidth) / 2);
  const deliveryCampaigns = campaigns.filter((campaign) =>
    DELIVERY_ACTION_STATUSES.has(campaign.status),
  );
  const pendingEarningCampaigns = campaigns.filter((campaign) =>
    PENDING_EARNING_STATUSES.has(campaign.status),
  );

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
        <DeliveryFocusCard
          campaigns={campaigns}
          deliveryCampaigns={deliveryCampaigns}
          loading={loading}
          width={cardWidth}
        />
        <PendingEarningsFocusCard
          earnings={earnings}
          campaigns={campaigns}
          pendingCampaigns={pendingEarningCampaigns}
          loading={loading}
          width={cardWidth}
        />
        <TierProgressFocusCard earnings={earnings} loading={loading} width={cardWidth} />
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
  deliveryCard: {
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    overflow: 'hidden',
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  deliveryHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  deliveryHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  deliveryTitle: {
    fontFamily: theme.typography.display.fontFamily,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.96)',
    includeFontPadding: false,
  },
  deliverySummary: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    includeFontPadding: false,
  },
  deliveryHeroImage: {
    width: 82,
    height: 76,
    marginTop: -theme.spacing.xs,
    marginRight: -theme.spacing.xs,
    flexShrink: 0,
  },
  featuredCampaign: {
    minHeight: 98,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  featuredCampaignPressed: {
    opacity: 0.78,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  featuredCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  featuredTitle: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.96)',
    includeFontPadding: false,
  },
  featuredBrand: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.64)',
    includeFontPadding: false,
  },
  featuredDue: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '700',
    color: '#F6C967',
    includeFontPadding: false,
  },
  chevronBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadgeText: {
    fontFamily: theme.typography.display.fontFamily,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deliveryEmpty: {
    minHeight: 98,
    justifyContent: 'center',
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: theme.spacing.md,
    gap: 4,
  },
  deliveryEmptyTitle: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    includeFontPadding: false,
  },
  deliveryEmptySubtitle: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    includeFontPadding: false,
  },
  deliveryMeta: {
    gap: theme.spacing.sm,
  },
  metaBlock: {
    gap: theme.spacing.md,
  },
  metaLabel: {
    fontFamily: theme.typography.display.fontFamily,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    includeFontPadding: false,
  },
  activeAvatarRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeAvatarItem: {
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(5,5,9,0.86)',
  },
  activeAvatarMore: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(5,5,9,0.86)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatarMoreText: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.74)',
    includeFontPadding: false,
  },
  tierMilestoneRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierMilestoneItem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierMilestoneText: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.24)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaMuted: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.38)',
    includeFontPadding: false,
  },
});
