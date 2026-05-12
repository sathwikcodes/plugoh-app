import { NativeIconButton } from '@/components/ui/native-icon-button';
import { Screen, SectionTitle, StatusChip } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useCampaigns, useEarnings, useInfluencerProfile } from '@/hooks/use-marketplace';
import { Ionicons } from '@expo/vector-icons';
import type { CampaignListItem } from '@plugoh/contracts';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ─── PendingTile ──────────────────────────────────────────────────────────────

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
    <Pressable
      style={({ pressed }) => [styles.snapshotTile, pressed && styles.tilePressed]}
      onPress={() => {
        router.push('/(app)/(tabs)/earnings');
      }}
    >
      <View style={styles.pendingLabel}>
        <Text style={styles.tileLabel}>Pending</Text>
        <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />
      </View>
      <Text style={styles.tileValue}>{fmt(amount)}</Text>
    </Pressable>
  );
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
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
    >
      <View style={styles.accentStrip} />
      <View style={styles.actionInner}>
        <Ionicons name={icon as never} size={20} color={theme.colors.rose} />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
      </View>
    </Pressable>
  );
}

// ─── CampaignSpotlightCard ────────────────────────────────────────────────────

function CampaignSpotlightCard({ campaign }: { campaign: CampaignListItem }) {
  const brandName = campaign.business_profile?.brand_name;
  const price = campaign.price_offered;

  return (
    <Pressable
      onPress={() => {
        router.push('/(app)/(tabs)/campaigns');
      }}
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
        {campaign.title}
      </Text>
      {brandName || price ? (
        <Text style={styles.spotlightMeta}>
          {[brandName, price ? fmt(price) : null].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const profile = useInfluencerProfile();
  const earnings = useEarnings();
  const campaigns = useCampaigns({ sort: 'created_desc' });

  const firstName = profile.data?.display_name?.split(' ')[0] ?? 'there';
  const thisMonth = earnings.data?.this_month ?? 0;
  const pendingEarnings = earnings.data?.pending_earnings ?? 0;

  const activeCampaigns = (campaigns.data?.items ?? []).filter((c) =>
    ['pre_authorized', 'in_escrow', 'delivery_submitted'].includes(c.status),
  );
  const deliveryPending = activeCampaigns.find((c) => c.status === 'delivery_submitted');
  const showInstagramNudge = profile.data?.instagram_connected === false;
  const showPricingNudge = Boolean(profile.data) && !profile.data?.price_per_reel;
  const hasActionItems = Boolean(deliveryPending) || showInstagramNudge || showPricingNudge;

  function contextualSubtitle() {
    if (activeCampaigns.length > 0) {
      return `${activeCampaigns.length} active campaign${activeCampaigns.length > 1 ? 's' : ''} in progress`;
    }
    if (pendingEarnings > 0) {
      return `${fmt(pendingEarnings)} waiting for payout`;
    }
    if (showInstagramNudge) {
      return 'Connect Instagram to get discovered';
    }
    return 'Ready for your next brand deal?';
  }

  return (
    <Screen>
      {/* ── header ── */}
      <View style={styles.header}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingLine}>{getGreeting()}</Text>
          <Text style={styles.nameLine}>{firstName}.</Text>
          <Text style={styles.subtitle}>{contextualSubtitle()}</Text>
        </View>
        <NativeIconButton
          symbol="person.circle"
          fallbackIcon="person-circle-outline"
          variant="glass"
          haptic="light"
          size={44}
          symbolSize={20}
          imageUri={profile.data?.profile_photo_url}
          onPress={() => {
            router.push('/(app)/profile');
          }}
        />
      </View>

      {/* ── earnings snapshot ── */}
      <View style={styles.snapshotRow}>
        <Pressable
          style={({ pressed }) => [styles.snapshotTile, pressed && styles.tilePressed]}
          onPress={() => {
            router.push('/(app)/(tabs)/earnings');
          }}
        >
          <Text style={styles.tileLabel}>This Month</Text>
          <Text style={styles.tileValue}>{earnings.isLoading ? '—' : fmt(thisMonth)}</Text>
        </Pressable>

        {earnings.isLoading ? (
          <View style={styles.snapshotTile}>
            <Text style={styles.tileLabel}>Pending</Text>
            <Text style={styles.tileValue}>—</Text>
          </View>
        ) : (
          <PendingTile amount={pendingEarnings} />
        )}
      </View>

      {/* ── needs attention ── */}
      {hasActionItems && (
        <>
          <SectionTitle eyebrow="Needs Attention" title="" />
          {deliveryPending && (
            <ActionCard
              icon="time-outline"
              title="Delivery pending review"
              subtitle={truncate(deliveryPending.title, 36)}
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
        </>
      )}

      {/* ── in progress ── */}
      {activeCampaigns.length > 0 && (
        <>
          <SectionTitle eyebrow="In Progress" title="" />
          {activeCampaigns.slice(0, 2).map((c) => (
            <CampaignSpotlightCard key={c.id} campaign={c} />
          ))}
          <Pressable
            onPress={() => {
              router.push('/(app)/(tabs)/campaigns');
            }}
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  greetingBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  greetingLine: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  nameLine: {
    ...theme.typography.display,
    color: theme.colors.foreground,
    marginTop: -2,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  snapshotTile: {
    flex: 1,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    gap: theme.spacing.xs,
    ...theme.shadow.card,
  },
  tilePressed: {
    backgroundColor: theme.colors.surfaceWarm,
  },
  tileLabel: {
    ...theme.typography.label,
    color: theme.colors.muted,
  },
  tileValue: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  pendingLabel: {
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
    color: theme.colors.muted,
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
    color: theme.colors.muted,
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
