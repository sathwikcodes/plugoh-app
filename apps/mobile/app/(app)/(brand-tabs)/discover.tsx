import { GlassCard } from '@/components/ui/glass-card';
import { GlassSearchField } from '@/components/ui/glass-search-field';
import { theme } from '@/constants/theme';
import { useInfluencerDiscovery } from '@/hooks/use-marketplace';
import { Ionicons } from '@expo/vector-icons';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated2, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_CLEARANCE = 12;

type SortKey = 'followers_desc' | 'price_asc' | 'engagement_desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'followers_desc', label: 'Top Followers' },
  { key: 'price_asc', label: 'Best Price' },
  { key: 'engagement_desc', label: 'Engagement' },
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

function formatFollowers(n?: number): string {
  if (!n) return '0';
  if (n >= 10_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useMemo(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeletonRow, { opacity }]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '55%', height: 14 }]} />
        <View style={[styles.skeletonLine, { width: '40%', height: 11, marginTop: 5 }]} />
        <View style={[styles.skeletonLine, { width: '70%', height: 11, marginTop: 4 }]} />
      </View>
    </Animated.View>
  );
}

export default function BrandDiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('followers_desc');

  const discovery = useInfluencerDiscovery({ search, sort, limit: 50, offset: 0 });
  const items = discovery.data?.items ?? [];

  const handleCreatorPress = useCallback(async (id: string) => {
    await impactAsync(ImpactFeedbackStyle.Light);
    router.push(`/(app)/creator/${id}`);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.headerBlock,
          {
            paddingTop: insets.top + theme.spacing.lg,
            paddingHorizontal: theme.spacing.xxl,
            paddingBottom: theme.spacing.sm,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Find Creators</Text>
        </View>

        <GlassSearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, handle, city"
        />

        {/* Sort filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => {
                  setSort(option.key);
                }}
                style={styles.pillWrap}
              >
                {active ? (
                  <LinearGradient
                    colors={['#EC4899', '#A855F7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.pill}
                  >
                    <Text style={[styles.pillText, styles.pillTextActive]}>{option.label}</Text>
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
      </View>

      {/* Creator count summary */}
      {!discovery.isLoading && (discovery.data?.total ?? 0) > 0 ? (
        <Animated2.View entering={FadeInDown.duration(400)} style={styles.countWrap}>
          <GlassCard contentStyle={styles.countCard}>
            <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.55)" />
            <Text style={styles.countText}>
              {(discovery.data?.total ?? 0).toLocaleString('en-IN')} creators available
            </Text>
          </GlassCard>
        </Animated2.View>
      ) : null}

      {/* List */}
      {discovery.isLoading ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <SymbolView
            name="person.2.slash"
            size={52}
            tintColor="rgba(255,255,255,0.15)"
            type="monochrome"
            fallback={<Ionicons name="people-outline" size={52} color="rgba(255,255,255,0.15)" />}
          />
          <Text style={styles.emptyTitle}>No creators found</Text>
          <Text style={styles.emptySubtitle}>Try a different search or check back soon.</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xxl,
            paddingBottom: Math.max(insets.bottom, theme.spacing.sm) + TAB_BAR_CLEARANCE,
            gap: theme.spacing.sm,
          }}
          renderItem={({ item, index }) => {
            const name = item.display_name ?? item.ig_username ?? 'Creator';
            const color1 = avatarColor(name);
            const color2 = avatarColor(name + '2');

            return (
              <Animated2.View entering={FadeInDown.delay(index * 30).duration(300)}>
                <Pressable
                  onPress={() => handleCreatorPress(item.id)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  <GlassCard contentStyle={styles.creatorCard}>
                    {/* Avatar */}
                    <LinearGradient
                      colors={[color1, color2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarInitials}>{initials(name)}</Text>
                    </LinearGradient>

                    {/* Info */}
                    <View style={styles.creatorInfo}>
                      <Text style={styles.creatorName} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={styles.creatorMeta} numberOfLines={1}>
                        {[item.category, item.city].filter(Boolean).join(' · ') || 'Creator'}
                      </Text>
                      <Text style={styles.creatorFollowers}>
                        {formatFollowers(item.follower_count)} followers
                      </Text>
                    </View>

                    {/* Price + chevron */}
                    <View style={styles.creatorRight}>
                      <Text style={styles.creatorPrice}>
                        From{'\n'}₹{Math.round(item.starterPrice ?? 0).toLocaleString('en-IN')}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
                    </View>
                  </GlassCard>
                </Pressable>
              </Animated2.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBlock: { gap: theme.spacing.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.foreground,
  },
  pillRow: {
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  pillWrap: {},
  pill: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
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
  pillTextActive: {
    color: '#FFFFFF',
  },
  countWrap: {
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xs,
  },
  countCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
  },
  countText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
  },
  list: { flex: 1 },
  skeletonList: { flex: 1, paddingHorizontal: theme.spacing.xxl },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  skeletonBody: { flex: 1 },
  skeletonLine: {
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...theme.typography.section,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 20,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.28)',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 240,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
    fontSize: 16,
  },
  creatorInfo: { flex: 1, gap: 2 },
  creatorName: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  creatorMeta: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  creatorFollowers: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginTop: 1,
  },
  creatorRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  creatorPrice: {
    ...theme.typography.mono,
    color: theme.colors.foreground,
    fontSize: 12,
    textAlign: 'right',
  },
});
