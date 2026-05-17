import { GlassCard } from '@/components/ui/glass-card';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useEarnings, useInfluencerProfile } from '@/hooks/use-marketplace';
import appIcon from '@/assets/images/icon.png';
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

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

function statusLabel(s: string): string {
  if (s === 'completed') return 'Paid';
  if (s === 'in_escrow') return 'Secured';
  return 'Pending';
}

const AVATAR_COLORS = ['#E76A92', '#F28EAF', '#D4587F', '#D7A323', '#2FA46F', '#5C84D6'] as const;

function campaignAvatarColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const CARD_CLUSTER_RADIUS = 36;

/** ISO/IEC 7810 ID-1 payment card width ÷ height — makes the hero read as a physical card. */
const DEBIT_CARD_ASPECT = 85.6 / 53.98;

/** Last 12 calendar months (oldest → newest), merged with API breakdown amounts. */
function buildLastTwelveMonthsSeries(
  breakdown: EarningsSummary['monthly_breakdown'],
): { month: string; amount: number }[] {
  const byMonth = new Map(breakdown.map((b) => [b.month, b.amount]));
  const out: { month: string; amount: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.push({ month: key, amount: byMonth.get(key) ?? 0 });
  }
  return out;
}

// ─── EarningsBarChart ──────────────────────────────────────────────────────────

/** Pill track height — keep modest so the card stays airy vs the title. */
const CHART_TRACK_HEIGHT = 76;
const CHART_BAR_WIDTH = 7;
const CHART_BAR_GAP = 4;

function EarningsBarChart({ data }: { data: EarningsSummary['monthly_breakdown'] }) {
  const series = buildLastTwelveMonthsSeries(data);
  const maxVal = Math.max(...series.map((d) => d.amount), 1);
  const pillR = CHART_BAR_WIDTH / 2;

  return (
    <View style={chart.chartArea}>
      {series.map((d) => {
        const ratio = d.amount / maxVal;
        const fillH = d.amount <= 0 ? 0 : Math.max(2, Math.round(ratio * CHART_TRACK_HEIGHT));
        return (
          <View key={d.month} style={chart.slot}>
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
      <LinearGradient
        colors={['#C94D88', '#8B6BC4', '#6FA84A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={c3d.card}
      >
        <View style={c3d.topRow}>
          <Image source={appIcon} style={c3d.logo} contentFit="contain" />
        </View>

        <View style={c3d.amountRow}>
          <Text style={c3d.amount}>{fmt(data.total_earnings)}</Text>
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
      </LinearGradient>
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
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    paddingTop: theme.spacing.xl,
  },
  amount: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    textAlign: 'left',
    width: '100%',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  holderName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    flex: 1,
    marginRight: theme.spacing.md,
    letterSpacing: 1.2,
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
    backgroundColor: '#EC4899',
    left: 0,
  },
  tierCircleRight: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    left: 20,
  },
  tierBadgeLabel: {
    position: 'absolute',
    width: 48,
    textAlign: 'center',
    top: 8,
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
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
    fontSize: 11,
    fontWeight: '600',
  },
});

// ─── MonthlyActivityCard ───────────────────────────────────────────────────────

function MonthlyActivityCard({ data }: { data: EarningsSummary }) {
  return (
    <GlassCard style={activity.shell} contentStyle={activity.inner}>
      <Text style={activity.title}>Monthly Activity</Text>
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
    ...theme.typography.cardTitle,
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.2,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letter: {
    fontSize: 16,
    fontWeight: '800',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const influencerProfile = useInfluencerProfile();
  const earnings = useEarnings();
  const displayName =
    influencerProfile.data?.display_name ?? influencerProfile.data?.ig_username ?? 'Influencer';

  const onWithdraw = useCallback(() => {
    // Withdrawal flow TBD — hook bank / payout here.
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <NativeIconButton
          symbol="person.circle"
          fallbackIcon="person-circle-outline"
          variant="glass"
          haptic="light"
          size={44}
          symbolSize={20}
          imageUri={influencerProfile.data?.profile_photo_url}
          onPress={() => {
            router.push('/(app)/profile');
          }}
        />
      </View>

      {earnings.isLoading ? (
        <LoadingState label="Loading your earnings..." />
      ) : earnings.isError ? (
        <ErrorState
          title="Couldn't load earnings"
          subtitle="Check your connection and try again"
          onRetry={() => void earnings.refetch()}
        />
      ) : earnings.data ? (
        <>
          <Animated.View entering={FadeInDown.delay(0).duration(500)}>
            <EarningsCard3D data={earnings.data} displayName={displayName} />
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

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
              </View>
              <View style={styles.filterIcon}>
                <Ionicons name="options-outline" size={16} color="rgba(255,255,255,0.55)" />
              </View>
            </View>
          </Animated.View>

          {earnings.data.transactions.length === 0 ? (
            <EmptyState title="No earnings yet" subtitle="Complete a campaign to get paid" />
          ) : (
            earnings.data.transactions.slice(0, 10).map((tx, i) => (
              <Animated.View
                key={tx.campaignId}
                entering={FadeInDown.delay(250 + Math.min(i, 4) * 40).duration(400)}
              >
                <GlassCard style={styles.txRowShell} contentStyle={styles.txRowInner}>
                  <CampaignAvatar title={tx.title} />
                  <View style={styles.txBody}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {truncate(tx.title, 28)}
                    </Text>
                    <Text style={styles.txMeta}>
                      {statusLabel(tx.status)}
                      {tx.date ? ' · ' + fmtDate(tx.date) : ''}
                    </Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={styles.txAmount}>+{fmt(tx.amount)}</Text>
                  </View>
                </GlassCard>
              </Animated.View>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.foreground,
    flex: 1,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    width: 32,
    height: 32,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txRowShell: {
    width: '100%',
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  txRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 62,
    paddingHorizontal: theme.spacing.lg,
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
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  txAmount: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
});
