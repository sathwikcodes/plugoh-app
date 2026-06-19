import { endpoints } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { useRoleFromBootstrap } from './internal';

export function usePayout() {
  const session = useAuthStore((state) => state.session);
  const { role } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.payout,
    queryFn: endpoints.payout,
    enabled: Boolean(session && role === 'influencer'),
  });
}

export function useSavedCards() {
  const session = useAuthStore((state) => state.session);
  const { role } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.savedCards,
    queryFn: endpoints.savedCards,
    enabled: Boolean(session && role === 'business'),
  });
}
