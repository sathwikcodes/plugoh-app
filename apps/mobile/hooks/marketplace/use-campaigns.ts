import { endpoints, getCampaign } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { CAMPAIGN_LIVE_REFETCH_INTERVAL_MS } from '@/lib/query/live-sync';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useRoleFromBootstrap, type CampaignListParams } from './internal';

export function useCampaigns(params?: CampaignListParams) {
  const { role, session } = useRoleFromBootstrap();
  const isFocused = useIsFocused();
  return useQuery({
    queryKey: queryKeys.campaigns(role ?? 'influencer', params),
    queryFn: async () => {
      if (!role) throw new Error('Role is required to fetch campaigns');
      return endpoints.campaigns(role, params);
    },
    enabled: Boolean(session && role),
    refetchInterval: isFocused ? CAMPAIGN_LIVE_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  });
}

export function useCampaign(id: string) {
  const { role, session } = useRoleFromBootstrap();
  const isFocused = useIsFocused();
  return useQuery({
    queryKey: queryKeys.campaign(role ?? 'influencer', id),
    queryFn: () => getCampaign(id),
    enabled: Boolean(session && id && role),
    refetchInterval: isFocused ? CAMPAIGN_LIVE_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  });
}
