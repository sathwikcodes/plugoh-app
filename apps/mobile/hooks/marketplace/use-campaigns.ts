import { endpoints, getCampaign } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { useQuery } from '@tanstack/react-query';
import { useRoleFromBootstrap, type CampaignListParams } from './internal';

export function useCampaigns(params?: CampaignListParams) {
  const { role, session } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.campaigns(role ?? 'influencer', params),
    queryFn: async () => {
      if (!role) throw new Error('Role is required to fetch campaigns');
      return endpoints.campaigns(role, params);
    },
    enabled: Boolean(session && role),
  });
}

export function useCampaign(id: string) {
  const { role, session } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.campaign(role ?? 'influencer', id),
    queryFn: () => getCampaign(id),
    enabled: Boolean(session && id && role),
  });
}
