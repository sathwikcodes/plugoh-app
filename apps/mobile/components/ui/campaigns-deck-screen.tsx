import {
  campaignFilterError,
  DEFAULT_CAMPAIGN_FILTERS,
  campaignAmountFilterForBounds,
  getVisibleCampaigns,
  type CampaignFilterDraft,
  type CampaignSort,
  type CampaignStatusFilter,
} from '@/lib/filters/campaigns';
import type { CampaignListItem } from '@plugoh/contracts';
import type { Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { CampaignDeckSwiper, type CampaignDeckRole } from './campaign-deck-swiper';
import { DeckBrowseScreen, type DeckSortOption } from './deck-browse-screen';
import { FilterOption, FilterRange, FilterSheetSection } from './filter-sheet';
import { NativeIconButton } from './native-icon-button';
import { PremiumCampaignFilterSheet } from './premium-campaign-filter-sheet';

const SORT_OPTIONS: DeckSortOption<CampaignSort>[] = [
  { value: 'created_desc', label: 'Newest first' },
  { value: 'created_asc', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
];

const STATUS_OPTIONS: { value: CampaignStatusFilter; label: string; description: string }[] = [
  { value: 'all', label: 'All campaigns', description: 'Show every campaign state' },
  { value: 'active', label: 'Active work', description: 'Requests, escrow, and delivery stages' },
  { value: 'completed', label: 'Completed', description: 'Finished campaigns only' },
  {
    value: 'attention',
    label: 'Needs attention',
    description: 'Disputed, declined, expired, or refunded',
  },
];

function amountFilterEquals(
  left: CampaignFilterDraft['amount'],
  right: CampaignFilterDraft['amount'],
) {
  return left.min.trim() === right.min.trim() && left.max.trim() === right.max.trim();
}

function activeFilterCountForDefault(
  filters: CampaignFilterDraft,
  defaultFilters: CampaignFilterDraft,
) {
  return (
    (amountFilterEquals(filters.amount, defaultFilters.amount) ? 0 : 1) +
    (filters.status !== 'all' ? 1 : 0)
  );
}

type Props = {
  role: CampaignDeckRole;
  campaigns: CampaignListItem[];
  isLoading: boolean;
  profileImageUri?: string | null;
  profileSymbol: ComponentProps<typeof NativeIconButton>['symbol'];
  profileFallbackIcon: ComponentProps<typeof NativeIconButton>['fallbackIcon'];
  profileRoute: Href;
  filterIconSource?: ImageSourcePropType;
  searchPlaceholder: string;
  searchMatcher: (campaign: CampaignListItem, query: string) => boolean;
  onOpenCampaign: (id: string) => void;
  onAcceptCampaign?: (id: string) => void;
  onDeclineCampaign?: (id: string) => void;
  acceptingCampaignId?: string;
  decliningCampaignId?: string;
};

export function CampaignsDeckScreen({
  role,
  campaigns,
  isLoading,
  profileImageUri,
  profileSymbol,
  profileFallbackIcon,
  profileRoute,
  filterIconSource,
  searchPlaceholder,
  searchMatcher,
  onOpenCampaign,
  onAcceptCampaign,
  onDeclineCampaign,
  acceptingCampaignId,
  decliningCampaignId,
}: Props) {
  const campaignAmountBounds = useMemo(() => {
    const amounts = campaigns
      .map((campaign) => campaign.price_offered ?? 0)
      .filter((amount) => Number.isFinite(amount) && amount > 0);

    return {
      min: 0,
      max: amounts.length > 0 ? Math.max(...amounts) : 100000,
    };
  }, [campaigns]);
  const initialCampaignFilters = useMemo(
    () => ({
      ...DEFAULT_CAMPAIGN_FILTERS,
      amount: campaignAmountFilterForBounds(campaignAmountBounds),
    }),
    [campaignAmountBounds],
  );
  const [campaignFilters, setCampaignFilters] = useState(initialCampaignFilters);
  const previousInitialFiltersRef = useRef(initialCampaignFilters);

  useEffect(() => {
    const previousInitialFilters = previousInitialFiltersRef.current;
    setCampaignFilters((currentFilters) =>
      activeFilterCountForDefault(currentFilters, previousInitialFilters) === 0
        ? initialCampaignFilters
        : currentFilters,
    );
    previousInitialFiltersRef.current = initialCampaignFilters;
  }, [initialCampaignFilters]);

  return (
    <DeckBrowseScreen
      title="Campaigns"
      presentation="premiumCampaigns"
      items={campaigns}
      isLoading={isLoading}
      profileImageUri={profileImageUri}
      profileSymbol={profileSymbol}
      profileFallbackIcon={profileFallbackIcon}
      profileRoute={profileRoute}
      filterIconSource={filterIconSource}
      searchPlaceholder={searchPlaceholder}
      sortTitle="Sort campaigns"
      sortOptions={SORT_OPTIONS}
      initialSort="created_desc"
      initialFilters={initialCampaignFilters}
      filtersValue={campaignFilters}
      onFiltersChange={setCampaignFilters}
      getActiveFilterCount={(filters) =>
        activeFilterCountForDefault(filters, initialCampaignFilters)
      }
      validateFilters={campaignFilterError}
      getVisibleItems={({ items, search, sort, filters }) =>
        getVisibleCampaigns({ items, search, sort, filters, searchMatcher })
      }
      renderFilterSheet={(input) => (
        <PremiumCampaignFilterSheet {...input} amountBounds={campaignAmountBounds} />
      )}
      renderFilterSections={({ draftFilters, setDraftFilters }) => (
        <>
          <FilterSheetSection title="Status">
            {STATUS_OPTIONS.map((option) => (
              <FilterOption
                key={option.value}
                label={option.label}
                description={option.description}
                selected={draftFilters.status === option.value}
                onPress={() => {
                  setDraftFilters({ ...draftFilters, status: option.value });
                }}
              />
            ))}
          </FilterSheetSection>

          <FilterSheetSection title="Campaign amount">
            <FilterRange
              label="Amount range"
              minValue={draftFilters.amount.min}
              maxValue={draftFilters.amount.max}
              minPlaceholder="₹ min"
              maxPlaceholder="₹ max"
              error={campaignFilterError(draftFilters)}
              onMinChange={(value) => {
                setDraftFilters({
                  ...draftFilters,
                  amount: { ...draftFilters.amount, min: value },
                });
              }}
              onMaxChange={(value) => {
                setDraftFilters({
                  ...draftFilters,
                  amount: { ...draftFilters.amount, max: value },
                });
              }}
            />
          </FilterSheetSection>
        </>
      )}
      renderDeck={({ items: visibleCampaigns, allItems, frame }) => (
        <CampaignDeckSwiper
          role={role}
          campaigns={visibleCampaigns}
          isLoading={isLoading}
          cardWidth={frame.width}
          cardHeight={frame.height}
          viewportWidth={frame.viewportWidth}
          emptyTitle={allItems.length === 0 ? 'No campaigns yet' : 'No campaigns match'}
          emptySubtitle={
            allItems.length === 0
              ? role === 'business'
                ? 'Start in Find to discover creators and launch your first campaign.'
                : 'No new campaign requests right now. Pull down to check for updates.'
              : 'Try another search or sort option.'
          }
          onViewCampaign={onOpenCampaign}
          onAcceptCampaign={onAcceptCampaign}
          onDeclineCampaign={onDeclineCampaign}
          acceptingCampaignId={acceptingCampaignId}
          decliningCampaignId={decliningCampaignId}
        />
      )}
    />
  );
}
