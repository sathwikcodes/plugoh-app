import { InboxScreen } from '@/components/screens/inbox-screen';
import { useInfluencerProfile } from '@/hooks/use-marketplace';
import { influencerProfileImageUri } from '@/lib/influencer/profile-image';

export default function InfluencerInboxRoute() {
  const profile = useInfluencerProfile();
  return (
    <InboxScreen role="influencer" profileImageUri={influencerProfileImageUri(profile.data)} />
  );
}
