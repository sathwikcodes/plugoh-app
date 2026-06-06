import { AppHeader, APP_HEADER_SCREEN_TOP_PADDING } from '@/components/ui/app-header';
import { Screen, SectionTitle, StatusChip } from '@/components/ui/primitives';
import { ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useCampaigns,
  useEarnings,
  useInfluencerProfile,
} from '@/hooks/use-marketplace';
import { formatPaiseAsINR, getTierDisplay } from '@/lib/influencer/home-tier';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { Ionicons } from '@expo/vector-icons';
import type { CampaignListItem } from '@plugoh/contracts';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── helpers ──────────────────────────────────────────────────────────────────

const ACTIVE_CAMPAIGN_STATUSES = ['pre_authorized', 'in_escrow', 'delivery_submitted'] as const;

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '...' : s;
}

// ─── ActionCard ───────────────────────────────────────────────────────────────

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
    >
      <View style={styles.accentStrip} />
      <View style={styles.actionInner}>
        <Ionicons name={icon as never} size={20} color={theme.colors.rose} />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.62)" />
      </View>
    </Pressable>
  );
}

// ─── CampaignSpotlightCard ────────────────────────────────────────────────────

function CampaignSpotlightCard({ campaign }: { campaign: CampaignListItem }) {
  const brandName = campaign.business_profile?.brand_name;
  const price = campaign.price_offered_paise;
  const title = campaign.ai_title?.trim() || campaign.title;

  return (
    <Pressable
      onPress={() => {
        router.push('/(app)/(tabs)/campaigns');
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open campaign ${title}`}
      style={({ pressed }) => [styles.spotlightCard, pressed && { opacity: 0.85 }]}
    >
      <StatusChip
        label={
          campaign.status === 'in_escrow'
            ? 'In Escrow'
            : campaign.status === 'pre_authorized'
              ? 'Confirmed'
              : 'Delivery Submitted'
        }
        status={campaign.status}
      />
      <Text style={styles.spotlightTitle} numberOfLines={2}>
        {title}
      </Text>
      {brandName || price ? (
        <Text style={styles.spotlightMeta}>
          {[brandName, price ? formatPaiseAsINR(price) : null].filter(Boolean).join(' - ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ─── HomeTierHero ─────────────────────────────────────────────────────────────

function BadgePlaceholder({
  colors,
  label,
}: {
  colors: readonly [string, string, string];
  label: string;
}) {
  return (
    <View style={heroStyles.badgeStage} accessibilityLabel={`${label} tier badge placeholder`}>
      <View style={heroStyles.badgeShadow} />
      <LinearGradient
        colors={colors}
        locations={[0, 0.48, 1]}
        start={{ x: 0.08, y: 0.1 }}
        end={{ x: 0.88, y: 0.92 }}
        style={heroStyles.badgeGem}
      >
        <View style={heroStyles.badgeGlareLarge} />
        <View style={heroStyles.badgeGlareSmall} />
        <View style={heroStyles.badgeFacetOne} />
        <View style={heroStyles.badgeFacetTwo} />
      </LinearGradient>
      <View style={heroStyles.badgeBase} />
    </View>
  );
}

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

  return (
    <View style={heroStyles.section}>
      <BadgePlaceholder colors={tier.colors} label={tier.label} />

      <View style={heroStyles.metricStrip}>
        <HeroMetric label="Tier" value={tier.label} loading={loading} />
        <HeroMetric
          label="Earned"
          value={formatPaiseAsINR(earnings?.total_earnings)}
          loading={loading}
        />
        <HeroMetric label="Progress" value={`${tier.progressPercent}%`} loading={loading} />
      </View>
    </View>
  );
}

function InsightCard({
  icon,
  title,
  value,
  subtitle,
  colors,
  size,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  colors: readonly [string, string];
  size: number;
}) {
  return (
    <View style={[insightStyles.card, { width: size, height: size }]}>
      <LinearGradient
        colors={[colors[0] + '26', colors[1] + '12', 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[insightStyles.iconShell, { borderColor: colors[0] + '44' }]}>
        <Ionicons name={icon as never} size={30} color={colors[0]} />
      </View>
      <View style={insightStyles.cardCopy}>
        <Text style={insightStyles.cardTitle} numberOfLines={1}>
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
  activeCampaignCount,
  loading,
}: {
  earnings: ReturnType<typeof useEarnings>['data'];
  activeCampaignCount: number;
  loading: boolean;
}) {
  const window = useWindowDimensions();
  const cardSize = Math.min(Math.max(window.width - 72, 280), 390);
  const sidePeekPadding = Math.max(0, (window.width - cardSize) / 2);
  const tier = getTierDisplay(earnings?.tier, earnings?.tier_progress);
  const cards = [
    {
      icon: 'sparkles-outline',
      title: 'Tier Progress',
      value: loading ? '--' : `${tier.progressPercent}%`,
      subtitle: tier.progressLabel,
      colors: ['#9AF4E4', '#87BFFF'] as const,
    },
    {
      icon: 'wallet-outline',
      title: 'Secured Earnings',
      value: loading ? '--' : formatPaiseAsINR(earnings?.pending_earnings),
      subtitle: 'Waiting for release',
      colors: ['#FFD36E', '#FF8EC3'] as const,
    },
    {
      icon: 'briefcase-outline',
      title: 'Active Deals',
      value: loading ? '--' : String(activeCampaignCount),
      subtitle: activeCampaignCount === 1 ? 'Campaign in motion' : 'Campaigns in motion',
      colors: ['#B6FFCF', '#9AF4E4'] as const,
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
        snapToInterval={cardSize + theme.spacing.md}
        style={insightStyles.scrollerFrame}
        contentContainerStyle={[insightStyles.scroller, { paddingHorizontal: sidePeekPadding }]}
      >
        {cards.map((card) => (
          <InsightCard key={card.title} {...card} size={cardSize} />
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

  const pendingEarnings = earnings.data?.pending_earnings ?? 0;

  const activeCampaigns = (campaigns.data?.items ?? []).filter((c) =>
    ACTIVE_CAMPAIGN_STATUSES.includes(c.status as (typeof ACTIVE_CAMPAIGN_STATUSES)[number]),
  );
  const deliveryPending = activeCampaigns.find((c) => c.status === 'delivery_submitted');
  const showInstagramNudge = profile.data?.instagram_connected === false;
  const showPricingNudge = Boolean(profile.data) && (profile.data?.price_per_reel_paise ?? 0) <= 0;
  const hasActionItems =
    Boolean(deliveryPending) || showInstagramNudge || showPricingNudge || pendingEarnings > 0;

  return (
    <Screen
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingTop: insets.top + APP_HEADER_SCREEN_TOP_PADDING }}
    >
      <AppHeader
        title="Home"
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
        activeCampaignCount={activeCampaigns.length}
        loading={earningsLoading || campaignsLoading}
      />

      {!campaignsLoading && !profileLoading && hasActionItems && (
        <>
          <SectionTitle eyebrow="Needs Attention" title="" />
          {deliveryPending && (
            <ActionCard
              icon="time-outline"
              title="Delivery pending review"
              subtitle={truncate(deliveryPending.ai_title ?? deliveryPending.title, 36)}
              onPress={() => {
                router.push('/(app)/(tabs)/campaigns');
              }}
            />
          )}
          {showInstagramNudge && (
            <ActionCard
              icon="logo-instagram"
              title="Connect Instagram"
              subtitle="Boost your discovery rate"
              onPress={() => {
                router.push('/(app)/profile/instagram');
              }}
            />
          )}
          {showPricingNudge && (
            <ActionCard
              icon="pricetag-outline"
              title="Set your rates"
              subtitle="Brands want to know your price"
              onPress={() => {
                router.push('/(app)/profile/pricing');
              }}
            />
          )}
          {pendingEarnings > 0 && (
            <ActionCard
              icon="wallet-outline"
              title="Pending payout"
              subtitle={`${formatPaiseAsINR(pendingEarnings)} waiting for release`}
              onPress={() => {
                router.push('/(app)/(tabs)/earnings');
              }}
            />
          )}
        </>
      )}

      {!campaignsLoading && activeCampaigns.length > 0 && (
        <>
          <SectionTitle eyebrow="In Progress" title="" />
          {activeCampaigns.slice(0, 2).map((c) => (
            <CampaignSpotlightCard key={c.id} campaign={c} />
          ))}
          <Pressable
            onPress={() => {
              router.push('/(app)/(tabs)/campaigns');
            }}
            accessibilityRole="button"
            accessibilityLabel="View all campaigns"
            style={styles.viewAllRow}
          >
            <Text style={styles.viewAllText}>View all campaigns</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.colors.rose} />
          </Pressable>
        </>
      )}
    </Screen>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const heroStyles = StyleSheet.create({
  section: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: -theme.spacing.xxl,
    minHeight: 374,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
  },
  badgeStage: {
    height: 268,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGem: {
    width: 142,
    height: 142,
    borderRadius: 44,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    shadowColor: '#9AF4E4',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.36,
    shadowRadius: 28,
    elevation: 14,
    transform: [{ perspective: 900 }, { rotateZ: '-10deg' }, { rotateX: '12deg' }],
  },
  badgeGlareLarge: {
    position: 'absolute',
    top: 14,
    left: 18,
    width: 72,
    height: 54,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.48)',
    transform: [{ rotate: '-28deg' }],
  },
  badgeGlareSmall: {
    position: 'absolute',
    right: 22,
    top: 30,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  badgeFacetOne: {
    position: 'absolute',
    left: 22,
    right: 10,
    bottom: 44,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.38)',
    transform: [{ rotate: '24deg' }],
  },
  badgeFacetTwo: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    left: 74,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-18deg' }],
  },
  badgeShadow: {
    position: 'absolute',
    bottom: 36,
    width: 86,
    height: 18,
    borderRadius: 43,
    backgroundColor: 'rgba(0,0,0,0.58)',
    transform: [{ scaleX: 1.5 }],
  },
  badgeBase: {
    position: 'absolute',
    bottom: 54,
    width: 74,
    height: 17,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.86)',
  },
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 76,
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
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  metricValue: {
    ...theme.typography.metricSmall,
    color: theme.colors.foreground,
    textAlign: 'center',
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
    ...theme.typography.headline,
    color: theme.colors.foreground,
  },
  subtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.58)',
  },
  scrollerFrame: {
    marginHorizontal: -theme.spacing.xxl,
  },
  scroller: {
    gap: theme.spacing.md,
  },
  card: {
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    padding: theme.spacing.xxl,
    justifyContent: 'space-between',
  },
  iconShell: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    gap: theme.spacing.xs,
  },
  cardTitle: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.62)',
  },
  cardValue: {
    ...theme.typography.metric,
    color: theme.colors.foreground,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.48)',
  },
});

const styles = StyleSheet.create({
  actionCard: {
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  actionPressed: {
    backgroundColor: theme.colors.surfaceWarm,
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.colors.rose,
  },
  actionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    paddingLeft: theme.spacing.xl + 3,
    minHeight: 64,
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  actionSubtitle: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.62)',
  },
  spotlightCard: {
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  spotlightTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  spotlightMeta: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.62)',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    marginTop: -theme.spacing.xs,
  },
  viewAllText: {
    ...theme.typography.label,
    color: theme.colors.rose,
    fontWeight: '600',
  },
});
