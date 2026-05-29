import type { CampaignListItem, CampaignStatus } from '@plugoh/contracts';
import {
  emptyNumericRange,
  matchesNumericRange,
  numericRangeError,
  numericRangeHasValue,
  type NumericRangeDraft,
} from './range';

export type CampaignSort = 'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc';
export type CampaignStatusFilter = 'all' | 'active' | 'completed' | 'attention';

export type CampaignFilterDraft = {
  amount: NumericRangeDraft;
  status: CampaignStatusFilter;
};

export const DEFAULT_CAMPAIGN_FILTERS: CampaignFilterDraft = {
  amount: emptyNumericRange(),
  status: 'all',
};

const ACTIVE_STATUSES = new Set<CampaignStatus>([
  'requested',
  'payment_pending',
  'pre_authorized',
  'in_escrow',
  'delivery_submitted',
]);

const ATTENTION_STATUSES = new Set<CampaignStatus>([
  'disputed',
  'declined',
  'expired',
  'cancelled',
  'refunded',
]);

function createdTime(item: CampaignListItem): number {
  const createdAt = item.created_at ? new Date(item.created_at).getTime() : 0;
  return Number.isNaN(createdAt) ? 0 : createdAt;
}

function campaignAmount(item: CampaignListItem): number {
  return item.price_offered ?? 0;
}

function matchesStatus(item: CampaignListItem, status: CampaignStatusFilter) {
  if (status === 'all') return true;
  if (status === 'active') return ACTIVE_STATUSES.has(item.status);
  if (status === 'completed') return item.status === 'completed';
  return ATTENTION_STATUSES.has(item.status);
}

export function campaignFilterError(filters: CampaignFilterDraft) {
  return numericRangeError(filters.amount, 'Campaign amount');
}

export function campaignActiveFilterCount(filters: CampaignFilterDraft) {
  return (numericRangeHasValue(filters.amount) ? 1 : 0) + (filters.status !== 'all' ? 1 : 0);
}

export function sortCampaigns(items: CampaignListItem[], sort: CampaignSort): CampaignListItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'created_asc':
        return createdTime(a) - createdTime(b);
      case 'amount_desc':
        return campaignAmount(b) - campaignAmount(a);
      case 'amount_asc':
        return campaignAmount(a) - campaignAmount(b);
      case 'created_desc':
      default:
        return createdTime(b) - createdTime(a);
    }
  });
}

export function getVisibleCampaigns({
  items,
  search,
  sort,
  filters,
  searchMatcher,
}: {
  items: CampaignListItem[];
  search: string;
  sort: CampaignSort;
  filters: CampaignFilterDraft;
  searchMatcher: (campaign: CampaignListItem, query: string) => boolean;
}) {
  const filtered = items.filter((item) => {
    const matchesSearch = search.length === 0 || searchMatcher(item, search);
    return (
      matchesSearch &&
      matchesStatus(item, filters.status) &&
      matchesNumericRange(item.price_offered, filters.amount)
    );
  });

  return sortCampaigns(filtered, sort);
}
