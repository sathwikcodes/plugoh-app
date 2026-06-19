import { endpoints } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { useAuthStore } from '@/store/auth';
import type { CampaignMessage, MessagesPage } from '@plugoh/contracts';
import { useQuery, type InfiniteData } from '@tanstack/react-query';

export const THREAD_PAGE_SIZE = 30;
export const THREAD_REFETCH_INTERVAL_MS = 10_000;

export type CampaignListParams = {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  sort?: 'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc';
};

/** Prepend an optimistic message to the newest page of the cached infinite thread. */
export function prependOptimisticMessage(
  old: InfiniteData<MessagesPage> | undefined,
  message: CampaignMessage,
): InfiniteData<MessagesPage> {
  if (!old || old.pages.length === 0) {
    return { pages: [{ messages: [message], nextCursor: null }], pageParams: [null] };
  }
  const [newest, ...rest] = old.pages;
  return {
    ...old,
    pages: [{ ...newest, messages: [message, ...newest.messages] }, ...rest],
  };
}

export function useRoleFromBootstrap() {
  const session = useAuthStore((state) => state.session);
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: endpoints.meBootstrap,
    enabled: Boolean(session),
  });
  return { role: bootstrap.data?.role ?? null, bootstrap, session };
}
