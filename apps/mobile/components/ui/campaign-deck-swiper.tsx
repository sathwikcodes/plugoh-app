import type { CampaignListItem } from '@plugoh/contracts';
import { memo } from 'react';
import { CampaignDeckEmptyState } from './campaign-empty-state';
import { CampaignSwipeCard } from './campaign-swipe-card';
import { SnapCardDeck } from './snap-card-deck';

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
  onViewCampaign,
  onAcceptCampaign,
  onDeclineCampaign,
  acceptingCampaignId,
  decliningCampaignId,
}: CarouselCardProps) {
  return (
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
  );
});

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
  return (
    <SnapCardDeck
      items={campaigns}
      isLoading={isLoading}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      viewportWidth={viewportWidth}
      emptyTitle={emptyTitle}
      emptySubtitle={emptySubtitle}
      renderEmptyState={({ cardWidth: emptyCardWidth, cardHeight: emptyCardHeight }) => (
        <CampaignDeckEmptyState cardWidth={emptyCardWidth} cardHeight={emptyCardHeight} />
      )}
      keyExtractor={(campaign) => campaign.id}
      renderCard={({ item: campaign }) => (
        <CarouselCard
          role={role}
          campaign={campaign}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onViewCampaign={onViewCampaign}
          onAcceptCampaign={onAcceptCampaign}
          onDeclineCampaign={onDeclineCampaign}
          acceptingCampaignId={acceptingCampaignId}
          decliningCampaignId={decliningCampaignId}
        />
      )}
    />
  );
}
