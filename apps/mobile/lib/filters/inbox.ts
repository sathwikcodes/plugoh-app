import type { InboxItem } from '@plugoh/contracts';

export type InboxFilter = 'all' | 'unread';
export type InboxSort = 'latest_desc' | 'unread_desc';

export type InboxFilterDraft = {
  status: InboxFilter;
};

export const DEFAULT_INBOX_FILTERS: InboxFilterDraft = {
  status: 'all',
};

export const DEFAULT_INBOX_SORT: InboxSort = 'latest_desc';

function latestMessageTime(item: InboxItem) {
  const createdAt = item.latestMessage?.created_at
    ? new Date(item.latestMessage.created_at).getTime()
    : 0;
  return Number.isNaN(createdAt) ? 0 : createdAt;
}

export function inboxActiveFilterCount(filters: InboxFilterDraft) {
  return filters.status !== 'all' ? 1 : 0;
}

export function sortInboxItems(items: InboxItem[], sort: InboxSort) {
  return [...items].sort((a, b) => {
    if (sort === 'unread_desc') {
      return b.unreadCount - a.unreadCount || latestMessageTime(b) - latestMessageTime(a);
    }

    return latestMessageTime(b) - latestMessageTime(a);
  });
}

export function getVisibleInboxItems({
  items,
  query,
  filters,
  sort,
  matchesSearch,
}: {
  items: InboxItem[];
  query: string;
  filters: InboxFilterDraft;
  sort: InboxSort;
  matchesSearch: (item: InboxItem, query: string) => boolean;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const searchMatch = normalizedQuery.length === 0 || matchesSearch(item, normalizedQuery);
    const statusMatch = filters.status === 'all' || item.unreadCount > 0;
    return searchMatch && statusMatch;
  });

  return sortInboxItems(filtered, sort);
}
