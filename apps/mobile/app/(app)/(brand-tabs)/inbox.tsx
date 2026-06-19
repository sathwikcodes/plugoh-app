import { InboxScreen } from '@/components/screens/inbox-screen';
import { useBusinessProfile } from '@/hooks/use-marketplace';
import { businessProfileImageUri } from '@/lib/brand/profile-image';

export default function BrandInboxRoute() {
  const profile = useBusinessProfile();
  return <InboxScreen role="business" profileImageUri={businessProfileImageUri(profile.data)} />;
}
