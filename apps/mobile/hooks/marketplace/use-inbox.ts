import { inbox, messages } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';
import { useAuthStore } from '@/store/auth';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { THREAD_PAGE_SIZE, THREAD_REFETCH_INTERVAL_MS, useRoleFromBootstrap } from './internal';

export function useInbox() {
  const { role, session } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.inbox(role ?? 'influencer'),
    queryFn: () => {
      if (!role) throw new Error('Role is required to fetch inbox');
      return inbox(role);
    },
    enabled: Boolean(session && role),
  });
}

/**
 * Cursor-paginated conversation thread. Pages are newest-first; `messages` is the
 * flattened, oldest-first list ready for the inverted list builder. Polls while
 * mounted and refetches on focus so incoming messages appear without re-opening.
 */
export function useThreadMessages(id: string) {
  const session = useAuthStore((state) => state.session);
  const query = useInfiniteQuery({
    queryKey: queryKeys.messages(id),
    queryFn: ({ pageParam }) =>
      messages(id, { limit: THREAD_PAGE_SIZE, before: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(session && id),
    refetchInterval: THREAD_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
  const flatMessages = useMemo(() => {
    const all = (query.data?.pages ?? []).flatMap((page) => page.messages);
    // Newest-first pages → oldest-first for buildListItems.
    return [...all].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [query.data]);
  return { ...query, messages: flatMessages };
}
