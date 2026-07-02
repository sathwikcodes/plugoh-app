import { endpoints } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { ACTIVITY_LIVE_REFETCH_INTERVAL_MS } from '@/lib/query/live-sync';
import { useAuthStore } from '@/store/auth';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useRoleFromBootstrap } from './internal';

export function useEarnings() {
  const session = useAuthStore((state) => state.session);
  const { role } = useRoleFromBootstrap();
  const isFocused = useIsFocused();
  return useQuery({
    queryKey: queryKeys.earnings,
    queryFn: endpoints.earnings,
    enabled: Boolean(session && role === 'influencer'),
    refetchInterval: isFocused ? ACTIVITY_LIVE_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  });
}
