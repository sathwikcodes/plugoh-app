import { useQuery } from '@tanstack/react-query';
import type { Influencer } from '@plugoh/contracts';
import { api } from '@/lib/api/client';

export function useInfluencers() {
  return useQuery({
    queryKey: ['influencers'],
    queryFn: async () => {
      const response = await api<{ items: Influencer[]; nextOffset: number | null; total: number }>(
        '/influencers',
        { method: 'GET' },
      );
      return response.items;
    },
    staleTime: 60_000,
  });
}
