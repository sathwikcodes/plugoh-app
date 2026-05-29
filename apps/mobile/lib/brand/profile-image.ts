import type { BusinessProfileSummary } from '@plugoh/contracts';

export function businessProfileImageUri(profile?: BusinessProfileSummary | null) {
  return (
    profile?.profile_photo_url?.trim() ||
    profile?.ig_profile_picture_url?.trim() ||
    profile?.avatar_url?.trim() ||
    null
  );
}
