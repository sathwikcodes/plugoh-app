import { Alert, Text } from 'react-native';
import {
  PrimaryButton,
  Screen,
  SectionTitle,
  SecondaryButton,
  StatusChip,
} from '@/components/ui/primitives';
import {
  useBootstrap,
  useBusinessProfile,
  useInfluencerProfile,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';

export default function InstagramScreen() {
  const bootstrap = useBootstrap();
  const role = bootstrap.data?.role ?? 'influencer';
  const profile = useInfluencerProfile();
  const business = useBusinessProfile();
  const mutations = useMarketplaceMutations();
  const connected =
    role === 'business' ? business.data?.instagram_connected : profile.data?.instagram_connected;
  const username = role === 'business' ? business.data?.ig_username : profile.data?.ig_username;

  return (
    <Screen>
      <SectionTitle
        title="Instagram"
        subtitle={
          role === 'business'
            ? 'Sync brand profile signals and generated summary.'
            : 'Keep your creator signals synced and your availability accurate.'
        }
      />
      <StatusChip
        label={connected ? 'Connected' : 'Disconnected'}
        status={connected ? 'success' : 'pending'}
      />
      <Text>@{username ?? 'not-linked'}</Text>
      <PrimaryButton
        label={mutations.instagramSync.isPending ? 'Syncing...' : 'Sync now'}
        onPress={async () => {
          try {
            await mutations.instagramSync.mutateAsync();
          } catch (error) {
            Alert.alert('Sync failed', error instanceof Error ? error.message : 'Try again.');
          }
        }}
      />
      <SecondaryButton
        label="Disconnect Instagram"
        onPress={async () => {
          try {
            await mutations.instagramDisconnect.mutateAsync();
          } catch (error) {
            Alert.alert('Disconnect failed', error instanceof Error ? error.message : 'Try again.');
          }
        }}
      />
    </Screen>
  );
}
