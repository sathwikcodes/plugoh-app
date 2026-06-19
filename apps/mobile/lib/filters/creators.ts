import type { Influencer } from '@plugoh/contracts';
import { roundedCampaignAmountMax } from './campaigns';
import {
  emptyNumericRange,
  matchesNumericRange,
  numericRangeError,
  numericRangeHasValue,
  type NumericRangeDraft,
} from './range';

export type CreatorSort = 'followers_desc' | 'price_asc' | 'engagement_desc';

export type CreatorFilterDraft = {
  followers: NumericRangeDraft;
  price: NumericRangeDraft;
};

export const DEFAULT_CREATOR_FILTERS: CreatorFilterDraft = {
  followers: emptyNumericRange(),
  price: emptyNumericRange(),
};

export function creatorPriceFilterForBounds(bounds: { min: number; max: number }) {
  return {
    min: String(Math.max(0, Math.round(bounds.min))),
    max: String(Math.max(1000, roundedCampaignAmountMax(bounds.max))),
  };
}

export function creatorFilterError(filters: CreatorFilterDraft) {
  return (
    numericRangeError(filters.followers, 'Followers') ?? numericRangeError(filters.price, 'Price')
  );
}

export function creatorActiveFilterCount(filters: CreatorFilterDraft) {
  return (
    (numericRangeHasValue(filters.followers) ? 1 : 0) +
    (numericRangeHasValue(filters.price) ? 1 : 0)
  );
}

export function getVisibleCreators(items: Influencer[], filters: CreatorFilterDraft) {
  return items.filter(
    (item) =>
      matchesNumericRange(item.follower_count, filters.followers) &&
      matchesNumericRange(item.starterPrice, filters.price),
  );
}
