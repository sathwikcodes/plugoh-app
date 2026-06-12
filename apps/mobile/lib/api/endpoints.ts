import type {
  BusinessOnboardingRequest,
  BusinessProfilePatch,
  CampaignListItem,
  CampaignMessage,
  CreateCampaignRequest,
  DeliveryPreviewResponse,
  EarningsSummary,
  InboxItem,
  Influencer,
  InfluencerOnboardingRequest,
  InfluencerProfilePatch,
  InfluencerProfileResponse,
  InfluencerPricingPatch,
  MeBootstrapResponse,
  MessagesPage,
  NotificationItem,
  NotificationsReadRequest,
  PayoutUpsert,
  PushRegisterRequest,
  PushRegisterResponse,
  PushUnregisterResponse,
  RoleUpsertRequest,
  UserRole,
} from '@plugoh/contracts';
import { api, jsonRequest } from '@/lib/api/client';

type PaginatedResponse<T> = { items: T[]; nextOffset: number | null; total: number };

export const endpoints = {
  meBootstrap: () => api<MeBootstrapResponse>('/me/bootstrap'),
  setRole: (input: RoleUpsertRequest) =>
    api<{ role: UserRole }>('/me/role', {
      method: 'POST',
      ...jsonRequest(input),
    }),
  updateMeProfile: (input: { full_name: string; phone: string; location: string }) =>
    api<{ id: string }>('/me/profile', {
      method: 'PATCH',
      ...jsonRequest(input),
    }),
  onboarding: (input: InfluencerOnboardingRequest) =>
    api<InfluencerProfileResponse>('/influencer/onboarding', {
      method: 'POST',
      ...jsonRequest(input),
    }),
  businessOnboarding: (input: BusinessOnboardingRequest) =>
    api<{ id: string; user_id: string }>('/business/onboarding', {
      method: 'POST',
      ...jsonRequest(input),
    }),
  influencerProfile: () => api<InfluencerProfileResponse>('/influencer/profile'),
  businessProfile: () =>
    api<{
      id: string;
      user_id: string;
      brand_name?: string;
      brand_type?: string;
      brand_location?: string;
      brand_summary?: string;
      tagline?: string;
      ig_username?: string;
      instagram_connected?: boolean;
    }>('/business/profile'),
  updateInfluencerProfile: (input: InfluencerProfilePatch) =>
    api<InfluencerProfileResponse>('/influencer/profile', {
      method: 'PATCH',
      ...jsonRequest(input),
    }),
  updateBusinessProfile: (input: BusinessProfilePatch) =>
    api<{
      id: string;
      user_id: string;
      brand_name?: string;
      brand_type?: string;
      brand_location?: string;
      brand_summary?: string;
      tagline?: string;
      ig_username?: string;
    }>('/business/profile', {
      method: 'PATCH',
      ...jsonRequest(input),
    }),
  updateInfluencerPricing: (input: InfluencerPricingPatch) =>
    api<InfluencerProfileResponse>('/influencer/profile/pricing', {
      method: 'PATCH',
      ...jsonRequest(input),
    }),
  updateAvailability: (isActive: boolean) =>
    api<InfluencerProfileResponse>('/influencer/profile/active', {
      method: 'PATCH',
      ...jsonRequest({ is_active: isActive }),
    }),
  payout: () => api<PayoutUpsert | null>('/influencer/payout'),
  updatePayout: (input: PayoutUpsert) =>
    api<PayoutUpsert>('/influencer/payout', {
      method: 'PUT',
      ...jsonRequest(input),
    }),
  earnings: () => api<EarningsSummary>('/influencer/earnings'),
  campaigns: (
    role: UserRole,
    params?: {
      limit?: number;
      offset?: number;
      status?: string;
      search?: string;
      sort?: 'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc';
    },
  ) =>
    api<PaginatedResponse<CampaignListItem>>(
      `/campaigns?${new URLSearchParams({
        role,
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.offset ? { offset: String(params.offset) } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.sort ? { sort: params.sort } : {}),
      }).toString()}`,
    ),
};

export async function discoverInfluencers(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  place?: string;
  category?: string;
  sort?: 'followers_desc' | 'engagement_asc' | 'engagement_desc' | 'price_asc' | 'price_desc';
  price_min?: number;
  price_max?: number;
}) {
  const query = new URLSearchParams({
    ...(params?.limit ? { limit: String(params.limit) } : {}),
    ...(params?.offset ? { offset: String(params.offset) } : {}),
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.place ? { place: params.place } : {}),
    ...(params?.category ? { category: params.category } : {}),
    ...(params?.sort ? { sort: params.sort } : {}),
    ...(params?.price_min != null ? { price_min: String(params.price_min) } : {}),
    ...(params?.price_max != null ? { price_max: String(params.price_max) } : {}),
  });
  return api<PaginatedResponse<Influencer>>(`/influencers?${query.toString()}`);
}

export async function createCampaign(input: CreateCampaignRequest) {
  return api<{ campaignId: string }>('/campaigns', {
    method: 'POST',
    ...jsonRequest(input),
  });
}

export async function getInfluencer(id: string) {
  return api<
    Influencer & {
      media?: Array<{ id?: string; media_url?: string; caption?: string; engagement?: number }>;
    }
  >(`/influencers/${id}`);
}

export async function getCampaign(id: string) {
  return api<
    CampaignListItem & {
      delivery?: { notes?: string; dispute_reason?: string } | null;
      messages?: CampaignMessage[];
    }
  >(`/campaigns/${id}`);
}

export async function acceptCampaign(id: string) {
  return api<{ ok: boolean }>(`/campaigns/${id}/accept`, { method: 'POST' });
}

export async function declineCampaign(id: string) {
  return api<{ ok: boolean }>(`/campaigns/${id}/decline`, { method: 'POST' });
}

export async function approveCampaignDelivery(id: string, idempotencyKey: string) {
  return api<{ ok: boolean }>(`/campaigns/${id}/approve`, { method: 'POST', idempotencyKey });
}

export async function disputeCampaignDelivery(id: string, reason: string) {
  return api<{ ok: boolean }>(`/campaigns/${id}/dispute`, {
    method: 'POST',
    ...jsonRequest({ reason }),
  });
}

export async function inbox(role: UserRole) {
  return api<InboxItem[]>(`/inbox/${role}`);
}

export async function messages(id: string, params: { limit?: number; before?: string } = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.before) query.set('before', params.before);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return api<MessagesPage>(`/campaigns/${id}/messages${suffix}`);
}

export async function sendMessage(id: string, content: string) {
  return api<CampaignMessage>(`/campaigns/${id}/messages`, {
    method: 'POST',
    ...jsonRequest({ content, message_type: 'text' }),
  });
}

export async function sendAttachment(
  id: string,
  file: { uri: string; name: string; mimeType?: string },
  caption?: string,
) {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);
  if (caption) form.append('caption', caption);
  return api<CampaignMessage>(`/campaigns/${id}/messages/attachment`, {
    method: 'POST',
    body: form,
  });
}

export async function markMessagesRead(id: string) {
  return api<{ ok: boolean; marked: number }>(`/campaigns/${id}/messages/read`, {
    method: 'PATCH',
  });
}

export async function uploadDelivery(
  campaignId: string,
  file: { uri: string; name: string; mimeType?: string },
) {
  const form = new FormData();
  form.append('campaignId', campaignId);
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);
  return api<{ storagePath: string }>('/delivery/upload', {
    method: 'POST',
    body: form,
  });
}

export async function submitDelivery(campaignId: string, storagePath: string, notes?: string) {
  return api<{ ok: boolean }>(`/campaigns/${campaignId}/deliver`, {
    method: 'POST',
    ...jsonRequest({ storagePath, notes }),
  });
}

export async function deliveryUrl(campaignId: string) {
  return api<DeliveryPreviewResponse>(`/campaigns/${campaignId}/delivery/url`);
}

export async function createBookingOrder(input: {
  influencer_profile_id: string;
  package_type: 'instagram_reel';
}) {
  return api<{
    orderId: string;
    keyId?: string;
    amount: number;
    currency: string;
    price_offered_paise: number;
    platform_fee_paise: number;
    total_charged_paise: number;
  }>('/payment/create-booking-order', {
    method: 'POST',
    ...jsonRequest(input),
  });
}

export async function verifyBookingPayment(
  input: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    influencer_profile_id: string;
    package_type: 'instagram_reel';
    objective:
      | 'visit_place'
      | 'feature_product'
      | 'showcase_service'
      | 'promote_offer'
      | 'brand_shoutout';
    timing_mode: 'asap' | 'choose_date';
    due_date?: string;
    event_name?: string;
    contact_email: string;
    contact_phone: string;
  },
  idempotencyKey: string,
) {
  return api<{ success: true; campaignId: string }>('/payment/verify-booking-payment', {
    method: 'POST',
    ...jsonRequest(input),
    idempotencyKey,
  });
}

export async function notifications() {
  return api<NotificationItem[]>('/notifications');
}

export async function markNotificationsRead(input: NotificationsReadRequest) {
  return api<{ ok: boolean }>('/notifications/read', {
    method: 'PATCH',
    ...jsonRequest(input),
  });
}

export async function instagramConnect(userId: string, role: UserRole) {
  return api<{ url: string }>(`/instagram/connect?userId=${userId}&role=${role}&platform=mobile`);
}

export async function instagramSync() {
  return api<{ synced: number }>('/instagram/sync', { method: 'POST' });
}

export async function instagramDisconnect() {
  return api<{ ok: boolean }>('/instagram/disconnect', { method: 'POST' });
}

export async function registerPush(input: PushRegisterRequest) {
  return api<PushRegisterResponse>('/push/register', {
    method: 'POST',
    ...jsonRequest(input),
  });
}

export async function unregisterPush() {
  return api<PushUnregisterResponse>('/push/unregister', { method: 'POST' });
}
