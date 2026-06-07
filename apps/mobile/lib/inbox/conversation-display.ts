import type { CampaignListItem } from '@plugoh/contracts';

export type ViewerRole = 'business' | 'influencer';

export type ConversationParty = {
  /** Counterparty display name, or null when unresolved (callers fall back to title). */
  name: string | null;
  avatarUri: string | null;
  /** Source string for initials when no avatar image is available. */
  avatarName: string | null;
};

/**
 * Single source of truth for who the viewer is talking to in a conversation.
 * A business sees the creator; an influencer sees the brand. Used by both inbox
 * tabs and the chat thread header so the derivation never drifts apart.
 */
export function getConversationParty(
  campaign: CampaignListItem,
  viewerRole: ViewerRole,
): ConversationParty {
  if (viewerRole === 'business') {
    const creator = campaign.influencer_profile;
    const name = creator?.display_name?.trim() || creator?.ig_username?.trim() || null;
    return {
      name,
      avatarUri: creator?.profile_photo_url ?? creator?.avatar_url ?? null,
      avatarName: name,
    };
  }
  const brand = campaign.business_profile;
  const name = brand?.brand_name?.trim() || null;
  return {
    name,
    avatarUri:
      brand?.profile_photo_url ?? brand?.ig_profile_picture_url ?? brand?.avatar_url ?? null,
    avatarName: name,
  };
}
