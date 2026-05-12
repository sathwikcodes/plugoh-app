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
  InfluencerOnboardingRequest,
  InfluencerPricingPatch,
  NotificationsReadRequest,
  PayoutUpsert,
  UserRole,
} from '@plugoh/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export function useBusinessProfile() {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: queryKeys.profile('business'),
    queryFn: endpoints.businessProfile,
    enabled: Boolean(session),
  });
}

export function useCampaigns(params?: CampaignListParams) {
  const { role, session } = useRoleFromBootstrap();
  const resolvedRole: UserRole = role ?? 'influencer';
  return useQuery({
    queryKey: queryKeys.campaigns(resolvedRole, params),
    queryFn: async () => endpoints.campaigns(resolvedRole, params),
    enabled: Boolean(session && role),
  });
}

export function useCampaign(id: string) {
  const { role, session } = useRoleFromBootstrap();
  const resolvedRole: UserRole = role ?? 'influencer';
  return useQuery({
    queryKey: queryKeys.campaign(resolvedRole, id),
    queryFn: () => getCampaign(id),
    enabled: Boolean(session && id && role),
  });
}

export function useInbox() {
  const { role, session } = useRoleFromBootstrap();
  const resolvedRole: UserRole = role ?? 'influencer';
  return useQuery({
    queryKey: queryKeys.inbox(resolvedRole),
    queryFn: () => inbox(resolvedRole),
    enabled: Boolean(session && role),
  });
}

export function useMessages(id: string) {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: queryKeys.messages(id),
    queryFn: () => messages(id),
    enabled: Boolean(session && id),
  });
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
  const resolvedRole: UserRole = role ?? 'influencer';
  return useQuery({
    queryKey: queryKeys.notifications(resolvedRole),
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

  const invalidateKeys = async (keys: ReadonlyArray<readonly unknown[]>) =>
    invalidateQueryKeys(queryClient, keys);
  const invalidateCore = async () => {
    await invalidateKeys(coreInvalidationKeys);
  };

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
      mutationFn: createBookingOrder,
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
      onSuccess: (_data, variables) => {
        void invalidateKeys([
          queryKeys.messages(variables.id),
          queryKeys.inbox('influencer'),
          queryKeys.inbox('business'),
          queryKeys.notifications('influencer'),
          queryKeys.notifications('business'),
        ]);
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
        void invalidateKeys([
          queryKeys.messages(variables.id),
          queryKeys.inbox('influencer'),
          queryKeys.inbox('business'),
          queryKeys.notifications('influencer'),
          queryKeys.notifications('business'),
        ]);
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
