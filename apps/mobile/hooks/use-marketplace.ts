import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfluencerOnboardingRequest, InfluencerPricingPatch, NotificationsReadRequest, PayoutUpsert } from "@plugoh/contracts";
import {
  acceptCampaign,
  declineCampaign,
  deliveryUrl,
  endpoints,
  getCampaign,
  inbox,
  instagramDisconnect,
  instagramSync,
  markNotificationsRead,
  messages,
  notifications,
  registerPush,
  sendAttachment,
  sendMessage,
  submitDelivery,
  unregisterPush,
  uploadDelivery,
} from "@/lib/api/endpoints";
import { coreInvalidationKeys, queryKeys } from "@/lib/query/keys";
import { invalidateQueryKeys } from "@/lib/query/invalidation";
import { useAuthStore } from "@/store/auth";

export function useBootstrap() {
  const session = useAuthStore((state) => state.session);
  return useQuery({ queryKey: queryKeys.bootstrap, queryFn: endpoints.meBootstrap, enabled: Boolean(session) });
}

export function useInfluencerProfile() {
  const session = useAuthStore((state) => state.session);
  return useQuery({ queryKey: queryKeys.profile, queryFn: endpoints.influencerProfile, enabled: Boolean(session) });
}

export function useCampaigns() {
  const session = useAuthStore((state) => state.session);
  return useQuery({ queryKey: queryKeys.campaigns, queryFn: endpoints.campaigns, enabled: Boolean(session) });
}

export function useCampaign(id: string) {
  const session = useAuthStore((state) => state.session);
  return useQuery({ queryKey: queryKeys.campaign(id), queryFn: () => getCampaign(id), enabled: Boolean(session && id) });
}

export function useInbox() {
  const session = useAuthStore((state) => state.session);
  return useQuery({ queryKey: queryKeys.inbox, queryFn: inbox, enabled: Boolean(session) });
}

export function useMessages(id: string) {
  const session = useAuthStore((state) => state.session);
  return useQuery({ queryKey: queryKeys.messages(id), queryFn: () => messages(id), enabled: Boolean(session && id) });
}

export function useEarnings() {
  const session = useAuthStore((state) => state.session);
  return useQuery({ queryKey: queryKeys.earnings, queryFn: endpoints.earnings, enabled: Boolean(session) });
}

export function useNotifications() {
  const session = useAuthStore((state) => state.session);
  return useQuery({ queryKey: queryKeys.notifications, queryFn: notifications, enabled: Boolean(session) });
}

export function usePayout() {
  const session = useAuthStore((state) => state.session);
  return useQuery({ queryKey: queryKeys.payout, queryFn: endpoints.payout, enabled: Boolean(session) });
}

export function useMarketplaceMutations() {
  const queryClient = useQueryClient();

  const invalidateKeys = async (keys: ReadonlyArray<readonly unknown[]>) => invalidateQueryKeys(queryClient, keys);

  const invalidateCore = async () => {
    await invalidateKeys(coreInvalidationKeys);
  };

  return {
    onboarding: useMutation({
      mutationFn: (input: InfluencerOnboardingRequest) => endpoints.onboarding(input),
      onSuccess: invalidateCore,
    }),
    updateProfile: useMutation({
      mutationFn: endpoints.updateInfluencerProfile,
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
    acceptCampaign: useMutation({
      mutationFn: acceptCampaign,
      onSuccess: invalidateCore,
    }),
    declineCampaign: useMutation({
      mutationFn: declineCampaign,
      onSuccess: invalidateCore,
    }),
    sendMessage: useMutation({
      mutationFn: ({ id, content }: { id: string; content: string }) => sendMessage(id, content),
      onSuccess: (_data, variables) => {
        void invalidateKeys([queryKeys.messages(variables.id), queryKeys.inbox, queryKeys.notifications]);
      },
    }),
    sendAttachment: useMutation({
      mutationFn: ({ id, file, caption }: { id: string; file: { uri: string; name: string; mimeType?: string }; caption?: string }) =>
        sendAttachment(id, file, caption),
      onSuccess: (_data, variables) => {
        void invalidateKeys([queryKeys.messages(variables.id), queryKeys.inbox, queryKeys.notifications]);
      },
    }),
    uploadDelivery: useMutation({
      mutationFn: ({ campaignId, file }: { campaignId: string; file: { uri: string; name: string; mimeType?: string } }) =>
        uploadDelivery(campaignId, file),
    }),
    submitDelivery: useMutation({
      mutationFn: ({ campaignId, storagePath, notes }: { campaignId: string; storagePath: string; notes?: string }) =>
        submitDelivery(campaignId, storagePath, notes),
      onSuccess: (_data, variables) => {
        void invalidateKeys([queryKeys.campaign(variables.campaignId), queryKeys.campaigns, queryKeys.notifications]);
      },
    }),
    deliveryUrl: useMutation({
      mutationFn: (campaignId: string) => deliveryUrl(campaignId),
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
