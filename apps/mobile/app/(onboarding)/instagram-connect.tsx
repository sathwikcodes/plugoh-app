import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Alert, Text, View } from "react-native";
import { AccentHero, Card, PrimaryButton, Screen, SectionTitle, SecondaryButton } from "@/components/ui/primitives";
import { theme } from "@/constants/theme";
import { instagramConnect } from "@/lib/api/endpoints";
import { useAuthStore } from "@/store/auth";

export default function InstagramConnectScreen() {
  const session = useAuthStore((state) => state.session);

  const handleConnect = async () => {
    if (!session?.user.id) return;
    try {
      const { url } = await instagramConnect(session.user.id);
      const result = await WebBrowser.openAuthSessionAsync(url, "plugoh://instagram/callback");
      if (result.type === "success") {
        router.replace("/(onboarding)/ai-generating");
      }
    } catch (error) {
      Alert.alert("Instagram connection failed", error instanceof Error ? error.message : "Try again.");
    }
  };

  return (
    <Screen>
      <AccentHero title="Connect Instagram" subtitle="Bring in your profile signals so brands see proof, not claims." />
      <SectionTitle title="What this unlocks" subtitle="Plugoh uses your Instagram profile to seed your category, pricing, and audience cues." />
      <Card>
        <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>Instagram link</Text>
        <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>Securely connect your creator account for profile sync and AI-assisted setup.</Text>
      </Card>
      <PrimaryButton label="Connect Instagram" onPress={handleConnect} />
      <SecondaryButton label="Skip for now" onPress={() => router.replace("/(onboarding)/ai-generating")} />
      <View>
        <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
          You can reconnect or disconnect later from Profile {"\u203a"} Instagram.
        </Text>
      </View>
    </Screen>
  );
}
