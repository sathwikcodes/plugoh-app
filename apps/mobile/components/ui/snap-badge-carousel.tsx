import { theme } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * SnapBadgeCarousel — shared scroll-snap mechanics for a horizontal row of
 * cards where the centered/focused card is treated as "selected".
 *
 * Extracted from the influencer pricing screen's package carousel so the
 * booking package picker can reuse the exact same feel without duplicating
 * the interpolation/settle-index logic.
 */

const CARD_GAP = theme.spacing.xl;
const MIN_CARD_WIDTH = 148;
const MAX_CARD_WIDTH = 172;

export type SnapBadgeCarouselRenderArgs<T> = {
  item: T;
  index: number;
  active: boolean;
  cardWidth: number;
  interval: number;
  scrollX: SharedValue<number>;
};

type SnapBadgeCarouselProps<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (args: SnapBadgeCarouselRenderArgs<T>) => ReactNode;
  cardHeight: number;
  initialIndex?: number;
  onActiveIndexChange?: (index: number, item: T) => void;
  minCardWidth?: number;
  maxCardWidth?: number;
  /** Negative horizontal margin used to bleed the carousel edge-to-edge; match the parent's horizontal padding. */
  bleed?: number;
};

function CarouselCard<T>({
  active,
  cardWidth,
  cardHeight,
  index,
  interval,
  item,
  scrollX,
  renderItem,
}: {
  active: boolean;
  cardWidth: number;
  cardHeight: number;
  index: number;
  interval: number;
  item: T;
  scrollX: SharedValue<number>;
  renderItem: (args: SnapBadgeCarouselRenderArgs<T>) => ReactNode;
}) {
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
        { width: cardWidth, height: cardHeight, alignItems: 'center', justifyContent: 'center' },
        animatedStyle,
      ]}
    >
      {renderItem({ item, index, active, cardWidth, interval, scrollX })}
    </Animated.View>
  );
}

export function SnapBadgeCarousel<T>({
  items,
  keyExtractor,
  renderItem,
  cardHeight,
  initialIndex = 0,
  onActiveIndexChange,
  minCardWidth = MIN_CARD_WIDTH,
  maxCardWidth = MAX_CARD_WIDTH,
  bleed = theme.spacing.xxl,
}: SnapBadgeCarouselProps<T>) {
  const listRef = useRef<FlatList<T>>(null);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)),
  );
  const cardWidth = Math.min(Math.max(width * 0.42, minCardWidth), maxCardWidth);
  const interval = cardWidth + CARD_GAP;
  const sidePadding = Math.max((width - cardWidth) / 2, theme.spacing.lg);
  const scrollX = useSharedValue(activeIndex * interval);

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
      onActiveIndexChange?.(nextIndex, items[nextIndex]);
    },
    [activeIndex, interval, items, onActiveIndexChange],
  );

  const renderCard = useCallback(
    ({ item, index }: { item: T; index: number }) => (
      <CarouselCard
        active={index === activeIndex}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        index={index}
        interval={interval}
        item={item}
        scrollX={scrollX}
        renderItem={renderItem}
      />
    ),
    [activeIndex, cardHeight, cardWidth, interval, renderItem, scrollX],
  );

  const minHeight = useMemo(() => cardHeight + 32, [cardHeight]);

  return (
    <View style={{ marginHorizontal: -bleed, minHeight }}>
      <Animated.FlatList
        ref={listRef}
        data={items}
        horizontal
        keyExtractor={keyExtractor}
        renderItem={renderCard}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        snapToAlignment="start"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        initialScrollIndex={activeIndex}
        getItemLayout={(_, index) => ({ length: interval, offset: interval * index, index })}
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
  return <View style={{ width: CARD_GAP }} />;
}

const styles = StyleSheet.create({
  list: {
    overflow: 'visible',
  },
  listContent: {
    alignItems: 'center',
  },
});
