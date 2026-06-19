import { HomeScreen, type HomeEarnings } from '@/components/screens/home-screen';
import { useBootstrap, useBusinessProfile, useCampaigns } from '@/hooks/use-marketplace';
import { deriveBrandDashboard } from '@/lib/brand/dashboard';
import { businessProfileImageUri } from '@/lib/brand/profile-image';
import type { InfluencerTier } from '@/lib/influencer/home-tier';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { useMemo } from 'react';

function brandTierForReadiness(readinessPercent: number): InfluencerTier {
  if (readinessPercent >= 100) return 'macro';
  if (readinessPercent >= 75) return 'mid';
  if (readinessPercent >= 50) return 'micro';
  return 'nano';
}

function brandRupeesToPaise(value: number) {
  return Math.round(value * 100);
}

export default function BrandHomeRoute() {
  const profile = useBusinessProfile();
  const bootstrap = useBootstrap();
  const campaigns = useCampaigns({ sort: 'created_desc' });

  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const profileLoading = bootstrapLoading || shouldShowInitialLoader(profile);
  const campaignsLoading = bootstrapLoading || shouldShowInitialLoader(campaigns);
  const dashboard = useMemo(
    () => deriveBrandDashboard(profile.data, campaigns.data?.items ?? []),
    [campaigns.data?.items, profile.data],
  );
  const brandEarnings = useMemo<HomeEarnings>(
    () => ({
      tier: brandTierForReadiness(dashboard.readinessPercent),
      tier_progress: dashboard.readinessPercent / 100,
      total_earnings: brandRupeesToPaise(dashboard.totalSpend),
      pending_earnings: brandRupeesToPaise(
        dashboard.activeCampaigns.reduce((sum, campaign) => sum + (campaign.price_offered ?? 0), 0),
      ),
    }),
    [dashboard],
  );

  return (
    <HomeScreen
      earnings={brandEarnings}
      campaigns={campaigns.data?.items ?? []}
      heroLoading={profileLoading || campaignsLoading}
      insightsLoading={campaignsLoading}
      profileImageUri={businessProfileImageUri(profile.data)}
      profileRoute="/(app)/brand-profile"
      campaignsListRoute="/(app)/(brand-tabs)/campaigns"
    />
  );
}
