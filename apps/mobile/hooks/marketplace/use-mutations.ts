import {
  acceptCampaign,
  approveCampaignDelivery,
  createBookingOrder,
  createCampaign,
  declineCampaign,
  deliveryUrl,
  disputeCampaignDelivery,
  endpoints,
  instagramDisconnect,
  instagramSync,
  markMessagesRead,
  markNotificationsRead,
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
import { invalidateCampaignLiveQueries } from '@/lib/query/live-sync';
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
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { prependOptimisticMessage, useRoleFromBootstrap } from './internal';

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
  const invalidateCampaignLive = async (campaignId?: string | null) => {
    await invalidateCampaignLiveQueries(queryClient, campaignId);
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
      onSuccess: (data) => {
        void invalidateCampaignLive(data.campaignId);
      },
    }),
    acceptCampaign: useMutation({
      mutationFn: acceptCampaign,
      onSuccess: (_data, id) => {
        void invalidateCampaignLive(id);
      },
    }),
    declineCampaign: useMutation({
      mutationFn: declineCampaign,
      onSuccess: (_data, id) => {
        void invalidateCampaignLive(id);
      },
    }),
    approveCampaignDelivery: useMutation({
      mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey: string }) =>
        approveCampaignDelivery(id, idempotencyKey),
      onSuccess: (_data, variables) => {
        void invalidateCampaignLive(variables.id);
      },
    }),
    disputeCampaignDelivery: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        disputeCampaignDelivery(id, reason),
      onSuccess: (_data, variables) => {
        void invalidateCampaignLive(variables.id);
      },
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
      onSuccess: (data) => {
        void invalidateCampaignLive(data.campaignId);
      },
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
        void invalidateCampaignLive(variables.campaignId);
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
