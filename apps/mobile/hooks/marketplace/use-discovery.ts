import { discoverInfluencers } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';

export function useInfluencerDiscovery(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  place?: string;
  category?: string;
  sort?: 'followers_desc' | 'engagement_asc' | 'engagement_desc' | 'price_asc' | 'price_desc';
  price_min?: number;
  price_max?: number;
}) {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: queryKeys.discovery(params),
    queryFn: () => discoverInfluencers(params),
    enabled: Boolean(session),
  });
}
