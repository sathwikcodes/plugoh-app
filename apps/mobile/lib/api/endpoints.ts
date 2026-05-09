import type {
  CampaignListItem,
  CampaignMessage,
  DeliveryPreviewResponse,
  EarningsSummary,
  InboxItem,
  InfluencerOnboardingRequest,
  InfluencerProfilePatch,
  InfluencerProfileResponse,
  InfluencerPricingPatch,
  MeBootstrapResponse,
  NotificationItem,
  NotificationsReadRequest,
  PayoutUpsert,
  PushRegisterRequest,
  PushRegisterResponse,
  PushUnregisterResponse,
} from "@plugoh/contracts";
import { api, jsonRequest } from "@/lib/api/client";

export const endpoints = {
  meBootstrap: () => api<MeBootstrapResponse>("/me/bootstrap"),
  onboarding: (input: InfluencerOnboardingRequest) =>
    api<InfluencerProfileResponse>("/influencer/onboarding", {
      method: "POST",
      ...jsonRequest(input),
    }),
  influencerProfile: () => api<InfluencerProfileResponse>("/influencer/profile"),
  updateInfluencerProfile: (input: InfluencerProfilePatch) =>
    api<InfluencerProfileResponse>("/influencer/profile", {
      method: "PATCH",
      ...jsonRequest(input),
    }),
  updateInfluencerPricing: (input: InfluencerPricingPatch) =>
    api<InfluencerProfileResponse>("/influencer/profile/pricing", {
      method: "PATCH",
      ...jsonRequest(input),
    }),
  updateAvailability: (isActive: boolean) =>
    api<InfluencerProfileResponse>("/influencer/profile/active", {
      method: "PATCH",
      ...jsonRequest({ is_active: isActive }),
    }),
  payout: () => api<PayoutUpsert | null>("/influencer/payout"),
  updatePayout: (input: PayoutUpsert) =>
    api<PayoutUpsert>("/influencer/payout", {
      method: "PUT",
      ...jsonRequest(input),
    }),
  earnings: () => api<EarningsSummary>("/influencer/earnings"),
  campaigns: () => api<CampaignListItem[]>("/campaigns?role=influencer"),
};

export async function getCampaign(id: string) {
  return api<CampaignListItem & { delivery?: { notes?: string; dispute_reason?: string } | null; messages?: CampaignMessage[] }>(
    `/campaigns/${id}`,
  );
}

export async function acceptCampaign(id: string) {
  return api<{ ok: boolean }>(`/campaigns/${id}/accept`, { method: "POST" });
}

export async function declineCampaign(id: string) {
  return api<{ ok: boolean }>(`/campaigns/${id}/decline`, { method: "POST" });
}

export async function inbox() {
  return api<InboxItem[]>("/inbox/influencer");
}

export async function messages(id: string) {
  return api<CampaignMessage[]>(`/campaigns/${id}/messages`);
}

export async function sendMessage(id: string, content: string) {
  return api<CampaignMessage>(`/campaigns/${id}/messages`, {
    method: "POST",
    ...jsonRequest({ content, message_type: "text" }),
  });
}

export async function sendAttachment(id: string, file: { uri: string; name: string; mimeType?: string }, caption?: string) {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? "application/octet-stream",
  } as unknown as Blob);
  if (caption) form.append("caption", caption);
  return api<CampaignMessage>(`/campaigns/${id}/messages/attachment`, {
    method: "POST",
    body: form,
  });
}

export async function uploadDelivery(campaignId: string, file: { uri: string; name: string; mimeType?: string }) {
  const form = new FormData();
  form.append("campaignId", campaignId);
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? "application/octet-stream",
  } as unknown as Blob);
  return api<{ storagePath: string }>("/delivery/upload", {
    method: "POST",
    body: form,
  });
}

export async function submitDelivery(campaignId: string, storagePath: string, notes?: string) {
  return api<{ ok: boolean }>(`/campaigns/${campaignId}/deliver`, {
    method: "POST",
    ...jsonRequest({ storagePath, notes }),
  });
}

export async function deliveryUrl(campaignId: string) {
  return api<DeliveryPreviewResponse>(`/campaigns/${campaignId}/delivery/url`);
}

export async function notifications() {
  return api<NotificationItem[]>("/notifications");
}

export async function markNotificationsRead(input: NotificationsReadRequest) {
  return api<{ ok: boolean }>("/notifications/read", {
    method: "PATCH",
    ...jsonRequest(input),
  });
}

export async function instagramConnect(userId: string) {
  return api<{ url: string }>(`/instagram/connect?userId=${userId}&role=influencer&platform=mobile`);
}

export async function instagramSync() {
  return api<{ synced: number }>("/instagram/sync", { method: "POST" });
}

export async function instagramDisconnect() {
  return api<{ ok: boolean }>("/instagram/disconnect", { method: "POST" });
}

export async function registerPush(input: PushRegisterRequest) {
  return api<PushRegisterResponse>("/push/register", {
    method: "POST",
    ...jsonRequest(input),
  });
}

export async function unregisterPush() {
  return api<PushUnregisterResponse>("/push/unregister", { method: "POST" });
}
