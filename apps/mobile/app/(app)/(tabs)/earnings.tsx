import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  SectionTitle,
  StatusChip,
} from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useEarnings, useInfluencerProfile } from '@/hooks/use-marketplace';
import type { EarningsSummary } from '@plugoh/contracts';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

// ─── EarningsBarChart ──────────────────────────────────────────────────────────

function EarningsBarChart({ data }: { data: EarningsSummary['monthly_breakdown'] }) {
  const slice = data.slice(-6);
  const BAR_MAX = 48;
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (slice.length < 2) {
    return (
      <View style={chart.row}>
        {[0.28, 0.46, 0.38, 0.68, 0.55, 0.9].map((h, i) => (
          <View key={i} style={chart.col}>
            <View
              style={[
                chart.bar,
                { height: BAR_MAX * h, backgroundColor: 'rgba(255,255,255,0.18)' },
              ]}
            />
            <Text style={chart.label}>—</Text>
          </View>
        ))}
      </View>
    );
  }

  const maxVal = Math.max(...slice.map((d) => d.amount), 1);

  return (
    <View style={chart.row}>
      {slice.map((d) => {
        const barH = Math.max(4, Math.round((d.amount / maxVal) * BAR_MAX));
        const isCurrent = d.month === currentMonth;
        const label = new Date(d.month + '-02').toLocaleDateString('en-US', { month: 'short' });
        return (
          <View key={d.month} style={chart.col}>
            <View
              style={[
                chart.bar,
                {
                  height: barH,
                  backgroundColor: isCurrent ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.36)',
                  borderRadius: 3,
                },
              ]}
            />
            <Text style={[chart.label, isCurrent && { color: 'rgba(255,255,255,0.85)' }]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chart = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 70,
    marginTop: 4,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
});

// ─── EarningsHeroCard ──────────────────────────────────────────────────────────

function EarningsHeroCard({ data }: { data: EarningsSummary }) {
  const mom = data.month_over_month_change;
  const momAbs = Math.abs(mom * 100);
  const showMom = mom !== 0;

  return (
    <LinearGradient
      colors={[theme.colors.rose, theme.colors.pink, theme.colors.peach]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={hero.card}
    >
      <View style={hero.topRow}>
        <Text style={hero.eyebrow}>TOTAL EARNED</Text>
        {showMom && (
          <View style={hero.badge}>
            <Text style={[hero.badgeText, { color: mom > 0 ? '#52ECAA' : '#FF9090' }]}>
              {mom > 0 ? '▲' : '▼'} {momAbs.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      <Text style={hero.amount}>{fmt(data.total_earnings)}</Text>

      <EarningsBarChart data={data.monthly_breakdown} />

      <View style={hero.actions}>
        <Pressable
          style={({ pressed }) => [hero.btn, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Alert.alert('Coming soon 🎉', 'Payouts are launching soon. Stay tuned!');
          }}
        >
          <Text style={hero.btnText}>Withdraw</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const hero = StyleSheet.create({
  card: {
    borderRadius: theme.radius.sheet,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.72)',
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 44,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

// ─── PendingTile ───────────────────────────────────────────────────────────────

function PendingTile({ amount }: { amount: number }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => {
      anim.stop();
    };
  }, [pulse]);

  return (
    <Card style={styles.statTile}>
      <View style={styles.pendingRow}>
        <Text style={styles.statLabel}>Pending</Text>
        <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />
      </View>
      <Text style={styles.statValue}>{fmt(amount)}</Text>
    </Card>
  );
}

// ─── TierProgressCard ──────────────────────────────────────────────────────────

const TIER_CONFIG = {
  nano: {
    label: 'Nano',
    color: theme.colors.info,
    bg: theme.colors.infoSoft,
    nextLabel: 'Micro',
    nextThreshold: 10_000,
  },
  micro: {
    label: 'Micro',
    color: theme.colors.success,
    bg: theme.colors.successSoft,
    nextLabel: 'Mid',
    nextThreshold: 100_000,
  },
  mid: {
    label: 'Mid',
    color: theme.colors.pending,
    bg: theme.colors.pendingSoft,
    nextLabel: 'Macro',
    nextThreshold: 500_000,
  },
  macro: {
    label: 'Macro',
    color: theme.colors.rose,
    bg: theme.colors.accentSoft,
    nextLabel: null,
    nextThreshold: null,
  },
} as const;

function TierProgressCard({
  tier,
  tier_progress,
  total_earnings,
}: Pick<EarningsSummary, 'tier' | 'tier_progress' | 'total_earnings'>) {
  const cfg = TIER_CONFIG[tier];
  const pct = Math.min(Math.round(tier_progress * 100), 100);
  const remaining = cfg.nextThreshold ? cfg.nextThreshold - total_earnings : 0;

  return (
    <Card>
      <View style={styles.tierRow}>
        <View style={[styles.tierBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.tierBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.tierInfluencer}>Influencer</Text>
        <Text style={styles.tierPct}>{pct}%</Text>
      </View>

      <View style={styles.trackBg}>
        <View
          style={[
            styles.trackFill,
            {
              width: `${pct}%`,
              backgroundColor: cfg.color,
            },
          ]}
        />
      </View>

      {cfg.nextLabel ? (
        <Text style={styles.tierSub}>
          {fmt(Math.max(remaining, 0))} to reach {cfg.nextLabel}
        </Text>
      ) : (
        <Text style={[styles.tierSub, { color: cfg.color }]}>You've reached the top tier 🔥</Text>
      )}
    </Card>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const influencerProfile = useInfluencerProfile();
  const earnings = useEarnings();

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
          <EarningsHeroCard data={earnings.data} />

          <View style={styles.statGrid}>
            <PendingTile amount={earnings.data.pending_earnings} />
            <Card style={styles.statTile}>
              <Text style={styles.statLabel}>This Month</Text>
              <Text style={styles.statValue}>{fmt(earnings.data.this_month)}</Text>
            </Card>
          </View>

          <TierProgressCard
            tier={earnings.data.tier}
            tier_progress={earnings.data.tier_progress}
            total_earnings={earnings.data.total_earnings}
          />

          <SectionTitle eyebrow="YOUR EARNINGS" title="Recent" />

          {earnings.data.transactions.length === 0 ? (
            <EmptyState title="No earnings yet" subtitle="Complete a campaign to get paid" />
          ) : (
            earnings.data.transactions.slice(0, 10).map((tx) => (
              <ListRow
                key={tx.campaignId}
                title={truncate(tx.title, 28)}
                subtitle={tx.date ? fmtDate(tx.date) : undefined}
                right={
                  <View style={styles.txRight}>
                    <Text style={styles.txAmount}>+{fmt(tx.amount)}</Text>
                    <StatusChip
                      label={
                        tx.status === 'completed'
                          ? 'Paid'
                          : tx.status === 'in_escrow'
                            ? 'Secured'
                            : 'Pending'
                      }
                      status={tx.status}
                    />
                  </View>
                }
              />
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
  statGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statTile: {
    flex: 1,
  },
  statLabel: {
    ...theme.typography.label,
    color: theme.colors.muted,
  },
  statValue: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.pending,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tierBadge: {
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  tierBadgeText: {
    ...theme.typography.label,
    fontWeight: '700',
  },
  tierInfluencer: {
    ...theme.typography.body,
    color: theme.colors.muted,
    flex: 1,
  },
  tierPct: {
    ...theme.typography.label,
    color: theme.colors.muted,
  },
  trackBg: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    borderRadius: theme.radius.pill,
  },
  tierSub: {
    ...theme.typography.label,
    color: theme.colors.muted,
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
