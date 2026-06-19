import { endpoints } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';

export function useBootstrap() {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: endpoints.meBootstrap,
    enabled: Boolean(session),
  });
}
