import { theme } from '@/constants/theme';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { CampaignEmptyState } from './campaign-empty-state';
import { ShimmerBlock, ShimmerCircle, ShimmerText } from './shimmer';

const CARD_GAP = theme.spacing.lg;

type Props<TItem> = {
  items: TItem[];
  isLoading: boolean;
  cardWidth: number;
  cardHeight: number;
  viewportWidth: number;
  emptyTitle?: string;
  emptySubtitle?: string;
  keyExtractor: (item: TItem) => string;
  renderCard: (input: {
    item: TItem;
    cardWidth: number;
    cardHeight: number;
    interval: number;
  }) => ReactNode;
};

function DeckCardSkeleton({ cardWidth, cardHeight }: { cardWidth: number; cardHeight: number }) {
  return (
    <View
      style={{
        width: cardWidth,
        height: cardHeight,
        borderRadius: 34,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        padding: theme.spacing.xl,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            padding: 5,
            paddingRight: theme.spacing.md,
            borderRadius: 24,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <ShimmerCircle size={38} />
          <ShimmerBlock width={96} height={16} radius={8} />
        </View>
      </View>
      <View style={{ gap: theme.spacing.md }}>
        <ShimmerText width="88%" height={44} />
        <ShimmerText width="62%" height={44} />
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <ShimmerText width="56%" height={18} />
          <ShimmerText width="34%" height={18} />
        </View>
      </View>
    </View>
  );
}

export function SnapCardDeck<TItem>({
  items,
  isLoading,
  cardWidth,
  cardHeight,
  viewportWidth,
  emptyTitle,
  emptySubtitle,
  keyExtractor,
  renderCard,
}: Props<TItem>) {
  const scrollX = useSharedValue(0);
  const interval = cardWidth + CARD_GAP;
  const sidePadding = Math.max(0, (viewportWidth - cardWidth) / 2);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  if (isLoading && items.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <DeckCardSkeleton cardWidth={cardWidth} cardHeight={cardHeight} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ width: viewportWidth, height: cardHeight, justifyContent: 'center' }}>
        <CampaignEmptyState title={emptyTitle} subtitle={emptySubtitle} />
      </View>
    );
  }

  return (
    <View style={{ width: viewportWidth, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        snapToInterval={interval}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        alwaysBounceHorizontal={false}
        alwaysBounceVertical={false}
        directionalLockEnabled
        overScrollMode="never"
        onScroll={scrollHandler}
        style={{ width: viewportWidth }}
        contentContainerStyle={{
          paddingHorizontal: sidePadding,
          alignItems: 'center',
          minHeight: cardHeight,
        }}
      >
        {items.map((item) => (
          <Animated.View
            key={keyExtractor(item)}
            style={{
              width: interval,
              height: cardHeight,
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            {renderCard({ item, cardWidth, cardHeight, interval })}
          </Animated.View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}
