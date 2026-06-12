import type { InfluencerProfileResponse } from '@plugoh/contracts';

export function influencerProfileImageUri(profile?: InfluencerProfileResponse | null) {
  return profile?.profile_photo_url?.trim() || profile?.avatar_url?.trim() || null;
}
