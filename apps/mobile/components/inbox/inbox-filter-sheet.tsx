import { PremiumFilterSheet } from '@/components/inbox/premium-filter-sheet';
import {
  DEFAULT_INBOX_FILTERS,
  DEFAULT_INBOX_SORT,
  inboxActiveFilterCount,
  type InboxFilterDraft,
  type InboxSort,
} from '@/lib/filters/inbox';
import { FILTER_OPTIONS, SORT_OPTIONS } from '@/lib/inbox/filter-options';
import { useEffect, useState } from 'react';
import { FilterOption, FilterSheet, FilterSheetSection } from '../ui/filter-sheet';

type Props = {
  visible: boolean;
  presentation?: 'default' | 'premium';
  filters: InboxFilterDraft;
  sort: InboxSort;
  onCancel: () => void;
  onApply: (value: { filters: InboxFilterDraft; sort: InboxSort }) => void;
};

/**
 * Owns the draft filter/sort state and renders the chosen presentation: the
 * premium liquid-glass sheet, or the shared default FilterSheet.
 */
export function InboxFilterSheet({
  visible,
  presentation = 'default',
  filters,
  sort,
  onCancel,
  onApply,
}: Props) {
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftSort, setDraftSort] = useState(sort);

  useEffect(() => {
    if (!visible) return;
    setDraftFilters(filters);
    setDraftSort(sort);
  }, [filters, sort, visible]);

  const activeCount =
    inboxActiveFilterCount(draftFilters) + (draftSort !== DEFAULT_INBOX_SORT ? 1 : 0);

  const clearDraft = () => {
    setDraftFilters(DEFAULT_INBOX_FILTERS);
    setDraftSort(DEFAULT_INBOX_SORT);
  };
  const applyDraft = () => {
    onApply({ filters: draftFilters, sort: draftSort });
  };

  if (presentation === 'premium') {
    return (
      <PremiumFilterSheet
        visible={visible}
        draftFilters={draftFilters}
        draftSort={draftSort}
        activeCount={activeCount}
        onCancel={onCancel}
        onApply={applyDraft}
        onClear={clearDraft}
        onSelectSort={(value) => {
          setDraftSort(value);
        }}
        onSelectStatus={(value) => {
          setDraftFilters({ status: value });
        }}
      />
    );
  }

  return (
    <FilterSheet
      visible={visible}
      title="Filter messages"
      activeCount={activeCount}
      onCancel={onCancel}
      onClear={clearDraft}
      onApply={applyDraft}
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
