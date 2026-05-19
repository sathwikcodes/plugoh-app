import { CampaignsDeckScreen } from '@/components/ui/campaigns-deck-screen';
import {
  useCampaigns,
  useInfluencerProfile,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';
import type { CampaignListItem } from '@plugoh/contracts';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

function matchesInfluencerCampaign(item: CampaignListItem, query: string) {
  return Boolean(
    item.ai_title?.toLowerCase().includes(query) ||
    item.title.toLowerCase().includes(query) ||
    item.business_profile?.brand_name?.toLowerCase().includes(query),
  );
}

export default function CampaignsScreen() {
  const influencerProfile = useInfluencerProfile();
  const campaigns = useCampaigns({ sort: 'created_desc' });
  const mutations = useMarketplaceMutations();

  const handleOpenCampaign = useCallback((id: string) => {
    router.push(`/(app)/campaigns/${id}`);
  }, []);

  const handleAcceptCampaign = useCallback(
    async (id: string) => {
      try {
        await mutations.acceptCampaign.mutateAsync(id);
        await campaigns.refetch();
      } catch (error) {
        Alert.alert('Could not accept', error instanceof Error ? error.message : 'Try again.');
      }
    },
    [campaigns, mutations.acceptCampaign],
  );

  const handleDeclineCampaign = useCallback(
    async (id: string) => {
      try {
        await mutations.declineCampaign.mutateAsync(id);
        await campaigns.refetch();
      } catch (error) {
        Alert.alert('Could not decline', error instanceof Error ? error.message : 'Try again.');
      }
    },
    [campaigns, mutations.declineCampaign],
  );

  return (
    <CampaignsDeckScreen
      role="influencer"
      campaigns={campaigns.data?.items ?? []}
      isLoading={campaigns.isLoading}
      profileImageUri={influencerProfile.data?.profile_photo_url}
      profileSymbol="person.circle"
      profileFallbackIcon="person-circle-outline"
      profileRoute="/(app)/profile"
      searchPlaceholder="Search campaigns or brands"
      searchMatcher={matchesInfluencerCampaign}
      onOpenCampaign={handleOpenCampaign}
      onAcceptCampaign={(id) => {
        void handleAcceptCampaign(id);
      }}
      onDeclineCampaign={(id) => {
        void handleDeclineCampaign(id);
      }}
      acceptingCampaignId={
        mutations.acceptCampaign.isPending ? mutations.acceptCampaign.variables : undefined
      }
      decliningCampaignId={
        mutations.declineCampaign.isPending ? mutations.declineCampaign.variables : undefined
      }
    />
  );
}
