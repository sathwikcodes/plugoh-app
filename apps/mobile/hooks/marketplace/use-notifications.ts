import { notifications } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { ACTIVITY_LIVE_REFETCH_INTERVAL_MS } from '@/lib/query/live-sync';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useRoleFromBootstrap } from './internal';

export function useNotifications() {
  const { role, session } = useRoleFromBootstrap();
  const isFocused = useIsFocused();
  return useQuery({
    queryKey: queryKeys.notifications(role ?? 'influencer'),
    queryFn: notifications,
    enabled: Boolean(session && role),
    refetchInterval: isFocused ? ACTIVITY_LIVE_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  });
}
