import { CreatorSwipeCard } from '@/components/ui/creator-swipe-card';
import { DeckBrowseScreen, type DeckSortOption } from '@/components/ui/deck-browse-screen';
import { FilterRange, FilterSheetSection } from '@/components/ui/filter-sheet';
import { SnapCardDeck } from '@/components/ui/snap-card-deck';
import { useBusinessProfile, useInfluencerDiscovery } from '@/hooks/use-marketplace';
import { businessProfileImageUri } from '@/lib/brand/profile-image';
import {
  creatorActiveFilterCount,
  creatorFilterError,
  DEFAULT_CREATOR_FILTERS,
  getVisibleCreators,
  type CreatorSort,
} from '@/lib/filters/creators';
import type { Influencer } from '@plugoh/contracts';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

const SORT_OPTIONS: DeckSortOption<CreatorSort>[] = [
  { value: 'followers_desc', label: 'Top followers' },
  { value: 'price_asc', label: 'Best price' },
  { value: 'engagement_desc', label: 'Engagement' },
];

export default function BrandDiscoverScreen() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CreatorSort>('followers_desc');
  const profile = useBusinessProfile();
  const discovery = useInfluencerDiscovery({ search, sort, limit: 50, offset: 0 });
  const creators = discovery.data?.items ?? [];
  const profileImageUri = businessProfileImageUri(profile.data);

  const handleCreatorPress = useCallback(async (id: string) => {
    await impactAsync(ImpactFeedbackStyle.Light);
    router.push(`/(app)/creator/${id}`);
  }, []);

  return (
    <DeckBrowseScreen
      title="Find Creators"
      items={creators}
      isLoading={discovery.isLoading}
      profileImageUri={profileImageUri}
      profileSymbol="person.circle"
      profileFallbackIcon="person-circle-outline"
      profileRoute="/(app)/brand-profile"
      searchPlaceholder="Search by name, handle, city"
      sortTitle="Sort creators"
      sortOptions={SORT_OPTIONS}
      initialSort="followers_desc"
      searchValue={search}
      sortValue={sort}
      onSearchChange={setSearch}
      onSortChange={setSort}
      initialFilters={DEFAULT_CREATOR_FILTERS}
      getActiveFilterCount={creatorActiveFilterCount}
      validateFilters={creatorFilterError}
      getVisibleItems={({ items, filters }) => getVisibleCreators(items, filters)}
      renderFilterSections={({ draftFilters, setDraftFilters }) => (
        <>
          <FilterSheetSection title="Audience">
            <FilterRange
              label="Follower range"
              minValue={draftFilters.followers.min}
              maxValue={draftFilters.followers.max}
              minPlaceholder="Min followers"
              maxPlaceholder="Max followers"
              error={creatorFilterError({
                ...draftFilters,
                price: DEFAULT_CREATOR_FILTERS.price,
              })}
              onMinChange={(value) => {
                setDraftFilters({
                  ...draftFilters,
                  followers: { ...draftFilters.followers, min: value },
                });
              }}
              onMaxChange={(value) => {
                setDraftFilters({
                  ...draftFilters,
                  followers: { ...draftFilters.followers, max: value },
                });
              }}
            />
          </FilterSheetSection>

          <FilterSheetSection title="Pricing">
            <FilterRange
              label="Starting price"
              minValue={draftFilters.price.min}
              maxValue={draftFilters.price.max}
              minPlaceholder="₹ min"
              maxPlaceholder="₹ max"
              error={creatorFilterError({
                ...draftFilters,
                followers: DEFAULT_CREATOR_FILTERS.followers,
              })}
              onMinChange={(value) => {
                setDraftFilters({
                  ...draftFilters,
                  price: { ...draftFilters.price, min: value },
                });
              }}
              onMaxChange={(value) => {
                setDraftFilters({
                  ...draftFilters,
                  price: { ...draftFilters.price, max: value },
                });
              }}
            />
          </FilterSheetSection>
        </>
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
