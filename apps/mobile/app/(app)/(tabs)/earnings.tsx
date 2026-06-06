import { GlassCard } from '@/components/ui/glass-card';
import { AppHeader, APP_HEADER_SCREEN_TOP_PADDING } from '@/components/ui/app-header';
import { PremiumEarningsGradientCard } from '@/components/ui/premium-earnings-gradient-card';
import { ErrorState, Screen } from '@/components/ui/primitives';
import { ShimmerBlock, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useBootstrap, useEarnings, useInfluencerProfile } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import coinImage from '@/assets/images/coin.png';
import appIcon from '@/assets/images/icon.png';
import Foundation from '@expo/vector-icons/Foundation';
import { Ionicons } from '@expo/vector-icons';
import type { EarningsSummary } from '@plugoh/contracts';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

function statusLabel(s: string): string {
  if (s === 'completed') return 'Paid';
  if (s === 'in_escrow') return 'Secured';
  return 'Pending';
}

const AVATAR_COLORS = ['#E76A92', '#F28EAF', '#D4587F', '#D7A323', '#2FA46F', '#5C84D6'] as const;
type EarningsTransaction = EarningsSummary['transactions'][number];
const TX_AVATAR_SIZE = 46;
const TX_AVATAR_RADIUS = 14;

function campaignAvatarColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const CARD_CLUSTER_RADIUS = 36;

/** ISO/IEC 7810 ID-1 payment card width ÷ height — makes the hero read as a physical card. */
const DEBIT_CARD_ASPECT = 85.6 / 53.98;

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Current calendar year (January → December), merged with API breakdown amounts. */
function buildCalendarYearMonthlySeries(
  breakdown: EarningsSummary['monthly_breakdown'],
): { month: string; label: (typeof MONTH_LABELS)[number]; amount: number }[] {
  const byMonth = new Map(breakdown.map((b) => [b.month, b.amount]));
  const year = new Date().getFullYear();

  return MONTH_LABELS.map((label, index) => {
    const key = `${year}-${String(index + 1).padStart(2, '0')}`;
    return { month: key, label, amount: byMonth.get(key) ?? 0 };
  });
}

// ─── EarningsBarChart ──────────────────────────────────────────────────────────

/** Pill track height — keep modest so the card stays airy vs the title. */
const CHART_TRACK_HEIGHT = 76;
const CHART_BAR_WIDTH = 7;
const CHART_BAR_GAP = 4;

function EarningsBarChart({ data }: { data: EarningsSummary['monthly_breakdown'] }) {
  const series = buildCalendarYearMonthlySeries(data);
  const maxVal = Math.max(...series.map((d) => d.amount), 1);
  const pillR = CHART_BAR_WIDTH / 2;

  return (
    <View style={chart.chartArea}>
      {series.map((d) => {
        const ratio = d.amount / maxVal;
        const fillH = d.amount <= 0 ? 0 : Math.max(2, Math.round(ratio * CHART_TRACK_HEIGHT));
        return (
          <View
            key={d.month}
            style={chart.slot}
            accessibilityLabel={`${d.label} earnings ${fmt(d.amount)}`}
          >
            <View
              style={[
                chart.track,
                {
                  width: CHART_BAR_WIDTH,
                  height: CHART_TRACK_HEIGHT,
                  borderRadius: pillR,
                },
              ]}
            >
              {fillH > 0 ? (
                <View
                  style={[
                    chart.fillWrap,
                    {
                      height: fillH,
                      borderTopLeftRadius: pillR,
                      borderTopRightRadius: pillR,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#FB923C', '#C084FC', '#7C3AED']}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0.5, y: 1 }}
                    end={{ x: 0.5, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const chart = StyleSheet.create({
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    height: CHART_TRACK_HEIGHT,
    gap: CHART_BAR_GAP,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  track: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  fillWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});

// ─── EarningsCard3D ────────────────────────────────────────────────────────────

function EarningsCard3D({ data, displayName }: { data: EarningsSummary; displayName: string }) {
  const tierLabel = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);

  return (
    <View style={c3d.wrapper}>
      <PremiumEarningsGradientCard style={c3d.card}>
        <View style={c3d.topRow}>
          <Image source={appIcon} style={c3d.logo} contentFit="contain" />
        </View>

        <View style={c3d.amountRow}>
          <Image
            source={coinImage}
            style={c3d.amountCoin}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={c3d.amount} numberOfLines={1} adjustsFontSizeToFit>
            {fmtAmount(data.total_earnings)}
          </Text>
        </View>

        <View style={c3d.bottomRow}>
          <Text style={c3d.holderName} numberOfLines={1}>
            {displayName.toUpperCase()}
          </Text>
          <View style={c3d.tierBadgeOuter}>
            <View style={[c3d.tierCircle, c3d.tierCircleLeft]} />
            <View style={[c3d.tierCircle, c3d.tierCircleRight]} />
            <Text style={c3d.tierBadgeLabel}>{tierLabel}</Text>
          </View>
        </View>
      </PremiumEarningsGradientCard>
    </View>
  );
}

const c3d = StyleSheet.create({
  wrapper: {
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  card: {
    width: '100%',
    aspectRatio: DEBIT_CARD_ASPECT,
    flexDirection: 'column',
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.lg,
    transform: [{ perspective: 1400 }, { rotateX: '-5deg' }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  amountRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xl,
  },
  amountCoin: {
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  amount: {
    fontFamily: theme.typography.metric.fontFamily,
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    textAlign: 'left',
    flex: 1,
    minWidth: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  holderName: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  tierBadgeOuter: {
    width: 48,
    height: 28,
  },
  tierCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    position: 'absolute',
    opacity: 0.88,
  },
  tierCircleLeft: {
    backgroundColor: '#FF3CAC',
    left: 0,
  },
  tierCircleRight: {
    backgroundColor: '#FFD700',
    left: 20,
  },
  tierBadgeLabel: {
    ...theme.typography.labelSmall,
    position: 'absolute',
    width: 48,
    textAlign: 'center',
    top: 7,
    fontWeight: '800',
    color: '#fff',
    zIndex: 1,
  },
});

// ─── TotalEarnedCard ───────────────────────────────────────────────────────────

function TotalEarnedCard({ data }: { data: EarningsSummary }) {
  const mom = data.month_over_month_change;
  const momPct = Math.abs(mom * 100).toFixed(0);
  const momPos = mom >= 0;

  return (
    <GlassCard style={totalEarned.shell} contentStyle={totalEarned.inner}>
      <Text style={totalEarned.label}>Total Earned</Text>
      <Text style={totalEarned.value} numberOfLines={1} adjustsFontSizeToFit>
        {fmt(data.total_earnings)}
      </Text>
      {mom !== 0 && (
        <Text
          style={[totalEarned.sub, { color: momPos ? theme.colors.success : theme.colors.danger }]}
        >
          {momPos ? '▲' : '▼'} {momPct}% vs last month
        </Text>
      )}
    </GlassCard>
  );
}

const totalEarned = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  inner: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  label: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.55)',
  },
  value: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
});

// ─── MonthlyActivityCard ───────────────────────────────────────────────────────

function MonthlyActivityCard({ data }: { data: EarningsSummary }) {
  return (
    <GlassCard style={activity.shell} contentStyle={activity.inner}>
      <Text style={activity.title} numberOfLines={1} adjustsFontSizeToFit>
        Monthly Activity
      </Text>
      <View style={activity.chartWrap}>
        <EarningsBarChart data={data.monthly_breakdown} />
      </View>
    </GlassCard>
  );
}

const activity = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 128,
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  inner: {
    flex: 1,
    minHeight: 0,
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  title: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
  },
  chartWrap: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    minHeight: CHART_TRACK_HEIGHT + 20,
    paddingHorizontal: theme.spacing.xs,
  },
});

const WITHDRAW_BTN_HEIGHT = 52;

function GlassWithdrawButton({ onPress }: { onPress: () => void }) {
  const shell: ViewStyle = {
    width: '100%',
    height: WITHDRAW_BTN_HEIGHT,
    borderRadius: WITHDRAW_BTN_HEIGHT / 2,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  };

  const label = (
    <View style={withdrawGlass.row}>
      <Ionicons name="arrow-up-circle-outline" size={22} color="rgba(255,255,255,0.92)" />
      <Text style={withdrawGlass.label}>Withdraw</Text>
    </View>
  );

  const fire = () => {
    void impactAsync(ImpactFeedbackStyle.Light);
    onPress();
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView isInteractive glassEffectStyle="regular" colorScheme="dark" style={shell}>
        <Pressable
          onPress={fire}
          accessibilityRole="button"
          accessibilityLabel="Withdraw"
          style={({ pressed }) => [withdrawGlass.pressable, { opacity: pressed ? 0.92 : 1 }]}
        >
          {label}
        </Pressable>
      </GlassView>
    );
  }

  return (
    <Pressable
      onPress={fire}
      accessibilityRole="button"
      accessibilityLabel="Withdraw"
      style={({ pressed }) => [shell, { opacity: pressed ? 0.94 : 1 }]}
    >
      <BlurView tint="systemUltraThinMaterialDark" intensity={80} style={withdrawGlass.blurInner}>
        {label}
      </BlurView>
    </Pressable>
  );
}

function EarningsWithdrawColumn({ onPress }: { onPress: () => void }) {
  return (
    <GlassCard style={styles.withdrawShell} contentStyle={styles.withdrawInner}>
      <GlassWithdrawButton onPress={onPress} />
    </GlassCard>
  );
}

function EarningsSkeleton() {
  return (
    <>
      <View style={c3d.wrapper}>
        <View style={[c3d.card, styles.skeletonCard]}>
          <ShimmerCircle size={28} />
          <View style={c3d.amountRow}>
            <ShimmerText width="72%" height={44} />
          </View>
          <View style={c3d.bottomRow}>
            <ShimmerText width="48%" height={14} />
            <ShimmerBlock width={48} height={28} radius={14} />
          </View>
        </View>
      </View>
      <View style={styles.threeCardGrid}>
        <View style={styles.threeCardLeftCol}>
          <GlassCard style={totalEarned.shell} contentStyle={totalEarned.inner}>
            <ShimmerText width="46%" height={13} />
            <ShimmerText width="82%" height={24} />
            <ShimmerText width="56%" height={11} />
          </GlassCard>
          <GlassCard style={activity.shell} contentStyle={activity.inner}>
            <ShimmerText width="62%" height={18} />
            <ShimmerBlock width="100%" height={CHART_TRACK_HEIGHT} radius={8} />
          </GlassCard>
        </View>
        <View style={styles.threeCardRightCol}>
          <GlassCard style={styles.withdrawShell} contentStyle={styles.withdrawInner}>
            <ShimmerBlock
              width="100%"
              height={WITHDRAW_BTN_HEIGHT}
              radius={WITHDRAW_BTN_HEIGHT / 2}
            />
          </GlassCard>
        </View>
      </View>
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <ShimmerText width="52%" height={22} />
        </View>
        <GlassCard style={styles.txListShell} contentStyle={styles.txListInner}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={styles.txListRow}>
              <ShimmerBlock
                width={TX_AVATAR_SIZE}
                height={TX_AVATAR_SIZE}
                radius={TX_AVATAR_RADIUS}
              />
              <View style={styles.txBody}>
                <ShimmerText width="72%" height={16} />
                <ShimmerText width="45%" height={13} />
              </View>
              <ShimmerText width={68} height={18} />
              {index < 3 ? <View style={styles.txDivider} /> : null}
            </View>
          ))}
        </GlassCard>
      </View>
    </>
  );
}

function TransactionListRow({
  transaction,
  showDivider,
}: {
  transaction: EarningsTransaction;
  showDivider: boolean;
}) {
  return (
    <View style={styles.txListRow}>
      <CampaignAvatar title={transaction.title} />
      <View style={styles.txBody}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {truncate(transaction.title, 28)}
        </Text>
        <Text style={styles.txMeta}>
          {statusLabel(transaction.status)}
          {transaction.date ? ' · ' + fmtDate(transaction.date) : ''}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>{fmt(transaction.amount)}</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.34)" />
      </View>
      {showDivider ? <View style={styles.txDivider} /> : null}
    </View>
  );
}

function RecentTransactionsSection({ transactions }: { transactions: EarningsTransaction[] }) {
  const visibleTransactions = transactions.slice(0, 10);

  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(500)}
      style={styles.transactionsSection}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>
        <View style={styles.filterIcon}>
          <Foundation name="filter" size={17} color="rgba(255,255,255,0.72)" />
        </View>
      </View>

      {visibleTransactions.length === 0 ? (
        <GlassCard
          style={styles.txListShell}
          contentStyle={[styles.txListInner, styles.txEmptyInner]}
        >
          <Text style={styles.txEmptyText}>No earnings yet.</Text>
        </GlassCard>
      ) : (
        <GlassCard style={styles.txListShell} contentStyle={styles.txListInner}>
          {visibleTransactions.map((transaction, index) => (
            <TransactionListRow
              key={transaction.campaignId}
              transaction={transaction}
              showDivider={index < visibleTransactions.length - 1}
            />
          ))}
        </GlassCard>
      )}
    </Animated.View>
  );
}

const withdrawGlass = StyleSheet.create({
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.cardTitle,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
  },
});

// ─── CampaignAvatar ────────────────────────────────────────────────────────────

function CampaignAvatar({ title }: { title: string }) {
  const color = campaignAvatarColor(title);
  return (
    <View style={[avtr.box, { backgroundColor: color + '22' }]}>
      <Text style={[avtr.letter, { color }]}>{title.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

const avtr = StyleSheet.create({
  box: {
    width: TX_AVATAR_SIZE,
    height: TX_AVATAR_SIZE,
    borderRadius: TX_AVATAR_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letter: {
    ...theme.typography.bodyStrong,
    fontWeight: '800',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const influencerProfile = useInfluencerProfile();
  const bootstrap = useBootstrap();
  const earnings = useEarnings();
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const earningsLoading = bootstrapLoading || shouldShowInitialLoader(earnings);
  const profileLoading = bootstrapLoading || shouldShowInitialLoader(influencerProfile);
  const displayName =
    influencerProfile.data?.display_name ?? influencerProfile.data?.ig_username ?? 'Influencer';

  const onWithdraw = useCallback(() => {
    // Withdrawal flow TBD — hook bank / payout here.
  }, []);

  return (
    <Screen
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingTop: insets.top + APP_HEADER_SCREEN_TOP_PADDING }}
    >
      <AppHeader
        title="Earnings"
        profile={{
          imageUri: influencerProfile.data?.profile_photo_url,
          onPress: () => {
            router.push('/(app)/profile');
          },
        }}
      />

      {earningsLoading ? (
        <View style={styles.homeAlignedBody}>
          <EarningsSkeleton />
        </View>
      ) : earnings.isError ? (
        <View style={styles.homeAlignedBody}>
          <ErrorState
            title="Couldn't load earnings"
            subtitle="Check your connection and try again"
            onRetry={() => void earnings.refetch()}
          />
        </View>
      ) : earnings.data ? (
        <View style={styles.homeAlignedBody}>
          <Animated.View entering={FadeInDown.delay(0).duration(500)}>
            <EarningsCard3D
              data={earnings.data}
              displayName={profileLoading ? 'Influencer' : displayName}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.threeCardGrid}
          >
            <View style={styles.threeCardLeftCol}>
              <TotalEarnedCard data={earnings.data} />
              <MonthlyActivityCard data={earnings.data} />
            </View>
            <View style={styles.threeCardRightCol}>
              <EarningsWithdrawColumn onPress={onWithdraw} />
            </View>
          </Animated.View>

          <RecentTransactionsSection transactions={earnings.data.transactions} />
        </View>
      ) : null}
    </Screen>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  homeAlignedBody: {
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  threeCardGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  threeCardLeftCol: {
    width: '50%',
    paddingRight: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  threeCardRightCol: {
    width: '50%',
    paddingLeft: theme.spacing.sm,
    flexDirection: 'column',
  },
  skeletonCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  withdrawShell: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  withdrawInner: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  transactionsSection: {
    gap: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  filterIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -10 }, { translateY: 5 }],
  },
  txListShell: {
    width: '100%',
    borderRadius: 38,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  txListInner: {
    paddingVertical: theme.spacing.sm,
  },
  txEmptyInner: {
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  txEmptyText: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  txListRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 76,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  txBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  txTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  txMeta: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.50)',
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.xs,
    flexShrink: 0,
  },
  txAmount: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  txDivider: {
    position: 'absolute',
    left: theme.spacing.xl + TX_AVATAR_SIZE + theme.spacing.md,
    right: theme.spacing.xl,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
