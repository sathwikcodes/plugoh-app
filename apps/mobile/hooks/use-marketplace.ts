import {
  acceptCampaign,
  approveCampaignDelivery,
  createBookingOrder,
  createCampaign,
  declineCampaign,
  deliveryUrl,
  discoverInfluencers,
  disputeCampaignDelivery,
  endpoints,
  getCampaign,
  inbox,
  instagramDisconnect,
  instagramSync,
  markMessagesRead,
  markNotificationsRead,
  messages,
  notifications,
  registerPush,
  sendAttachment,
  sendMessage,
  submitDelivery,
  unregisterPush,
  uploadDelivery,
  verifyBookingPayment,
} from '@/lib/api/endpoints';
import { invalidateQueryKeys } from '@/lib/query/invalidation';
import { coreInvalidationKeys, queryKeys } from '@/lib/query/keys';
import { useAuthStore } from '@/store/auth';
import type {
  BusinessOnboardingRequest,
  CampaignMessage,
  InfluencerOnboardingRequest,
  InfluencerPricingPatch,
  MessagesPage,
  NotificationsReadRequest,
  PayoutUpsert,
} from '@plugoh/contracts';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useMemo } from 'react';

const THREAD_PAGE_SIZE = 30;
const THREAD_REFETCH_INTERVAL_MS = 10_000;

/** Prepend an optimistic message to the newest page of the cached infinite thread. */
function prependOptimisticMessage(
  old: InfiniteData<MessagesPage> | undefined,
  message: CampaignMessage,
): InfiniteData<MessagesPage> {
  if (!old || old.pages.length === 0) {
    return { pages: [{ messages: [message], nextCursor: null }], pageParams: [null] };
  }
  const [newest, ...rest] = old.pages;
  return {
    ...old,
    pages: [{ ...newest, messages: [message, ...newest.messages] }, ...rest],
  };
}

type CampaignListParams = {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  sort?: 'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc';
};

function useRoleFromBootstrap() {
  const session = useAuthStore((state) => state.session);
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: endpoints.meBootstrap,
    enabled: Boolean(session),
  });
  return { role: bootstrap.data?.role ?? null, bootstrap, session };
}

export function useBootstrap() {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: endpoints.meBootstrap,
    enabled: Boolean(session),
  });
}

export function useInfluencerProfile() {
  const session = useAuthStore((state) => state.session);
  const bootstrap = useBootstrap();
  return useQuery({
    queryKey: queryKeys.profile('influencer'),
    queryFn: endpoints.influencerProfile,
    enabled: Boolean(session && bootstrap.data?.role === 'influencer'),
  });
}

export function useBusinessProfile(options?: { enabled?: boolean }) {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: queryKeys.profile('business'),
    queryFn: endpoints.businessProfile,
    enabled: Boolean(session && (options?.enabled ?? true)),
  });
}

export function useCampaigns(params?: CampaignListParams) {
  const { role, session } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.campaigns(role ?? 'influencer', params),
    queryFn: async () => {
      if (!role) throw new Error('Role is required to fetch campaigns');
      return endpoints.campaigns(role, params);
    },
    enabled: Boolean(session && role),
  });
}

export function useCampaign(id: string) {
  const { role, session } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.campaign(role ?? 'influencer', id),
    queryFn: () => getCampaign(id),
    enabled: Boolean(session && id && role),
  });
}

export function useInbox() {
  const { role, session } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.inbox(role ?? 'influencer'),
    queryFn: () => {
      if (!role) throw new Error('Role is required to fetch inbox');
      return inbox(role);
    },
    enabled: Boolean(session && role),
  });
}

/**
 * Cursor-paginated conversation thread. Pages are newest-first; `messages` is the
 * flattened, oldest-first list ready for the inverted list builder. Polls while
 * mounted and refetches on focus so incoming messages appear without re-opening.
 */
export function useThreadMessages(id: string) {
  const session = useAuthStore((state) => state.session);
  const query = useInfiniteQuery({
    queryKey: queryKeys.messages(id),
    queryFn: ({ pageParam }) =>
      messages(id, { limit: THREAD_PAGE_SIZE, before: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(session && id),
    refetchInterval: THREAD_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
  const flatMessages = useMemo(() => {
    const all = (query.data?.pages ?? []).flatMap((page) => page.messages);
    // Newest-first pages → oldest-first for buildListItems.
    return [...all].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [query.data]);
  return { ...query, messages: flatMessages };
}

export function useEarnings() {
  const session = useAuthStore((state) => state.session);
  const { role } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.earnings,
    queryFn: endpoints.earnings,
    enabled: Boolean(session && role === 'influencer'),
  });
}

export function useNotifications() {
  const { role, session } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.notifications(role ?? 'influencer'),
    queryFn: notifications,
    enabled: Boolean(session && role),
  });
}

export function usePayout() {
  const session = useAuthStore((state) => state.session);
  const { role } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.payout,
    queryFn: endpoints.payout,
    enabled: Boolean(session && role === 'influencer'),
  });
}

export function useSavedCards() {
  const session = useAuthStore((state) => state.session);
  const { role } = useRoleFromBootstrap();
  return useQuery({
    queryKey: queryKeys.savedCards,
    queryFn: endpoints.savedCards,
    enabled: Boolean(session && role === 'business'),
  });
}

export function useInfluencerDiscovery(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  place?: string;
  category?: string;
  sort?: 'followers_desc' | 'engagement_asc' | 'engagement_desc' | 'price_asc' | 'price_desc';
  price_min?: number;
  price_max?: number;
}) {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: queryKeys.discovery(params),
    queryFn: () => discoverInfluencers(params),
    enabled: Boolean(session),
  });
}

export function useMarketplaceMutations() {
  const queryClient = useQueryClient();
  const { role } = useRoleFromBootstrap();
  const activeRole = role ?? 'influencer';
  const myId = useAuthStore((state) => state.session?.user.id) ?? '';

  const invalidateKeys = async (keys: ReadonlyArray<readonly unknown[]>) =>
    invalidateQueryKeys(queryClient, keys);
  const invalidateCore = async () => {
    await invalidateKeys(coreInvalidationKeys);
  };
  // Scope thread mutations to the active role only — no cross-role inbox churn.
  const invalidateThread = async (id: string) =>
    invalidateKeys([
      queryKeys.messages(id),
      queryKeys.inbox(activeRole),
      queryKeys.notifications(activeRole),
    ]);

  return {
    setRole: useMutation({
      mutationFn: endpoints.setRole,
      onSuccess: invalidateCore,
    }),
    updateMeProfile: useMutation({
      mutationFn: endpoints.updateMeProfile,
      onSuccess: invalidateCore,
    }),
    onboarding: useMutation({
      mutationFn: (input: InfluencerOnboardingRequest) => endpoints.onboarding(input),
      onSuccess: invalidateCore,
    }),
    businessOnboarding: useMutation({
      mutationFn: (input: BusinessOnboardingRequest) => endpoints.businessOnboarding(input),
      onSuccess: invalidateCore,
    }),
    updateProfile: useMutation({
      mutationFn: endpoints.updateInfluencerProfile,
      onSuccess: invalidateCore,
    }),
    updateBusinessProfile: useMutation({
      mutationFn: endpoints.updateBusinessProfile,
      onSuccess: invalidateCore,
    }),
    updatePricing: useMutation({
      mutationFn: (input: InfluencerPricingPatch) => endpoints.updateInfluencerPricing(input),
      onSuccess: invalidateCore,
    }),
    updateAvailability: useMutation({
      mutationFn: endpoints.updateAvailability,
      onSuccess: invalidateCore,
    }),
    updatePayout: useMutation({
      mutationFn: (input: PayoutUpsert) => endpoints.updatePayout(input),
      onSuccess: invalidateCore,
    }),
    createCampaign: useMutation({
      mutationFn: createCampaign,
      onSuccess: invalidateCore,
    }),
    acceptCampaign: useMutation({
      mutationFn: acceptCampaign,
      onSuccess: invalidateCore,
    }),
    declineCampaign: useMutation({
      mutationFn: declineCampaign,
      onSuccess: invalidateCore,
    }),
    approveCampaignDelivery: useMutation({
      mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey: string }) =>
        approveCampaignDelivery(id, idempotencyKey),
      onSuccess: invalidateCore,
    }),
    disputeCampaignDelivery: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        disputeCampaignDelivery(id, reason),
      onSuccess: invalidateCore,
    }),
    createBookingOrder: useMutation({
      mutationFn: ({
        input,
        idempotencyKey,
      }: {
        input: Parameters<typeof createBookingOrder>[0];
        idempotencyKey?: string;
      }) => createBookingOrder(input, idempotencyKey),
    }),
    verifyBookingPayment: useMutation({
      mutationFn: ({
        input,
        idempotencyKey,
      }: {
        input: Parameters<typeof verifyBookingPayment>[0];
        idempotencyKey: string;
      }) => verifyBookingPayment(input, idempotencyKey),
      onSuccess: invalidateCore,
    }),
    sendMessage: useMutation({
      mutationFn: ({ id, content }: { id: string; content: string }) => sendMessage(id, content),
      // Optimistically show the message so the thread feels instant.
      onMutate: async ({ id, content }: { id: string; content: string }) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.messages(id) });
        const previous = queryClient.getQueryData<InfiniteData<MessagesPage>>(
          queryKeys.messages(id),
        );
        const optimistic: CampaignMessage = {
          id: `optimistic-${Date.now()}`,
          campaign_id: id,
          sender_id: myId,
          message_type: 'text',
          content,
          read_by: [],
          read_at: null,
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKeys.messages(id), (old) =>
          prependOptimisticMessage(old, optimistic),
        );
        return { previous };
      },
      onError: (_error, variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKeys.messages(variables.id), context.previous);
        }
      },
      onSettled: (_data, _error, variables) => {
        void invalidateThread(variables.id);
      },
    }),
    sendAttachment: useMutation({
      mutationFn: ({
        id,
        file,
        caption,
      }: {
        id: string;
        file: { uri: string; name: string; mimeType?: string };
        caption?: string;
      }) => sendAttachment(id, file, caption),
      onSuccess: (_data, variables) => {
        void invalidateThread(variables.id);
      },
    }),
    uploadDelivery: useMutation({
      mutationFn: ({
        campaignId,
        file,
      }: {
        campaignId: string;
        file: { uri: string; name: string; mimeType?: string };
      }) => uploadDelivery(campaignId, file),
    }),
    submitDelivery: useMutation({
      mutationFn: ({
        campaignId,
        storagePath,
        notes,
      }: {
        campaignId: string;
        storagePath: string;
        notes?: string;
      }) => submitDelivery(campaignId, storagePath, notes),
      onSuccess: (_data, variables) => {
        void invalidateKeys([
          queryKeys.campaign('influencer', variables.campaignId),
          queryKeys.campaign('business', variables.campaignId),
          queryKeys.campaigns('influencer'),
          queryKeys.campaigns('business'),
          queryKeys.notifications('influencer'),
          queryKeys.notifications('business'),
        ]);
      },
    }),
    deliveryUrl: useMutation({
      mutationFn: (campaignId: string) => deliveryUrl(campaignId),
    }),
    markMessagesRead: useMutation({
      mutationFn: (id: string) => markMessagesRead(id),
      // Only refresh the inbox unread badge — the thread itself updates via its own
      // poll/focus refetch, so we avoid re-pulling the whole conversation here.
      onSuccess: () => {
        void invalidateKeys([queryKeys.inbox(activeRole), queryKeys.notifications(activeRole)]);
      },
    }),
    markNotificationsRead: useMutation({
      mutationFn: (input: NotificationsReadRequest) => markNotificationsRead(input),
      onSuccess: invalidateCore,
    }),
    instagramSync: useMutation({
      mutationFn: instagramSync,
      onSuccess: invalidateCore,
    }),
    instagramDisconnect: useMutation({
      mutationFn: instagramDisconnect,
      onSuccess: invalidateCore,
    }),
    registerPush: useMutation({ mutationFn: registerPush }),
    unregisterPush: useMutation({ mutationFn: unregisterPush }),
  };
}
