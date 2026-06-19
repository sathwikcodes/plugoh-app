import { endpoints } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { useBootstrap } from './use-bootstrap';

export function useInfluencerProfile() {
  const session = useAuthStore((state) => state.session);
  const bootstrap = useBootstrap();
  return useQuery({
    queryKey: queryKeys.profile('influencer'),
    queryFn: endpoints.influencerProfile,
    enabled: Boolean(session && bootstrap.data?.role === 'influencer'),
  });
}

export function useBusinessProfile(options?: { enabled?: boolean }) {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: queryKeys.profile('business'),
    queryFn: endpoints.businessProfile,
    enabled: Boolean(session && (options?.enabled ?? true)),
  });
}
