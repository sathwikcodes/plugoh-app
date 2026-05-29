import {
  DEFAULT_INBOX_FILTERS,
  DEFAULT_INBOX_SORT,
  inboxActiveFilterCount,
  type InboxFilter,
  type InboxFilterDraft,
  type InboxSort,
} from '@/lib/filters/inbox';
import { useEffect, useState } from 'react';
import { FilterOption, FilterSheet, FilterSheetSection } from '../ui/filter-sheet';

type Props = {
  visible: boolean;
  filters: InboxFilterDraft;
  sort: InboxSort;
  onCancel: () => void;
  onApply: (value: { filters: InboxFilterDraft; sort: InboxSort }) => void;
};

const SORT_OPTIONS: { value: InboxSort; label: string; description: string }[] = [
  { value: 'latest_desc', label: 'Latest first', description: 'Newest conversations at the top' },
  { value: 'unread_desc', label: 'Unread first', description: 'Unread threads first, then latest' },
];

const FILTER_OPTIONS: { value: InboxFilter; label: string; description: string }[] = [
  { value: 'all', label: 'All conversations', description: 'Show every campaign thread' },
  { value: 'unread', label: 'Unread only', description: 'Only threads with unread messages' },
];

export function InboxFilterSheet({ visible, filters, sort, onCancel, onApply }: Props) {
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftSort, setDraftSort] = useState(sort);

  useEffect(() => {
    if (!visible) return;
    setDraftFilters(filters);
    setDraftSort(sort);
  }, [filters, sort, visible]);

  const activeCount =
    inboxActiveFilterCount(draftFilters) + (draftSort !== DEFAULT_INBOX_SORT ? 1 : 0);

  return (
    <FilterSheet
      visible={visible}
      title="Filter messages"
      activeCount={activeCount}
      onCancel={onCancel}
      onClear={() => {
        setDraftFilters(DEFAULT_INBOX_FILTERS);
        setDraftSort(DEFAULT_INBOX_SORT);
      }}
      onApply={() => {
        onApply({ filters: draftFilters, sort: draftSort });
      }}
    >
      <FilterSheetSection title="Sort by">
        {SORT_OPTIONS.map((option) => (
          <FilterOption
            key={option.value}
            label={option.label}
            description={option.description}
            selected={draftSort === option.value}
            onPress={() => {
              setDraftSort(option.value);
            }}
          />
        ))}
      </FilterSheetSection>

      <FilterSheetSection title="Messages">
        {FILTER_OPTIONS.map((option) => (
          <FilterOption
            key={option.value}
            label={option.label}
            description={option.description}
            selected={draftFilters.status === option.value}
            onPress={() => {
              setDraftFilters({ status: option.value });
            }}
          />
        ))}
      </FilterSheetSection>
    </FilterSheet>
  );
}
