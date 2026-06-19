import { CreatorSwipeCard } from '@/components/ui/creator-swipe-card';
import { DeckBrowseScreen, type DeckSortOption } from '@/components/ui/deck-browse-screen';
import { PremiumCreatorFilterSheet } from '@/components/ui/premium-campaign-filter-sheet';
import { SnapCardDeck } from '@/components/ui/snap-card-deck';
import { useBusinessProfile, useInfluencerDiscovery } from '@/hooks/use-marketplace';
import { businessProfileImageUri } from '@/lib/brand/profile-image';
import {
  creatorFilterError,
  creatorPriceFilterForBounds,
  DEFAULT_CREATOR_FILTERS,
  getVisibleCreators,
  type CreatorFilterDraft,
  type CreatorSort,
} from '@/lib/filters/creators';
import labImage from '@/assets/images/lab.png';
import type { Influencer } from '@plugoh/contracts';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SORT_OPTIONS: DeckSortOption<CreatorSort>[] = [
  { value: 'followers_desc', label: 'Top followers' },
  { value: 'price_asc', label: 'Best price' },
  { value: 'engagement_desc', label: 'Engagement' },
];

function rangeEquals(first: CreatorFilterDraft['price'], second: CreatorFilterDraft['price']) {
  return first.min.trim() === second.min.trim() && first.max.trim() === second.max.trim();
}

function creatorFiltersEqual(first: CreatorFilterDraft, second: CreatorFilterDraft) {
  return rangeEquals(first.followers, second.followers) && rangeEquals(first.price, second.price);
}

function creatorActiveFilterCountForDefault(
  filters: CreatorFilterDraft,
  defaultFilters: CreatorFilterDraft,
) {
  return (
    (rangeEquals(filters.followers, defaultFilters.followers) ? 0 : 1) +
    (rangeEquals(filters.price, defaultFilters.price) ? 0 : 1)
  );
}

export default function BrandDiscoverScreen() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CreatorSort>('followers_desc');
  const profile = useBusinessProfile();
  const discovery = useInfluencerDiscovery({ search, sort, limit: 50, offset: 0 });
  const creators = useMemo(() => discovery.data?.items ?? [], [discovery.data?.items]);
  const profileImageUri = businessProfileImageUri(profile.data);
  const priceBounds = useMemo(() => {
    const priceValues = creators
      .map((creator) => creator.starterPrice)
      .filter(
        (value): value is number =>
          typeof value === 'number' && Number.isFinite(value) && value > 0,
      );

    return {
      min: 0,
      max: priceValues.length > 0 ? Math.max(...priceValues) : 100000,
    };
  }, [creators]);
  const defaultCreatorFilters = useMemo<CreatorFilterDraft>(
    () => ({
      followers: DEFAULT_CREATOR_FILTERS.followers,
      price: creatorPriceFilterForBounds(priceBounds),
    }),
    [priceBounds],
  );
  const previousDefaultCreatorFilters = useRef(defaultCreatorFilters);
  const [filters, setFilters] = useState<CreatorFilterDraft>(() => defaultCreatorFilters);

  const handleCreatorPress = useCallback(async (id: string) => {
    await impactAsync(ImpactFeedbackStyle.Light);
    router.push(`/(app)/creator/${id}`);
  }, []);

  useEffect(() => {
    setFilters((current) => {
      if (!creatorFiltersEqual(current, previousDefaultCreatorFilters.current)) {
        return current;
      }

      return defaultCreatorFilters;
    });
    previousDefaultCreatorFilters.current = defaultCreatorFilters;
  }, [defaultCreatorFilters]);

  return (
    <DeckBrowseScreen
      title="Discover"
      presentation="premiumCampaigns"
      items={creators}
      isLoading={discovery.isLoading}
      profileImageUri={profileImageUri}
      profileSymbol="person.circle"
      profileFallbackIcon="person-circle-outline"
      profileRoute="/(app)/brand-profile"
      filterIconSource={labImage}
      searchPlaceholder="Search by name, handle, city"
      sortTitle="Sort creators"
      sortOptions={SORT_OPTIONS}
      initialSort="followers_desc"
      searchValue={search}
      sortValue={sort}
      onSearchChange={setSearch}
      onSortChange={setSort}
      initialFilters={defaultCreatorFilters}
      filtersValue={filters}
      onFiltersChange={setFilters}
      getActiveFilterCount={(value) =>
        creatorActiveFilterCountForDefault(value, defaultCreatorFilters)
      }
      validateFilters={creatorFilterError}
      getVisibleItems={({ items, filters }) => getVisibleCreators(items, filters)}
      renderFilterSheet={(input) => (
        <PremiumCreatorFilterSheet {...input} priceBounds={priceBounds} />
      )}
      renderDeck={({ items, frame, search, activeFilterCount }) => (
        <SnapCardDeck<Influencer>
          items={items}
          isLoading={discovery.isLoading}
          cardWidth={frame.width}
          cardHeight={frame.height}
          viewportWidth={frame.viewportWidth}
          emptyTitle={
            search.trim().length > 0 || activeFilterCount > 0
              ? 'No creators match'
              : 'No creators yet'
          }
          emptySubtitle={
            search.trim().length > 0 || activeFilterCount > 0
              ? 'Try another search or sort option.'
              : 'Creators will appear here once profiles are active.'
          }
          keyExtractor={(creator) => creator.id}
          renderCard={({ item: creator, cardWidth, cardHeight }) => (
            <CreatorSwipeCard
              creator={creator}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onViewPress={() => {
                void handleCreatorPress(creator.id);
              }}
            />
          )}
        />
      )}
    />
  );
}
