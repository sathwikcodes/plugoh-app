import { TierAssetBadge } from '@/components/influencer/tier-asset-badge';
import { theme } from '@/constants/theme';
import {
  getTierBadgeCatalog,
  type InfluencerTier,
  type TierBadgeCatalogItem,
} from '@/lib/influencer/home-tier';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

const CARD_GAP = theme.spacing.xl;
const MAX_CARD_WIDTH = 172;
const MIN_CARD_WIDTH = 148;

type TierBadgeCarouselProps = {
  currentTier: InfluencerTier;
  onActiveTierChange?: (tier: InfluencerTier) => void;
};

type TierBadgeCardProps = {
  active: boolean;
  cardWidth: number;
  index: number;
  interval: number;
  item: TierBadgeCatalogItem;
  scrollX: SharedValue<number>;
};

const TierBadgeCard = memo(function TierBadgeCard({
  active,
  cardWidth,
  index,
  interval,
  item,
  scrollX,
}: TierBadgeCardProps) {
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
    <Animated.View style={[styles.badgeSlot, { width: cardWidth }, animatedStyle]}>
      <TierAssetBadge item={item} active={active} />
    </Animated.View>
  );
});

export function TierBadgeCarousel({ currentTier, onActiveTierChange }: TierBadgeCarouselProps) {
  const listRef = useRef<FlatList<TierBadgeCatalogItem>>(null);
  const { width } = useWindowDimensions();
  const items = useMemo(() => getTierBadgeCatalog(currentTier), [currentTier]);
  const currentIndex = Math.max(
    items.findIndex((item) => item.current),
    0,
  );
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const cardWidth = Math.min(Math.max(width * 0.42, MIN_CARD_WIDTH), MAX_CARD_WIDTH);
  const interval = cardWidth + CARD_GAP;
  const sidePadding = Math.max((width - cardWidth) / 2, theme.spacing.lg);
  const scrollX = useSharedValue(currentIndex * interval);

  useEffect(() => {
    setActiveIndex(currentIndex);
    scrollX.value = currentIndex * interval;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: currentIndex, animated: false });
    });
  }, [currentIndex, interval, scrollX]);

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
      onActiveTierChange?.(items[nextIndex]?.key ?? currentTier);
    },
    [activeIndex, currentTier, interval, items, onActiveTierChange],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<TierBadgeCatalogItem>) => (
      <TierBadgeCard
        active={index === activeIndex}
        cardWidth={cardWidth}
        index={index}
        interval={interval}
        item={item}
        scrollX={scrollX}
      />
    ),
    [activeIndex, cardWidth, interval, scrollX],
  );

  return (
    <View style={styles.shell}>
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
        initialScrollIndex={currentIndex}
        getItemLayout={(_, index) => ({
          length: interval,
          offset: interval * index,
          index,
        })}
        onScroll={onScroll}
        onMomentumScrollEnd={(event) => {
          handleSettledIndex(event.nativeEvent.contentOffset.x);
        }}
        onScrollEndDrag={(event) => {
          handleSettledIndex(event.nativeEvent.contentOffset.x);
        }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index });
        }}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: sidePadding }]}
        style={styles.list}
      />
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: -theme.spacing.xxl,
    minHeight: 252,
  },
  list: {
    overflow: 'visible',
  },
  listContent: {
    alignItems: 'center',
  },
  separator: {
    width: CARD_GAP,
  },
  badgeSlot: {
    height: 252,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
