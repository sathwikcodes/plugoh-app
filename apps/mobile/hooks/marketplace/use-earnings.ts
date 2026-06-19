import { endpoints } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { useRoleFromBootstrap } from './internal';

export function useEarnings() {
  const session = useAuthStore((state) => state.session);
  const { role } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.earnings,
    queryFn: endpoints.earnings,
    enabled: Boolean(session && role === 'influencer'),
  });
}
