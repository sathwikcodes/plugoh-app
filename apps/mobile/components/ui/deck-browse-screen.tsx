import { theme } from '@/constants/theme';
import { router, type Href } from 'expo-router';
import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabScreenBottomPadding } from '@/components/navigation/native-tab-config';
import { AppHeader, getAppHeaderTopPadding } from './app-header';
import { FilterOption, FilterSheet, FilterSheetSection } from './filter-sheet';
import { GlassSearchField } from './glass-search-field';
import { NativeIconButton } from './native-icon-button';
import { Screen } from './primitives';

const PAGE_HORIZONTAL_INSET = theme.spacing.xxl;
const MAX_CARD_WIDTH = 390;
const CARD_VIEWPORT_RATIO = 0.84;
const DECK_FRAME_CLEARANCE = theme.spacing.section;

export type DeckFrame = {
  width: number;
  height: number;
  viewportWidth: number;
};

export type DeckSortOption<TSort extends string> = {
  value: TSort;
  label: string;
};

type DeckPresentation = 'default' | 'premiumCampaigns';

type VisibleItemsInput<TItem, TSort extends string, TFilters extends object> = {
  items: TItem[];
  search: string;
  sort: TSort;
  filters: TFilters;
};

type FilterSectionInput<TSort extends string, TFilters extends object> = {
  draftFilters: TFilters;
  setDraftFilters: (filters: TFilters) => void;
  draftSort: TSort;
  setDraftSort: (sort: TSort) => void;
};

export type DeckFilterSheetRenderInput<TSort extends string, TFilters extends object> = {
  visible: boolean;
  title: string;
  activeCount: number;
  resultCount: number;
  sort: TSort;
  sortOptions: DeckSortOption<TSort>[];
  initialSort: TSort;
  filters: TFilters;
  draftSort: TSort;
  setDraftSort: (sort: TSort) => void;
  draftFilters: TFilters;
  setDraftFilters: (filters: TFilters) => void;
  applyDisabled: boolean;
  applyError: string | null;
  onCancel: () => void;
  onClear: () => void;
  onApply: () => void;
};

type Props<TItem, TSort extends string, TFilters extends object> = {
  title: string;
  presentation?: DeckPresentation;
  items: TItem[];
  isLoading: boolean;
  profileImageUri?: string | null;
  profileSymbol: ComponentProps<typeof NativeIconButton>['symbol'];
  profileFallbackIcon: ComponentProps<typeof NativeIconButton>['fallbackIcon'];
  profileRoute: Href;
  filterIconSource?: ImageSourcePropType;
  searchPlaceholder: string;
  sortTitle: string;
  sortOptions: DeckSortOption<TSort>[];
  initialSort: TSort;
  searchValue?: string;
  sortValue?: TSort;
  onSearchChange?: (value: string) => void;
  onSortChange?: (value: TSort) => void;
  initialFilters?: TFilters;
  filtersValue?: TFilters;
  onFiltersChange?: (value: TFilters) => void;
  getActiveFilterCount?: (filters: TFilters) => number;
  validateFilters?: (filters: TFilters) => string | null;
  renderFilterSections?: (input: FilterSectionInput<TSort, TFilters>) => ReactNode;
  renderFilterSheet?: (input: DeckFilterSheetRenderInput<TSort, TFilters>) => ReactNode;
  getVisibleItems?: (input: VisibleItemsInput<TItem, TSort, TFilters>) => TItem[];
  renderDeck: (input: {
    items: TItem[];
    allItems: TItem[];
    isLoading: boolean;
    frame: DeckFrame;
    search: string;
    sort: TSort;
    filters: TFilters;
    activeFilterCount: number;
  }) => ReactNode;
};

function cloneFilterState<TFilters extends object>(filters: TFilters): TFilters {
  return JSON.parse(JSON.stringify(filters)) as TFilters;
}

export function DeckBrowseScreen<
  TItem,
  TSort extends string,
  TFilters extends object = Record<string, never>,
>({
  title,
  presentation = 'default',
  items,
  isLoading,
  profileImageUri,
  profileSymbol,
  profileFallbackIcon,
  profileRoute,
  filterIconSource,
  searchPlaceholder,
  sortTitle,
  sortOptions,
  initialSort,
  searchValue,
  sortValue,
  onSearchChange,
  onSortChange,
  initialFilters,
  filtersValue,
  onFiltersChange,
  getActiveFilterCount,
  validateFilters,
  renderFilterSections,
  renderFilterSheet,
  getVisibleItems,
  renderDeck,
}: Props<TItem, TSort, TFilters>) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const defaultFilters = useMemo(() => initialFilters ?? ({} as TFilters), [initialFilters]);
  const [internalSearch, setInternalSearch] = useState('');
  const [internalSort, setInternalSort] = useState<TSort>(initialSort);
  const [internalFilters, setInternalFilters] = useState<TFilters>(() =>
    cloneFilterState(defaultFilters),
  );
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [draftSort, setDraftSort] = useState<TSort>(initialSort);
  const [draftFilters, setDraftFilters] = useState<TFilters>(() =>
    cloneFilterState(defaultFilters),
  );
  const [deckSlotHeight, setDeckSlotHeight] = useState(0);
  const isPremiumCampaigns = presentation === 'premiumCampaigns';

  const search = searchValue ?? internalSearch;
  const sort = sortValue ?? internalSort;
  const filters = filtersValue ?? internalFilters;
  const appliedFilterCount =
    (getActiveFilterCount?.(filters) ?? 0) + (sort !== initialSort ? 1 : 0);
  const draftFilterCount =
    (getActiveFilterCount?.(draftFilters) ?? 0) + (draftSort !== initialSort ? 1 : 0);
  const draftFilterError = validateFilters?.(draftFilters) ?? null;

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return getVisibleItems
      ? getVisibleItems({ items, search: normalizedSearch, sort, filters })
      : items;
  }, [filters, getVisibleItems, items, search, sort]);

  const draftVisibleItemCount = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return getVisibleItems
      ? getVisibleItems({ items, search: normalizedSearch, sort: draftSort, filters: draftFilters })
          .length
      : items.length;
  }, [draftFilters, draftSort, getVisibleItems, items, search]);

  const frame = useMemo(() => {
    const viewportWidth = window.width;
    const maxWidth = Math.min(viewportWidth * CARD_VIEWPORT_RATIO, MAX_CARD_WIDTH);
    const fallbackHeight = window.height * 0.58;
    const availableHeight =
      deckSlotHeight > 0 ? Math.max(0, deckSlotHeight - DECK_FRAME_CLEARANCE) : fallbackHeight;
    const cardHeight = Math.max(360, availableHeight);

    return {
      width: Math.max(260, Math.round(maxWidth)),
      height: Math.round(cardHeight),
      viewportWidth: Math.round(viewportWidth),
    };
  }, [deckSlotHeight, window.height, window.width]);

  function handleSearchChange(value: string) {
    if (onSearchChange) {
      onSearchChange(value);
      return;
    }
    setInternalSearch(value);
  }

  function handleSortChange(value: TSort) {
    if (onSortChange) {
      onSortChange(value);
      return;
    }
    setInternalSort(value);
  }

  function handleFiltersChange(value: TFilters) {
    if (onFiltersChange) {
      onFiltersChange(value);
      return;
    }
    setInternalFilters(value);
  }

  function handleDeckLayout(event: LayoutChangeEvent) {
    setDeckSlotHeight(event.nativeEvent.layout.height);
  }

  function handleFilterPress() {
    setDraftSort(sort);
    setDraftFilters(cloneFilterState(filters));
    setFiltersVisible(true);
  }

  function handleApplyFilters() {
    if (draftFilterError) return;
    handleSortChange(draftSort);
    handleFiltersChange(cloneFilterState(draftFilters));
    setFiltersVisible(false);
  }

  function handleClearFilters() {
    setDraftSort(initialSort);
    setDraftFilters(cloneFilterState(defaultFilters));
  }

  return (
    <Screen
      scrollEnabled={false}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: PAGE_HORIZONTAL_INSET,
        paddingTop: getAppHeaderTopPadding(insets.top),
        paddingBottom: getTabScreenBottomPadding(insets.bottom),
        gap: isPremiumCampaigns ? theme.spacing.md : theme.spacing.md,
      }}
    >
      <AppHeader
        title={title}
        profile={{
          symbol: profileSymbol,
          fallbackIcon: profileFallbackIcon,
          imageUri: profileImageUri,
          onPress: () => {
            router.push(profileRoute);
          },
        }}
      />

      <View style={isPremiumCampaigns ? styles.premiumSearchRow : styles.searchRow}>
        <View style={{ flex: 1 }}>
          <GlassSearchField
            value={search}
            onChangeText={handleSearchChange}
            placeholder={searchPlaceholder}
          />
        </View>
        <View
          style={[
            styles.filterButtonWrap,
            isPremiumCampaigns ? styles.premiumFilterButtonWrap : null,
          ]}
        >
          <NativeIconButton
            symbol="line.3.horizontal.decrease.circle"
            fallbackIcon={isPremiumCampaigns ? 'filter' : 'options-outline'}
            fallbackIconFamily={isPremiumCampaigns ? 'foundation' : 'ionicons'}
            preferFallbackIcon={isPremiumCampaigns}
            imageSource={filterIconSource}
            imageSize={isPremiumCampaigns ? 30 : 28}
            variant="glass"
            haptic="selection"
            size={isPremiumCampaigns ? 46 : 44}
            symbolSize={isPremiumCampaigns ? 21 : 20}
            fallbackSize={isPremiumCampaigns ? 22 : undefined}
            accessibilityLabel="Open filters"
            glassRendering={isPremiumCampaigns ? 'blur' : 'native'}
            onPress={handleFilterPress}
          />
          {appliedFilterCount > 0 ? (
            <View style={isPremiumCampaigns ? styles.premiumActiveBadge : styles.activeBadge}>
              <Text
                style={isPremiumCampaigns ? styles.premiumActiveBadgeText : styles.activeBadgeText}
              >
                {appliedFilterCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        onLayout={handleDeckLayout}
        style={{
          flex: 1,
          minHeight: 0,
          marginHorizontal: -PAGE_HORIZONTAL_INSET,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
      >
        {renderDeck({
          items: visibleItems,
          allItems: items,
          isLoading,
          frame,
          search,
          sort,
          filters,
          activeFilterCount: appliedFilterCount,
        })}
      </View>

      {renderFilterSheet ? (
        renderFilterSheet({
          visible: filtersVisible,
          title: sortTitle,
          activeCount: draftFilterCount,
          resultCount: draftVisibleItemCount,
          sort,
          sortOptions,
          initialSort,
          filters,
          draftSort,
          setDraftSort,
          draftFilters,
          setDraftFilters,
          applyDisabled: Boolean(draftFilterError),
          applyError: draftFilterError,
          onCancel: () => {
            setFiltersVisible(false);
          },
          onClear: handleClearFilters,
          onApply: handleApplyFilters,
        })
      ) : (
        <FilterSheet
          visible={filtersVisible}
          title={sortTitle}
          activeCount={draftFilterCount}
          applyDisabled={Boolean(draftFilterError)}
          applyError={draftFilterError}
          onCancel={() => {
            setFiltersVisible(false);
          }}
          onClear={handleClearFilters}
          onApply={handleApplyFilters}
        >
          <FilterSheetSection title="Sort by">
            {sortOptions.map((option) => (
              <FilterOption
                key={option.value}
                label={option.label}
                selected={draftSort === option.value}
                onPress={() => {
                  setDraftSort(option.value);
                }}
              />
            ))}
          </FilterSheetSection>

          {renderFilterSections?.({
            draftFilters,
            setDraftFilters,
            draftSort,
            setDraftSort,
          })}
        </FilterSheet>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  premiumSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  filterButtonWrap: {
    position: 'relative',
  },
  premiumFilterButtonWrap: {
    width: 46,
    height: 46,
  },
  activeBadge: {
    position: 'absolute',
    right: -3,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: theme.colors.pink,
    borderWidth: 1,
    borderColor: theme.colors.background,
  },
  premiumActiveBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    backgroundColor: '#FF453A',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 8,
    elevation: 6,
  },
  activeBadgeText: {
    ...theme.typography.labelSmall,
    color: theme.colors.background,
    fontVariant: ['tabular-nums'],
  },
  premiumActiveBadgeText: {
    ...theme.typography.labelSmall,
    color: theme.colors.foreground,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
