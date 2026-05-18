import { GlassCard } from '@/components/ui/glass-card';
import { StatusChip } from '@/components/ui/primitives';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useBootstrap, useBusinessProfile, useCampaigns } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { Ionicons } from '@expo/vector-icons';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import appIcon from '@/assets/images/icon.png';

const TAB_BAR_CLEARANCE = 12;
const DEBIT_CARD_ASPECT = 85.6 / 53.98;

type StatusFilter = 'all' | 'active' | 'in_escrow' | 'delivery' | 'completed' | 'disputed';

const ACTIVE_STATUSES = new Set([
  'requested',
  'payment_pending',
  'pre_authorized',
  'in_escrow',
  'delivery_submitted',
]);

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'in_escrow', label: 'In Escrow' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'completed', label: 'Completed' },
  { key: 'disputed', label: 'Disputed' },
];

const AVATAR_COLORS = ['#E76A92', '#F28EAF', '#D4587F', '#D7A323', '#2FA46F', '#5C84D6'] as const;

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

function matchesFilter(status: string, filter: StatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'active':
      return ACTIVE_STATUSES.has(status);
    case 'in_escrow':
      return status === 'in_escrow';
    case 'delivery':
      return status === 'delivery_submitted';
    case 'completed':
      return status === 'completed';
    case 'disputed':
      return status === 'disputed';
    default:
      return true;
  }
}

export default function BrandCampaignsScreen() {
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const campaigns = useCampaigns({ sort: 'created_desc', limit: 50, offset: 0 });
  const brandProfile = useBusinessProfile();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const campaignsLoading = bootstrapLoading || shouldShowInitialLoader(campaigns);
  const brandLoading = shouldShowInitialLoader(brandProfile);

  const allItems = campaigns.data?.items ?? [];

  const filtered = useMemo(
    () => allItems.filter((item) => matchesFilter(item.status, statusFilter)),
    [allItems, statusFilter],
  );

  const totalSpent = useMemo(
    () => allItems.reduce((sum, c) => sum + (c.price_offered ?? 0), 0),
    [allItems],
  );

  const activeCount = useMemo(
    () => allItems.filter((c) => ACTIVE_STATUSES.has(c.status)).length,
    [allItems],
  );

  const brandName = brandProfile.data?.brand_name;

  const handlePress = useCallback(async (id: string) => {
    await impactAsync(ImpactFeedbackStyle.Light);
    router.push(`/(app)/campaigns/${id}`);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xxl,
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm) + TAB_BAR_CLEARANCE,
          gap: theme.spacing.sm,
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Page title */}
            <View style={[styles.titleBlock, { paddingTop: insets.top + theme.spacing.lg }]}>
              <Text style={styles.headerTitle}>Campaigns</Text>
              <Text style={styles.headerSub}>Track your bookings from request to completion.</Text>
            </View>

            {/* Hero card */}
            <Animated.View entering={FadeInDown.duration(500)}>
              <View style={styles.heroShadow}>
                <LinearGradient
                  colors={['#C94D88', '#8B6BC4', '#5C84D6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroTop}>
                    <Image source={appIcon} style={styles.heroLogo} contentFit="contain" />
                  </View>

                  <View style={styles.heroAmountRow}>
                    <AsyncText
                      loading={campaignsLoading}
                      value={activeCount}
                      style={styles.heroCount}
                      shimmerWidth={54}
                      shimmerHeight={44}
                    />
                    <Text style={styles.heroCountLabel}>active campaigns</Text>
                  </View>

                  <View style={styles.heroBottom}>
                    <AsyncText
                      loading={brandLoading}
                      value={(brandName ?? 'Your Brand').toUpperCase()}
                      style={styles.heroBrandName}
                      numberOfLines={1}
                      shimmerWidth="50%"
                      shimmerHeight={16}
                    />
                    <AsyncText
                      loading={campaignsLoading}
                      value={`${fmt(totalSpent)} total spend`}
                      style={styles.heroSpend}
                      shimmerWidth="42%"
                      shimmerHeight={14}
                    />
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Stats grid */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <View style={styles.statsRow}>
                <GlassCard style={styles.statCard} contentStyle={styles.statInner}>
                  <SymbolView
                    name="briefcase.fill"
                    size={18}
                    tintColor="rgba(255,255,255,0.55)"
                    type="monochrome"
                    fallback={
                      <Ionicons name="briefcase-outline" size={18} color="rgba(255,255,255,0.55)" />
                    }
                  />
                  <AsyncText
                    loading={campaignsLoading}
                    value={allItems.length}
                    style={styles.statValue}
                    shimmerWidth={38}
                    shimmerHeight={22}
                  />
                  <Text style={styles.statLabel}>Total Campaigns</Text>
                </GlassCard>

                <GlassCard style={styles.statCard} contentStyle={styles.statInner}>
                  <SymbolView
                    name="indianrupeesign.circle.fill"
                    size={18}
                    tintColor="rgba(255,255,255,0.55)"
                    type="monochrome"
                    fallback={
                      <Ionicons name="cash-outline" size={18} color="rgba(255,255,255,0.55)" />
                    }
                  />
                  <AsyncText
                    loading={campaignsLoading}
                    value={fmt(totalSpent)}
                    style={styles.statValue}
                    numberOfLines={1}
                    shimmerWidth={76}
                    shimmerHeight={22}
                  />
                  <Text style={styles.statLabel}>Total Spent</Text>
                </GlassCard>
              </View>
            </Animated.View>

            {/* Status filter pills */}
            <Animated.View entering={FadeInDown.delay(150).duration(400)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {STATUS_FILTERS.map((option) => {
                  const active = statusFilter === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => {
                        setStatusFilter(option.key);
                      }}
                    >
                      {active ? (
                        <LinearGradient
                          colors={['#EC4899', '#A855F7']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.pill}
                        >
                          <Text style={[styles.pillText, styles.pillTextActive]}>
                            {option.label}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={[styles.pill, styles.pillInactive]}>
                          <Text style={styles.pillText}>{option.label}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        }
        ListEmptyComponent={
          campaignsLoading ? (
            <View style={styles.skeletonWrap}>
              {Array.from({ length: 4 }).map((_, index) => (
                <GlassCard key={index} contentStyle={styles.skeletonRow}>
                  <ShimmerCircle size={44} />
                  <View style={styles.skeletonBody}>
                    <ShimmerText width="58%" height={16} />
                    <ShimmerText width="42%" height={12} />
                  </View>
                  <ShimmerText width={54} height={18} />
                </GlassCard>
              ))}
            </View>
          ) : allItems.length === 0 ? (
            <View style={styles.emptyWrap}>
              <SymbolView
                name="briefcase"
                size={52}
                tintColor="rgba(255,255,255,0.15)"
                type="monochrome"
                fallback={
                  <Ionicons name="briefcase-outline" size={52} color="rgba(255,255,255,0.15)" />
                }
              />
              <Text style={styles.emptyTitle}>No campaigns yet</Text>
              <Text style={styles.emptySubtitle}>
                Start in Find to discover creators and launch your first campaign.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No campaigns match this filter</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const creatorName =
            item.influencer_profile?.display_name ??
            item.influencer_profile?.ig_username ??
            'Creator';
          const color1 = avatarColor(item.title);
          const color2 = avatarColor(item.title + '2');

          return (
            <Animated.View entering={FadeInDown.delay(index * 30 + 200).duration(300)}>
              <Pressable
                onPress={() => handlePress(item.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <GlassCard contentStyle={styles.campaignCard}>
                  {/* Avatar */}
                  <LinearGradient
                    colors={[color1, color2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarInitials}>{initials(item.title)}</Text>
                  </LinearGradient>

                  {/* Info */}
                  <View style={styles.campaignInfo}>
                    <Text style={styles.campaignTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.campaignCreator} numberOfLines={1}>
                      {creatorName}
                    </Text>
                    {item.created_at ? (
                      <Text style={styles.campaignDate}>{fmtDate(item.created_at)}</Text>
                    ) : null}
                  </View>

                  {/* Right */}
                  <View style={styles.campaignRight}>
                    <StatusChip label={item.status.replaceAll('_', ' ')} status={item.status} />
                    <Text style={styles.campaignPrice}>
                      ₹{Math.round(item.price_offered ?? 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flex: 1 },
  listHeader: { gap: theme.spacing.md, marginBottom: theme.spacing.sm },
  titleBlock: { gap: 4 },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.foreground,
  },
  headerSub: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.45)',
  },

  // Hero card
  heroShadow: {
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  heroCard: {
    width: '100%',
    aspectRatio: DEBIT_CARD_ASPECT,
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
    transform: [{ perspective: 1400 }, { rotateX: '-5deg' }],
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  heroLogo: { width: 28, height: 28, borderRadius: 6 },
  heroAmountRow: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-end',
    paddingTop: theme.spacing.lg,
  },
  heroCount: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  heroCountLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  heroBrandName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    flex: 1,
    letterSpacing: 1.2,
  },
  heroSpend: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },

  // Stats grid
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statCard: { flex: 1 },
  statInner: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  statValue: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
    fontSize: 18,
  },
  statLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },

  // Filter pills
  pillRow: { gap: 8, paddingVertical: 2 },
  pill: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 },
  pillInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pillText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: { color: '#FFFFFF' },

  // Campaign rows
  campaignCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  campaignInfo: { flex: 1, gap: 2 },
  campaignTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  campaignCreator: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  campaignDate: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 1,
  },
  campaignRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  campaignPrice: {
    ...theme.typography.mono,
    color: theme.colors.foreground,
    fontSize: 12,
  },
  skeletonWrap: {
    gap: theme.spacing.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
  },
  skeletonBody: {
    flex: 1,
    gap: theme.spacing.sm,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...theme.typography.section,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.28)',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 260,
  },
});
