import { queryKeys } from '@/lib/query/keys';
import type { QueryClient } from '@tanstack/react-query';

export const CAMPAIGN_LIVE_REFETCH_INTERVAL_MS = 2000;
export const ACTIVITY_LIVE_REFETCH_INTERVAL_MS = 5000;

export type CampaignLiveInvalidator = Pick<QueryClient, 'invalidateQueries'>;

export async function invalidateCampaignLiveQueries(
  queryClient: CampaignLiveInvalidator,
  campaignId?: string | null,
) {
  const keys: ReadonlyArray<readonly unknown[]> = [
    ['campaigns', 'influencer'],
    ['campaigns', 'business'],
    queryKeys.inbox('influencer'),
    queryKeys.inbox('business'),
    queryKeys.notifications('influencer'),
    queryKeys.notifications('business'),
    queryKeys.earnings,
  ];
  const detailKeys = campaignId
    ? [queryKeys.campaign('influencer', campaignId), queryKeys.campaign('business', campaignId)]
    : [];
  await Promise.all(
    [...keys, ...detailKeys].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

export function campaignIdFromNotificationData(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const campaignId = (data as Record<string, unknown>).campaignId;
  return typeof campaignId === 'string' && campaignId.length > 0 ? campaignId : null;
}
