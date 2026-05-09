import { Alert, Text } from "react-native";
import { PrimaryButton, Screen, SectionTitle, SecondaryButton, StatusChip } from "@/components/ui/primitives";
import { useInfluencerProfile, useMarketplaceMutations } from "@/hooks/use-marketplace";

export default function InstagramScreen() {
  const profile = useInfluencerProfile();
  const mutations = useMarketplaceMutations();

  return (
    <Screen>
      <SectionTitle title="Instagram" subtitle="Keep your creator signals synced and your availability accurate." />
      <StatusChip label={profile.data?.instagram_connected ? "Connected" : "Disconnected"} status={profile.data?.instagram_connected ? "success" : "pending"} />
      <Text>@{profile.data?.ig_username ?? "not-linked"}</Text>
      <PrimaryButton
        label={mutations.instagramSync.isPending ? "Syncing..." : "Sync now"}
        onPress={async () => {
          try {
            await mutations.instagramSync.mutateAsync();
          } catch (error) {
            Alert.alert("Sync failed", error instanceof Error ? error.message : "Try again.");
          }
        }}
      />
      <SecondaryButton
        label="Disconnect Instagram"
        onPress={async () => {
          try {
            await mutations.instagramDisconnect.mutateAsync();
          } catch (error) {
            Alert.alert("Disconnect failed", error instanceof Error ? error.message : "Try again.");
          }
        }}
      />
    </Screen>
  );
}
