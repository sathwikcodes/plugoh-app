import type { InboxFilter, InboxSort } from '@/lib/filters/inbox';

export type SheetPage = 'main' | 'sort' | 'status';
export type HeaderIconName = 'chevron-back' | 'close';

export const SORT_OPTIONS: { value: InboxSort; label: string; description: string }[] = [
  { value: 'latest_desc', label: 'Latest first', description: 'Newest conversations at the top' },
  { value: 'unread_desc', label: 'Unread first', description: 'Unread threads first, then latest' },
];

export const FILTER_OPTIONS: { value: InboxFilter; label: string; description: string }[] = [
  { value: 'all', label: 'All conversations', description: 'Show every campaign thread' },
  { value: 'unread', label: 'Unread only', description: 'Only threads with unread messages' },
];

export function selectedSortLabel(value: InboxSort): string {
  return SORT_OPTIONS.find((option) => option.value === value)?.label ?? 'Latest first';
}

export function selectedStatusLabel(value: InboxFilter): string {
  return FILTER_OPTIONS.find((option) => option.value === value)?.label ?? 'All conversations';
}
