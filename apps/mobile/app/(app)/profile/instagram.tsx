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
import { shouldShowInitialLoader } from '@/lib/query/loading';

export default function InstagramScreen() {
  const bootstrap = useBootstrap();
  const role = bootstrap.data?.role;
  const profile = useInfluencerProfile();
  const businessProfile = useBusinessProfile({ enabled: role === 'business' });
  const mutations = useMarketplaceMutations();
  const activeProfile = role === 'business' ? businessProfile : profile;
  const connected = activeProfile.data?.instagram_connected;
  const username = activeProfile.data?.ig_username;
  const profileLoading =
    shouldShowInitialLoader(bootstrap) || shouldShowInitialLoader(activeProfile);
  const title = role === 'business' ? 'Brand Instagram' : 'Instagram';
  const subtitle =
    role === 'business'
      ? 'Keep your brand identity linked for trust signals and AI-assisted profile updates.'
      : 'Keep your creator signals synced and your reach data accurate.';

  return (
    <Screen>
      <SectionTitle title={title} subtitle={subtitle} />
      <StatusChip
        label={profileLoading ? 'Checking...' : connected ? 'Connected' : 'Not connected'}
        status={connected ? 'success' : 'pending'}
      />
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
        {profileLoading ? 'Loading account status...' : `@${username ?? 'not linked'}`}
      </Text>
      <PrimaryButton
        label={mutations.instagramSync.isPending ? 'Syncing...' : 'Sync now'}
        disabled={profileLoading || mutations.instagramSync.isPending}
        onPress={async () => {
          try {
            await mutations.instagramSync.mutateAsync();
          } catch (error) {
            Alert.alert('Sync failed', error instanceof Error ? error.message : 'Try again.');
          }
        }}
      />
      {connected ? (
        <SecondaryButton
          label="Disconnect"
          disabled={mutations.instagramDisconnect.isPending}
          onPress={async () => {
            try {
              await mutations.instagramDisconnect.mutateAsync();
            } catch (error) {
              Alert.alert(
                'Disconnect failed',
                error instanceof Error ? error.message : 'Try again.',
              );
            }
          }}
        />
      ) : null}
    </Screen>
  );
}
