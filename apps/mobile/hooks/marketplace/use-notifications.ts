import { notifications } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { useQuery } from '@tanstack/react-query';
import { useRoleFromBootstrap } from './internal';

export function useNotifications() {
  const { role, session } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.notifications(role ?? 'influencer'),
    queryFn: notifications,
    enabled: Boolean(session && role),
  });
}
