import { HomeScreen } from '@/components/screens/home-screen';
import {
  useBootstrap,
  useCampaigns,
  useEarnings,
  useInfluencerProfile,
} from '@/hooks/use-marketplace';
import { influencerProfileImageUri } from '@/lib/influencer/profile-image';
import { shouldShowInitialLoader } from '@/lib/query/loading';

export default function InfluencerHomeRoute() {
  const profile = useInfluencerProfile();
  const bootstrap = useBootstrap();
  const earnings = useEarnings();
  const campaigns = useCampaigns({ sort: 'created_desc' });

  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const profileLoading = bootstrapLoading || shouldShowInitialLoader(profile);
  const earningsLoading = bootstrapLoading || shouldShowInitialLoader(earnings);
  const campaignsLoading = bootstrapLoading || shouldShowInitialLoader(campaigns);

  return (
    <HomeScreen
      earnings={earnings.data}
      campaigns={campaigns.data?.items ?? []}
      heroLoading={profileLoading || earningsLoading}
      insightsLoading={earningsLoading || campaignsLoading}
      profileImageUri={influencerProfileImageUri(profile.data)}
      profileRoute="/(app)/profile"
      campaignsListRoute="/(app)/(tabs)/campaigns"
    />
  );
}
