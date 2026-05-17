import { theme } from '@/constants/theme';
import type { CampaignListItem } from '@plugoh/contracts';
import { memo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { CampaignEmptyState } from './campaign-empty-state';
import { CampaignSwipeCard } from './campaign-swipe-card';

const CARD_GAP = theme.spacing.lg;

type Props = {
  campaigns: CampaignListItem[];
  isLoading: boolean;
  cardWidth: number;
  cardHeight: number;
  viewportWidth: number;
  onViewCampaign: (id: string) => void;
};

type CarouselCardProps = {
  campaign: CampaignListItem;
  cardWidth: number;
  cardHeight: number;
  interval: number;
  onViewCampaign: (id: string) => void;
};

const CarouselCard = memo(function CarouselCard({
  campaign,
  cardWidth,
  cardHeight,
  interval,
  onViewCampaign,
}: CarouselCardProps) {
  return (
    <Animated.View
      style={{
        width: interval,
        height: cardHeight,
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <CampaignSwipeCard
        campaign={campaign}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        onViewPress={() => {
          onViewCampaign(campaign.id);
        }}
      />
    </Animated.View>
  );
});

export function CampaignDeckSwiper({
  campaigns,
  isLoading,
  cardWidth,
  cardHeight,
  viewportWidth,
  onViewCampaign,
}: Props) {
  const scrollX = useSharedValue(0);
  const interval = cardWidth + CARD_GAP;
  const sidePadding = Math.max(0, (viewportWidth - cardWidth) / 2);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  if (isLoading && campaigns.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.muted} />
      </View>
    );
  }

  if (campaigns.length === 0) {
    return (
      <View style={{ width: viewportWidth, height: cardHeight, justifyContent: 'center' }}>
        <CampaignEmptyState />
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
        {campaigns.map((campaign) => (
          <CarouselCard
            key={campaign.id}
            campaign={campaign}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            interval={interval}
            onViewCampaign={onViewCampaign}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}
