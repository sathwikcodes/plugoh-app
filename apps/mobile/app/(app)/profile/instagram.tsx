import { Alert, Text } from 'react-native';
import {
  PrimaryButton,
  Screen,
  SectionTitle,
  SecondaryButton,
  StatusChip,
} from '@/components/ui/primitives';
import { useInfluencerProfile, useMarketplaceMutations } from '@/hooks/use-marketplace';

export default function InstagramScreen() {
  const profile = useInfluencerProfile();
  const mutations = useMarketplaceMutations();
  const connected = profile.data?.instagram_connected;
  const username = profile.data?.ig_username;

  return (
    <Screen>
      <SectionTitle
        title="Instagram"
        subtitle="Keep your creator signals synced and your reach data accurate."
      />
      <StatusChip
        label={connected ? 'Connected' : 'Not connected'}
        status={connected ? 'success' : 'pending'}
      />
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
        @{username ?? 'not linked'}
      </Text>
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
      {connected ? (
        <SecondaryButton
          label="Disconnect"
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
