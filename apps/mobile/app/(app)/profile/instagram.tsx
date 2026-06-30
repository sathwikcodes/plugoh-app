import { GlassCard } from '@/components/ui/glass-card';
import { BackHeader } from '@/components/ui/app-header';
import { PrimaryButton } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useBusinessProfile,
  useInfluencerProfile,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';
import { influencerProfileImageUri } from '@/lib/influencer/profile-image';
import { businessProfileImageUri } from '@/lib/brand/profile-image';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import instagramImage from '@/assets/images/instagram.png';
import followersImage from '@/assets/images/followers.png';
import likesImage from '@/assets/images/likes.png';
import megaphoneImage from '@/assets/images/megaphone.png';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CARD_RADIUS = 28;
const AVATAR_SIZE = 68;
const METRIC_CARD_GAP = theme.spacing.xl;
const METRIC_CARD_HEIGHT = 220;
const METRIC_IMAGE_SIZE = 148;

function formatNumber(value?: number | null): string {
  if (value == null) return '—';
  return Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

// ─── Pulsing connected dot ────────────────────────────────────────────────────

function PulsingDot() {
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.6);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.35);

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withSequence(
        withTiming(2.4, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    ring1Opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 0 }),
      ),
      -1,
      false,
    );
    ring2Scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(2.8, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    ring2Opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 400 }),
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(0.35, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [ring1Opacity, ring1Scale, ring2Opacity, ring2Scale]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  return (
    <View style={styles.pulsingWrap}>
      <Animated.View style={[styles.pulsingRing, ring1Style]} />
      <Animated.View style={[styles.pulsingRing, ring2Style]} />
      <View style={styles.pulsingCore} />
    </View>
  );
}

// ─── Metric badge carousel ────────────────────────────────────────────────────

type MetricItem = {
  key: string;
  image: ImageSourcePropType;
  label: string;
  value: string;
};

type MetricCardProps = {
  item: MetricItem;
  index: number;
  cardWidth: number;
  interval: number;
  scrollX: SharedValue<number>;
};

const MetricCard = memo(function MetricCard({
  item,
  index,
  cardWidth,
  interval,
  scrollX,
}: MetricCardProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const center = index * interval;
    const inputRange = [center - interval, center, center + interval];
    const rotateZ = interpolate(scrollX.value, inputRange, [-4, 0, 4], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [18, 0, 18], Extrapolation.CLAMP);
    const scale = interpolate(scrollX.value, inputRange, [0.46, 1, 0.46], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.62, 1, 0.62], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }, { rotateZ: `${rotateZ}deg` }, { scale }],
    };
  }, [index, interval]);

  return (
    <Animated.View
      style={[
        {
          width: cardWidth,
          height: METRIC_CARD_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        animatedStyle,
      ]}
    >
      <Image
        source={item.image}
        style={{ width: METRIC_IMAGE_SIZE, height: METRIC_IMAGE_SIZE }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
        accessibilityLabel={item.label}
      />
    </Animated.View>
  );
});

type MetricBadgeCarouselProps = {
  items: MetricItem[];
};

function MetricBadgeCarousel({ items }: MetricBadgeCarouselProps) {
  const listRef = useRef<FlatList<MetricItem>>(null);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = Math.min(Math.max(width * 0.42, 148), 172);
  const interval = cardWidth + METRIC_CARD_GAP;
  const sidePadding = Math.max((width - cardWidth) / 2, theme.spacing.lg);
  const scrollX = useSharedValue(0);
  const activeItem = items[activeIndex] ?? items[0];

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleSettledIndex = useCallback(
    (offsetX: number) => {
      const nextIndex = Math.min(Math.max(Math.round(offsetX / interval), 0), items.length - 1);
      if (nextIndex !== activeIndex && Platform.OS === 'ios') {
        void Haptics.selectionAsync();
      }
      setActiveIndex(nextIndex);
    },
    [activeIndex, interval, items.length],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: MetricItem; index: number }) => (
      <MetricCard
        item={item}
        index={index}
        cardWidth={cardWidth}
        interval={interval}
        scrollX={scrollX}
      />
    ),
    [cardWidth, interval, scrollX],
  );

  return (
    <View style={styles.carouselShell}>
      <Animated.FlatList
        ref={listRef}
        data={items}
        horizontal
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        snapToAlignment="start"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        getItemLayout={(_, index) => ({ length: interval, offset: interval * index, index })}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => {
          handleSettledIndex(e.nativeEvent.contentOffset.x);
        }}
        onScrollEndDrag={(e) => {
          handleSettledIndex(e.nativeEvent.contentOffset.x);
        }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index });
        }}
        ItemSeparatorComponent={() => <View style={{ width: METRIC_CARD_GAP }} />}
        contentContainerStyle={[styles.carouselContent, { paddingHorizontal: sidePadding }]}
        style={styles.carouselList}
      />

      {/* Metric strip — matches home-screen heroStyles.metricStrip */}
      <View style={styles.metricStrip}>
        <View style={styles.metricDivider} />
        <View style={styles.metricStripContent}>
          <Text style={styles.metricLabel}>{activeItem.label.toUpperCase()}</Text>
          <Text style={styles.metricValue}>{activeItem.value}</Text>
        </View>
        <View style={styles.metricDivider} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InstagramScreen() {
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const role = bootstrap.data?.role;
  const profile = useInfluencerProfile();
  const businessProfile = useBusinessProfile({ enabled: role === 'business' });
  const mutations = useMarketplaceMutations();

  const activeProfile = role === 'business' ? businessProfile : profile;
  const connected = Boolean(activeProfile.data?.instagram_connected);
  const username = activeProfile.data?.ig_username;
  const profileLoading =
    shouldShowInitialLoader(bootstrap) || shouldShowInitialLoader(activeProfile);

  const displayName =
    role === 'business'
      ? (businessProfile.data?.brand_name ?? null)
      : (profile.data?.display_name ?? null);

  const avatarUri =
    role === 'business'
      ? businessProfileImageUri(businessProfile.data)
      : influencerProfileImageUri(profile.data);

  const handle = username ? `@${username.replace(/^@/, '')}` : null;

  const followers = role === 'influencer' ? profile.data?.follower_count : null;
  const avgLikes = role === 'influencer' ? profile.data?.avg_likes_per_reel : null;
  const avgViews = role === 'influencer' ? profile.data?.avg_views_per_reel : null;

  const metricItems: MetricItem[] = [
    { key: 'followers', image: followersImage, label: 'Followers', value: formatNumber(followers) },
    { key: 'avg_likes', image: likesImage, label: 'Avg Likes', value: formatNumber(avgLikes) },
    { key: 'avg_views', image: megaphoneImage, label: 'Avg Views', value: formatNumber(avgViews) },
  ];

  const syncLabel = mutations.instagramSync.isPending
    ? connected
      ? 'Syncing...'
      : 'Connecting...'
    : connected
      ? 'Sync'
      : 'Connect Instagram';

  const scrollBottomPad =
    theme.spacing.hero + theme.spacing.jumbo + theme.spacing.xxl + insets.bottom;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackHeader
          title="Instagram"
          onBack={() => {
            router.back();
          }}
          style={styles.pageHeaderRow}
        />

        {/* ── Metric badge carousel ── */}
        <MetricBadgeCarousel items={metricItems} />

        {/* ── Profile card ── */}
        <GlassCard style={styles.card} contentStyle={styles.cardInner}>
          <View style={styles.identityRow}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={30} color="rgba(255,255,255,0.32)" />
                </View>
              )}
            </View>

            {/* Name + handle */}
            <View style={styles.identityInfo}>
              <Text style={styles.identityName} numberOfLines={1}>
                {profileLoading ? '—' : (displayName ?? (connected ? 'Account' : 'Not connected'))}
              </Text>
              <Text style={styles.identityHandle} numberOfLines={1}>
                {profileLoading ? '' : (handle ?? 'Ready to connect')}
              </Text>
            </View>

            {/* Instagram icon — top right, no background */}
            <Image
              source={instagramImage}
              style={styles.igIcon}
              contentFit="contain"
              accessibilityIgnoresInvertColors
              accessibilityLabel="Instagram"
            />
          </View>

          {/* Pulsing status dot — bottom right inside card */}
          {!profileLoading && (
            <View style={styles.pulsingAnchor}>
              {connected ? <PulsingDot /> : <View style={styles.amberDot} />}
            </View>
          )}
        </GlassCard>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, theme.spacing.md) + theme.spacing.md,
          },
        ]}
      >
        <PrimaryButton
          label={syncLabel}
          disabled={profileLoading || mutations.instagramSync.isPending}
          onPress={async () => {
            try {
              await mutations.instagramSync.mutateAsync();
            } catch (error) {
              Alert.alert('Sync failed', error instanceof Error ? error.message : 'Try again.');
            }
          }}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  pageHeaderRow: {
    marginBottom: theme.spacing.xs,
  },

  // ── Profile card ──
  card: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  cardInner: {
    padding: theme.spacing.xl,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarWrap: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  identityName: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    fontSize: 17,
    fontWeight: '700',
  },
  identityHandle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.50)',
    fontSize: 14,
  },
  igIcon: {
    width: 32,
    height: 32,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  pulsingAnchor: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
  },

  // ── Pulsing dot ──
  pulsingWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success,
  },
  pulsingCore: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: theme.colors.success,
  },
  amberDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: theme.colors.pending,
  },

  // ── Metric badge carousel ──
  carouselShell: {
    marginHorizontal: -theme.spacing.xxl,
    minHeight: METRIC_CARD_HEIGHT + 82,
  },
  carouselList: {
    overflow: 'visible',
  },
  carouselContent: {
    alignItems: 'center',
  },

  // Metric strip
  metricStrip: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  metricDivider: {
    width: '50%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  metricStripContent: {
    alignItems: 'center',
    gap: theme.spacing.sm,
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

  // ── Footer ──
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  footerButton: {
    alignSelf: 'stretch',
  },
});
