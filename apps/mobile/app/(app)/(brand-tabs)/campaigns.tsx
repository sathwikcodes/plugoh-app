import { CampaignsDeckScreen } from '@/components/ui/campaigns-deck-screen';
import { useBootstrap, useCampaigns } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
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
  const campaigns = useCampaigns({ sort: 'created_desc', limit: 50, offset: 0 });
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const campaignsLoading = bootstrapLoading || shouldShowInitialLoader(campaigns);

  const handleOpenCampaign = useCallback((id: string) => {
    router.push(`/(app)/campaigns/${id}`);
  }, []);

  return (
    <CampaignsDeckScreen
      role="business"
      campaigns={campaigns.data?.items ?? []}
      isLoading={campaignsLoading}
      profileSymbol="storefront"
      profileFallbackIcon="storefront-outline"
      profileRoute="/(app)/brand-profile"
      searchPlaceholder="Search campaigns or creators"
      searchMatcher={matchesBrandCampaign}
      onOpenCampaign={handleOpenCampaign}
    />
  );
}
