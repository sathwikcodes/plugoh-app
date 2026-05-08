import { useQuery } from '@tanstack/react-query';
import type { Influencer } from '@plugoh/contracts';
import { api } from '@/lib/api/client';

export function useInfluencers() {
  return useQuery({
    queryKey: ['influencers'],
    queryFn: () => api<Influencer[]>('/influencers', { method: 'GET' }),
    staleTime: 60_000,
  });
}
