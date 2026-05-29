import type { CampaignListItem, InboxItem, Influencer } from '@plugoh/contracts';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMPAIGN_FILTERS,
  campaignFilterError,
  getVisibleCampaigns,
} from '@/lib/filters/campaigns';
import {
  DEFAULT_CREATOR_FILTERS,
  creatorFilterError,
  getVisibleCreators,
} from '@/lib/filters/creators';
import { DEFAULT_INBOX_FILTERS, getVisibleInboxItems } from '@/lib/filters/inbox';

function campaign(input: Partial<CampaignListItem>): CampaignListItem {
  return {
    id: input.id ?? 'campaign-id',
    title: input.title ?? 'Campaign',
    status: input.status ?? 'requested',
    ...input,
  };
}

function creator(input: Partial<Influencer>): Influencer {
  return {
    id: input.id ?? 'creator-id',
    user_id: input.user_id ?? 'user-id',
    ...input,
  };
}

function inboxItem(input: {
  id: string;
  title?: string;
  unreadCount?: number;
  latestAt?: string;
}): InboxItem {
  return {
    campaign: campaign({ id: input.id, title: input.title ?? input.id }),
    latestMessage: input.latestAt
      ? {
          id: `${input.id}-message`,
          campaign_id: input.id,
          sender_id: 'sender-id',
          message_type: 'text',
          content: 'Hello',
          created_at: input.latestAt,
        }
      : null,
    unreadCount: input.unreadCount ?? 0,
  };
}

describe('filtering helpers', () => {
  it('sorts and filters campaigns by amount and status', () => {
    const visible = getVisibleCampaigns({
      items: [
        campaign({
          id: 'old-low',
          title: 'Old low',
          status: 'requested',
          price_offered: 1000,
          created_at: '2026-01-01T00:00:00Z',
        }),
        campaign({
          id: 'new-high',
          title: 'New high',
          status: 'in_escrow',
          price_offered: 5000,
          created_at: '2026-03-01T00:00:00Z',
        }),
        campaign({
          id: 'done',
          title: 'Done',
          status: 'completed',
          price_offered: 7000,
          created_at: '2026-04-01T00:00:00Z',
        }),
      ],
      search: '',
      sort: 'amount_desc',
      filters: {
        ...DEFAULT_CAMPAIGN_FILTERS,
        amount: { min: '1000', max: '6000' },
        status: 'active',
      },
      searchMatcher: (item, query) => item.title.toLowerCase().includes(query),
    });

    expect(visible.map((item) => item.id)).toEqual(['new-high', 'old-low']);
  });

  it('validates invalid campaign ranges', () => {
    expect(
      campaignFilterError({
        ...DEFAULT_CAMPAIGN_FILTERS,
        amount: { min: '9000', max: '1000' },
      }),
    ).toBe('Campaign amount minimum cannot be greater than maximum.');
  });

  it('filters creators by followers and starting price', () => {
    const visible = getVisibleCreators(
      [
        creator({ id: 'nano', follower_count: 5000, starterPrice: 1000 }),
        creator({ id: 'mid', follower_count: 80000, starterPrice: 8500 }),
        creator({ id: 'macro', follower_count: 400000, starterPrice: 50000 }),
      ],
      {
        ...DEFAULT_CREATOR_FILTERS,
        followers: { min: '10000', max: '100000' },
        price: { min: '5000', max: '10000' },
      },
    );

    expect(visible.map((item) => item.id)).toEqual(['mid']);
  });

  it('validates invalid creator ranges', () => {
    expect(
      creatorFilterError({
        ...DEFAULT_CREATOR_FILTERS,
        followers: { min: '-1', max: '' },
      }),
    ).toBe('Followers minimum must be zero or more.');

    expect(
      creatorFilterError({
        ...DEFAULT_CREATOR_FILTERS,
        price: { min: 'cheap', max: '' },
      }),
    ).toBe('Price minimum must be zero or more.');
  });

  it('filters inbox unread items and sorts unread threads first', () => {
    const visible = getVisibleInboxItems({
      items: [
        inboxItem({ id: 'read-new', unreadCount: 0, latestAt: '2026-03-01T00:00:00Z' }),
        inboxItem({ id: 'unread-old', unreadCount: 1, latestAt: '2026-01-01T00:00:00Z' }),
        inboxItem({ id: 'unread-new', unreadCount: 3, latestAt: '2026-02-01T00:00:00Z' }),
      ],
      query: '',
      filters: { ...DEFAULT_INBOX_FILTERS, status: 'unread' },
      sort: 'unread_desc',
      matchesSearch: () => true,
    });

    expect(visible.map((item) => item.campaign.id)).toEqual(['unread-new', 'unread-old']);
  });
});
