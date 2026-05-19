import { theme } from '@/constants/theme';
import type { CampaignListItem } from '@plugoh/contracts';
import { memo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { CampaignEmptyState } from './campaign-empty-state';
import { CampaignSwipeCard } from './campaign-swipe-card';
import { ShimmerBlock, ShimmerCircle, ShimmerText } from './shimmer';

const CARD_GAP = theme.spacing.lg;

export type CampaignDeckRole = 'business' | 'influencer';

type Props = {
  role: CampaignDeckRole;
  campaigns: CampaignListItem[];
  isLoading: boolean;
  cardWidth: number;
  cardHeight: number;
  viewportWidth: number;
  emptyTitle?: string;
  emptySubtitle?: string;
  onViewCampaign: (id: string) => void;
  onAcceptCampaign?: (id: string) => void;
  onDeclineCampaign?: (id: string) => void;
  acceptingCampaignId?: string;
  decliningCampaignId?: string;
};

type CarouselCardProps = {
  role: CampaignDeckRole;
  campaign: CampaignListItem;
  cardWidth: number;
  cardHeight: number;
  interval: number;
  onViewCampaign: (id: string) => void;
  onAcceptCampaign?: (id: string) => void;
  onDeclineCampaign?: (id: string) => void;
  acceptingCampaignId?: string;
  decliningCampaignId?: string;
};

const CarouselCard = memo(function CarouselCard({
  role,
  campaign,
  cardWidth,
  cardHeight,
  interval,
  onViewCampaign,
  onAcceptCampaign,
  onDeclineCampaign,
  acceptingCampaignId,
  decliningCampaignId,
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
        role={role}
        campaign={campaign}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        onViewPress={() => {
          onViewCampaign(campaign.id);
        }}
        onAcceptPress={
          onAcceptCampaign
            ? () => {
                onAcceptCampaign(campaign.id);
              }
            : undefined
        }
        onDeclinePress={
          onDeclineCampaign
            ? () => {
                onDeclineCampaign(campaign.id);
              }
            : undefined
        }
        acceptPending={acceptingCampaignId === campaign.id}
        declinePending={decliningCampaignId === campaign.id}
      />
    </Animated.View>
  );
});

function CampaignCardSkeleton({
  cardWidth,
  cardHeight,
}: {
  cardWidth: number;
  cardHeight: number;
}) {
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

export function CampaignDeckSwiper({
  role,
  campaigns,
  isLoading,
  cardWidth,
  cardHeight,
  viewportWidth,
  emptyTitle,
  emptySubtitle,
  onViewCampaign,
  onAcceptCampaign,
  onDeclineCampaign,
  acceptingCampaignId,
  decliningCampaignId,
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
        <CampaignCardSkeleton cardWidth={cardWidth} cardHeight={cardHeight} />
      </View>
    );
  }

  if (campaigns.length === 0) {
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
        {campaigns.map((campaign) => (
          <CarouselCard
            key={campaign.id}
            role={role}
            campaign={campaign}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            interval={interval}
            onViewCampaign={onViewCampaign}
            onAcceptCampaign={onAcceptCampaign}
            onDeclineCampaign={onDeclineCampaign}
            acceptingCampaignId={acceptingCampaignId}
            decliningCampaignId={decliningCampaignId}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}
