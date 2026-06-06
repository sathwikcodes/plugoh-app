import { CampaignsDeckScreen } from '@/components/ui/campaigns-deck-screen';
import { useBootstrap, useBusinessProfile, useCampaigns } from '@/hooks/use-marketplace';
import { businessProfileImageUri } from '@/lib/brand/profile-image';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import labImage from '@/assets/images/lab.png';
import type { CampaignListItem } from '@plugoh/contracts';
import { router } from 'expo-router';
import { useCallback } from 'react';

function matchesBrandCampaign(item: CampaignListItem, query: string) {
  const status = item.status.replaceAll('_', ' ');
  return (
    item.ai_title?.toLowerCase().includes(query) ||
    item.title.toLowerCase().includes(query) ||
    item.influencer_profile?.display_name?.toLowerCase().includes(query) ||
    item.influencer_profile?.ig_username?.toLowerCase().includes(query) ||
    status.toLowerCase().includes(query)
  );
}

export default function BrandCampaignsScreen() {
  const bootstrap = useBootstrap();
  const profile = useBusinessProfile();
  const campaigns = useCampaigns({ sort: 'created_desc', limit: 50, offset: 0 });
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const campaignsLoading = bootstrapLoading || shouldShowInitialLoader(campaigns);
  const profileImageUri = businessProfileImageUri(profile.data);

  const handleOpenCampaign = useCallback((id: string) => {
    router.push(`/(app)/campaigns/${id}`);
  }, []);

  return (
    <CampaignsDeckScreen
      role="business"
      campaigns={campaigns.data?.items ?? []}
      isLoading={campaignsLoading}
      profileImageUri={profileImageUri}
      profileSymbol="person.circle"
      profileFallbackIcon="person-circle-outline"
      profileRoute="/(app)/brand-profile"
      filterIconSource={labImage}
      searchPlaceholder="Search campaigns"
      searchMatcher={matchesBrandCampaign}
      onOpenCampaign={handleOpenCampaign}
    />
  );
}
